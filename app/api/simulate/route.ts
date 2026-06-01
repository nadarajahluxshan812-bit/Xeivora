import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { AGENTS, agentMap } from "@/lib/simulate/agents";
import { selectAgentsForScenario } from "@/lib/simulate/selector";
import type {
  SimulationAgent,
  SimulationAgentOutput,
  SimulationRecord,
  SimulationReport,
  SimulationSummary
} from "@/lib/simulate/types";

const { addUserMessage, createSession, saveAssistantMessage, updateSessionMetadata } = require("@/lib/server/chat-store");
const { createSpecialistCompletion } = require("@/lib/server/ai-runtime");
const { createSseResponse } = require("@/lib/server/sse");
const { createSimulation, getSimulationById, listSimulations } = require("@/lib/server/simulation-store");
const { enforceRateLimit } = require("@/lib/server/rate-limit");

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function writeEvent(sink: { write: (chunk: string) => void }, type: string, payload: unknown) {
  sink.write(`event: ${type}\n`);
  sink.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeScenario(value: unknown) {
  return `${value || ""}`.replace(/\s+/g, " ").trim();
}

function summarizeText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No clear summary available.";
  }

  return normalized.length > 200 ? `${normalized.slice(0, 197).trimEnd()}...` : normalized;
}

function safeJsonParse(raw: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function clampConfidence(value: unknown, fallback = 68) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function determineVerdictTag(confidence: number) {
  if (confidence >= 78) return "High conviction";
  if (confidence >= 62) return "Balanced upside";
  if (confidence >= 45) return "Mixed outcome";
  return "High risk";
}

function buildAgentAnalysisPrompt(agent: SimulationAgent, scenario: string) {
  return [
    `Scenario: ${scenario}`,
    "",
    "Give your first-pass view in exactly 3 short sections:",
    "1. Your take",
    "2. Key upside or threat",
    "3. What the decision-maker is probably underestimating",
    "",
    "Keep it under 160 words. Be concrete and direct."
  ].join("\n");
}

function buildDebatePrompt(agent: SimulationAgent, scenario: string, otherSummaries: string) {
  return [
    `Scenario: ${scenario}`,
    "",
    "Council summaries so far:",
    otherSummaries || "No other summaries available.",
    "",
    "Respond as your specialist role in a live council debate.",
    "Reference at least one other viewpoint directly, then state your own position.",
    "Keep it under 170 words, with crisp plain text only."
  ].join("\n");
}

function buildSynthesisPrompt(scenario: string, topic: string, debate: SimulationAgentOutput[]) {
  const transcript = debate
    .map((entry) => {
      const agent = agentMap.get(entry.agentId);
      return `${agent?.emoji || "•"} ${agent?.name || entry.agentId}: ${entry.text}`;
    })
    .join("\n\n");

  return [
    `Scenario: ${scenario}`,
    `Topic: ${topic}`,
    "",
    "Council transcript:",
    transcript,
    "",
    "Return a JSON object only with these keys:",
    "{",
    '  "verdict": string,',
    '  "confidence": number,',
    '  "mostLikelyOutcome": string,',
    '  "bestCase": string,',
    '  "worstCase": string,',
    '  "keyRisks": string[],',
    '  "recommendedAction": string,',
    '  "outcomeVariable": string',
    "}",
    "",
    "Make the answer sharp, specific, and executive-ready."
  ].join("\n");
}

function buildFallbackReport(scenario: string, outputs: SimulationAgentOutput[]): SimulationReport {
  const confidence = outputs.length >= 6 ? 72 : 66;
  const first = outputs[0]?.summary || "Momentum exists, but execution quality will decide the outcome.";
  const second = outputs[1]?.summary || "The biggest downside is hidden complexity and weak follow-through.";
  const third = outputs[2]?.summary || "The upside comes from decisive action with a tight feedback loop.";

  return {
    scenario,
    verdict: "Move forward, but with a controlled test and explicit guardrails.",
    verdictTag: determineVerdictTag(confidence),
    confidence,
    mostLikelyOutcome: first,
    bestCase: third,
    worstCase: second,
    keyRisks: outputs.slice(0, 3).map((entry) => entry.summary),
    recommendedAction:
      "Run a contained version first, define one success metric, and decide in advance what would make you continue, pause, or reverse.",
    outcomeVariable: "How quickly you learn from the first real-world feedback loop.",
    agentConfidence: confidence
  };
}

async function runAgentCompletion({
  agent,
  modelKey,
  preferredProvider,
  preferredModel,
  prompt,
  systemPrompt
}: {
  agent: SimulationAgent;
  modelKey: "claude" | "gemini";
  preferredProvider: "anthropic" | "google";
  preferredModel?: string | null;
  prompt: string;
  systemPrompt: string;
}) {
  const response = await createSpecialistCompletion({
    prompt,
    modelKey,
    systemPrompt,
    preferredProvider,
    preferredModel,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return {
    agentId: agent.id,
    provider: response.provider,
    resolvedModel: response.resolvedModel || null,
    summary: summarizeText(response.text),
    text: response.text.trim()
  } satisfies SimulationAgentOutput;
}

async function createDiscussionSession(simulation: SimulationRecord) {
  const session = await createSession({
    modelPreference: "orbit-auto",
    projectId: null
  });

  await updateSessionMetadata(session.id, {
    title: `Simulation — ${simulation.title}`
  });

  await addUserMessage(
    session.id,
    `Let's discuss this simulation in more depth.\n\nScenario: ${simulation.scenario}`,
    "orbit-auto"
  );

  const seeded = await saveAssistantMessage(session.id, {
    id: randomUUID(),
    role: "assistant",
    content: [
      "Simulation context loaded for follow-up discussion.",
      "",
      `Verdict: ${simulation.report.verdict}`,
      `Confidence: ${simulation.report.confidence}%`,
      "",
      `Most likely outcome: ${simulation.report.mostLikelyOutcome}`,
      "",
      `Recommended action: ${simulation.report.recommendedAction}`,
      "",
      `Agents used: ${simulation.agentsUsed
        .map((agentId: SimulationAgent["id"]) => agentMap.get(agentId)?.name || agentId)
        .join(", ")}`,
      "",
      "Ask me to dig deeper into risks, customer reaction, finances, or the best execution plan."
    ].join("\n"),
    modelKey: "orbit-auto",
    provider: "simulation"
  });

  return seeded.id;
}

export async function GET(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      const simulation = await getSimulationById({ id, userId: viewer.id });
      if (!simulation) {
        return NextResponse.json({ error: "Simulation not found." }, { status: 404 });
      }

      return NextResponse.json(
        { simulation },
        {
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const simulations = (await listSimulations({ userId: viewer.id, limit: 24 })) as SimulationSummary[];
    return NextResponse.json(
      { simulations },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load simulations."
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rateLimit = enforceRateLimit(request, {
    scope: "simulate",
    max: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many simulation requests. Please wait a moment." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));

  if (body?.action === "discuss") {
    const simulationId = `${body?.simulationId || ""}`.trim();

    if (!simulationId) {
      return NextResponse.json({ error: "A simulation id is required." }, { status: 400 });
    }

    const simulation = (await getSimulationById({ id: simulationId, userId: viewer.id })) as SimulationRecord | null;
    if (!simulation) {
      return NextResponse.json({ error: "Simulation not found." }, { status: 404 });
    }

    const sessionId = await createDiscussionSession(simulation);
    return NextResponse.json({ sessionId });
  }

  const scenario = normalizeScenario(body?.scenario);

  if (!scenario) {
    return NextResponse.json({ error: "A scenario is required." }, { status: 400 });
  }

  return createSseResponse(async (sink: { write: (chunk: string) => void }) => {
    const { topic, agents } = selectAgentsForScenario(scenario);
    writeEvent(sink, "council", {
      topic,
      agents
    });

    await delay(1500);
    writeEvent(sink, "thinking", {
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        statusLabel:
          agent.id === "finance_agent"
            ? "is calculating..."
            : agent.id === "data_agent"
              ? "is benchmarking..."
              : agent.id === "devils_advocate"
                ? "is challenging assumptions..."
                : "is analysing..."
      }))
    });

    const initialPass = await Promise.all(
      agents.map((agent) =>
        runAgentCompletion({
          agent,
          modelKey: agent.id === "data_agent" ? "gemini" : "claude",
          preferredProvider: agent.id === "data_agent" ? "google" : "anthropic",
          preferredModel:
            agent.id === "data_agent"
              ? process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash"
              : process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          prompt: buildAgentAnalysisPrompt(agent, scenario),
          systemPrompt: `${agent.system_prompt} Keep your answer concise, grounded, and useful.`
        })
      )
    );

    const debatePass = await Promise.all(
      agents.map((agent) => {
        const otherSummaries = initialPass
          .filter((entry) => entry.agentId !== agent.id)
          .map((entry) => {
            const other = agentMap.get(entry.agentId);
            return `${other?.emoji || "•"} ${other?.name || entry.agentId}: ${entry.summary}`;
          })
          .join("\n");

        return runAgentCompletion({
          agent,
          modelKey: agent.id === "data_agent" ? "gemini" : "claude",
          preferredProvider: agent.id === "data_agent" ? "google" : "anthropic",
          preferredModel:
            agent.id === "data_agent"
              ? process.env.GEMINI_FLASH_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash"
              : process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
          prompt: buildDebatePrompt(agent, scenario, otherSummaries),
          systemPrompt: `${agent.system_prompt} You are in a council debate. Reference at least one other view before giving your final position.`
        });
      })
    );

    for (const entry of debatePass) {
      const agent = agentMap.get(entry.agentId) || AGENTS[0];
      writeEvent(sink, "agent", {
        agent,
        message: entry
      });
      await delay(180);
    }

    const synthesis = await createSpecialistCompletion({
      prompt: buildSynthesisPrompt(scenario, topic, debatePass),
      modelKey: "claude",
      preferredProvider: "anthropic",
      preferredModel:
        process.env.ANTHROPIC_OPUS_MODEL ||
        process.env.CLAUDE_OPUS_MODEL ||
        process.env.ANTHROPIC_MODEL ||
        "claude-sonnet-4-20250514",
      systemPrompt:
        "You are Xeivora's executive synthesis engine. Read the specialist council transcript and produce a structured final decision report as valid JSON only.",
      messages: [
        {
          role: "user",
          content: buildSynthesisPrompt(scenario, topic, debatePass)
        }
      ]
    });

    const parsed = safeJsonParse(synthesis.text);
    const fallback = buildFallbackReport(scenario, debatePass);
    const confidence = clampConfidence(parsed?.confidence, fallback.confidence);
    const report: SimulationReport = {
      scenario,
      verdict: typeof parsed?.verdict === "string" ? parsed.verdict : fallback.verdict,
      verdictTag: determineVerdictTag(confidence),
      confidence,
      mostLikelyOutcome:
        typeof parsed?.mostLikelyOutcome === "string" ? parsed.mostLikelyOutcome : fallback.mostLikelyOutcome,
      bestCase: typeof parsed?.bestCase === "string" ? parsed.bestCase : fallback.bestCase,
      worstCase: typeof parsed?.worstCase === "string" ? parsed.worstCase : fallback.worstCase,
      keyRisks:
        Array.isArray(parsed?.keyRisks) && parsed.keyRisks.length
          ? parsed.keyRisks.map((risk: unknown) => `${risk}`)
          : fallback.keyRisks,
      recommendedAction:
        typeof parsed?.recommendedAction === "string" ? parsed.recommendedAction : fallback.recommendedAction,
      outcomeVariable:
        typeof parsed?.outcomeVariable === "string" ? parsed.outcomeVariable : fallback.outcomeVariable,
      agentConfidence: confidence
    };

    const saved = (await createSimulation({
      userId: viewer.id,
      scenario,
      topic,
      agentsUsed: agents.map((agent) => agent.id),
      report,
      debate: debatePass
    })) as SimulationRecord;

    writeEvent(sink, "report", {
      simulation: saved,
      report,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji
      }))
    });
    writeEvent(sink, "done", {
      simulationId: saved.id
    });
  });
}
