"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Copy,
  LoaderCircle,
  MessageSquareText,
  Save,
  Sparkles,
  Target
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceProgressBar,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import { AGENTS, agentMap } from "@/lib/simulate/agents";
import type {
  SimulationAgent,
  SimulationAgentOutput,
  SimulationRecord,
  SimulationSummary
} from "@/lib/simulate/types";

const exampleScenarios = [
  "What if I raise my prices?",
  "What if I go to Japan in April?",
  "What if I hire someone this month?",
  "What if I post on TikTok daily?"
];

type SimulateStreamEvent =
  | { type: "council"; payload: { topic: string; agents: SimulationAgent[] } }
  | { type: "thinking"; payload: { agents: Array<{ id: string; name: string; emoji: string; statusLabel: string }> } }
  | { type: "agent"; payload: { agent: SimulationAgent; message: SimulationAgentOutput } }
  | { type: "report"; payload: { simulation: SimulationRecord; report: SimulationRecord["report"]; agents: Array<{ id: string; name: string; emoji: string }> } }
  | { type: "done"; payload: { simulationId: string } }
  | { type: "error"; payload: { message: string } };

function toReportCopy(simulation: SimulationRecord) {
  return [
    "SIMULATION REPORT",
    "",
    `Scenario: ${simulation.scenario}`,
    `Verdict: ${simulation.report.verdict}`,
    `Confidence: ${simulation.report.confidence}%`,
    "",
    `Most Likely Outcome: ${simulation.report.mostLikelyOutcome}`,
    "",
    `Best Case: ${simulation.report.bestCase}`,
    "",
    `Worst Case: ${simulation.report.worstCase}`,
    "",
    "Key Risks:",
    ...simulation.report.keyRisks.map((risk) => `- ${risk}`),
    "",
    `Recommended Action: ${simulation.report.recommendedAction}`,
    `What changes the outcome: ${simulation.report.outcomeVariable}`,
    "",
    `Agents used: ${simulation.agentsUsed.map((agentId) => agentMap.get(agentId)?.name || agentId).join(", ")}`
  ].join("\n");
}

async function readSseResponse(
  response: Response,
  onEvent: (event: SimulateStreamEvent) => void
) {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("Simulation stream is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const lines = block.split("\n");
      let type = "message";
      let data = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          type = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          data += line.slice(5).trim();
        }
      }

      if (!data) {
        continue;
      }

      onEvent({
        type,
        payload: JSON.parse(data)
      } as SimulateStreamEvent);
    }
  }
}

export function SimulateShell({ viewer = null }: { viewer?: AuthUser | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [recentSimulations, setRecentSimulations] = useState<SimulationSummary[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationRecord | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [assemblyAgents, setAssemblyAgents] = useState<SimulationAgent[]>([]);
  const [assemblyVisibleCount, setAssemblyVisibleCount] = useState(0);
  const [thinkingRows, setThinkingRows] = useState<Array<{ id: string; name: string; emoji: string; statusLabel: string }>>([]);
  const [debateFeed, setDebateFeed] = useState<Array<{ agent: SimulationAgent; message: SimulationAgentOutput }>>([]);
  const [topicLabel, setTopicLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [savingState, setSavingState] = useState<"idle" | "saved">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const assemblyIntervalRef = useRef<number | null>(null);

  const activeSimulationId = searchParams.get("id");
  const hasSimulation = Boolean(selectedSimulation);

  const recentSections = useMemo(
    () => [
      {
        label: "Recent simulations",
        emptyLabel: "No simulations yet.",
        items: recentSimulations.map((simulation) => ({
          id: simulation.id,
          title: simulation.title,
          active: simulation.id === activeSimulationId,
          onSelect: () => {
            router.push(`/simulate?id=${simulation.id}`);
          }
        }))
      }
    ],
    [activeSimulationId, recentSimulations, router]
  );

  useEffect(() => {
    void loadRecentSimulations();
  }, []);

  useEffect(() => {
    if (!activeSimulationId) {
      setSelectedSimulation(null);
      setAssemblyAgents([]);
      setThinkingRows([]);
      setDebateFeed([]);
      setTopicLabel(null);
      return;
    }

    void loadSimulation(activeSimulationId);
  }, [activeSimulationId]);

  useEffect(() => {
    if (!assemblyAgents.length) {
      setAssemblyVisibleCount(0);
      return;
    }

    setAssemblyVisibleCount(0);
    if (assemblyIntervalRef.current) {
      window.clearInterval(assemblyIntervalRef.current);
    }

    assemblyIntervalRef.current = window.setInterval(() => {
      setAssemblyVisibleCount((current) => {
        if (current >= assemblyAgents.length) {
          if (assemblyIntervalRef.current) {
            window.clearInterval(assemblyIntervalRef.current);
            assemblyIntervalRef.current = null;
          }
          return current;
        }

        return current + 1;
      });
    }, 180);

    return () => {
      if (assemblyIntervalRef.current) {
        window.clearInterval(assemblyIntervalRef.current);
        assemblyIntervalRef.current = null;
      }
    };
  }, [assemblyAgents]);

  async function loadRecentSimulations() {
    const response = await fetch("/api/simulate", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { simulations: SimulationSummary[] };
    setRecentSimulations(payload.simulations || []);
  }

  async function loadSimulation(id: string) {
    const response = await fetch(`/api/simulate?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { simulation: SimulationRecord };
    if (!payload.simulation) {
      return;
    }

    setSelectedSimulation(payload.simulation);
    setInput(payload.simulation.scenario);
    setTopicLabel(payload.simulation.topic);
    setAssemblyAgents(payload.simulation.agentsUsed.map((agentId) => agentMap.get(agentId)).filter(Boolean) as SimulationAgent[]);
    setThinkingRows([]);
    setDebateFeed(
      (payload.simulation.debate || []).map((message) => ({
        agent: agentMap.get(message.agentId) || AGENTS[0],
        message
      }))
    );
    setSavingState("saved");
  }

  async function handleSimulate(scenarioOverride?: string) {
    const scenario = `${scenarioOverride || input}`.trim();
    if (!scenario || isSimulating) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setIsSimulating(true);
    setSavingState("idle");
    setCopyState("idle");
    setSelectedSimulation(null);
    setAssemblyAgents([]);
    setThinkingRows([]);
    setDebateFeed([]);
    setTopicLabel(null);
    setInput(scenario);
    router.push("/simulate");

    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
        signal: controller.signal
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to run this simulation.");
      }

      await readSseResponse(response, (event) => {
        if (event.type === "council") {
          setTopicLabel(event.payload.topic);
          setAssemblyAgents(event.payload.agents);
          setThinkingRows([]);
          return;
        }

        if (event.type === "thinking") {
          setThinkingRows(event.payload.agents);
          return;
        }

        if (event.type === "agent") {
          setThinkingRows([]);
          setDebateFeed((current) => [...current, { agent: event.payload.agent, message: event.payload.message }]);
          return;
        }

        if (event.type === "report") {
          setSelectedSimulation(event.payload.simulation);
          setSavingState("saved");
          router.replace(`/simulate?id=${encodeURIComponent(event.payload.simulation.id)}`);
          void loadRecentSimulations();
          return;
        }

        if (event.type === "error") {
          throw new Error(event.payload.message || "Simulation failed.");
        }
      });
    } catch (nextError) {
      if ((nextError as Error).name !== "AbortError") {
        setError(nextError instanceof Error ? nextError.message : "Unable to run this simulation.");
      }
    } finally {
      setIsSimulating(false);
    }
  }

  async function handleDiscuss() {
    if (!selectedSimulation) {
      return;
    }

    const response = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "discuss",
        simulationId: selectedSimulation.id
      })
    });

    const payload = (await response.json()) as { error?: string; sessionId?: string };
    if (!response.ok || !payload.sessionId) {
      setError(payload.error || "Unable to open the follow-up discussion.");
      return;
    }

    router.push(`/chat?session=${encodeURIComponent(payload.sessionId)}`);
  }

  async function handleCopyReport() {
    if (!selectedSimulation) {
      return;
    }

    await navigator.clipboard.writeText(toReportCopy(selectedSimulation));
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <WorkspacePageShell
      statusLabel="Simulation lab"
      viewer={viewer}
      sidebarProps={{
        recentSections,
        searchQuery: sidebarQuery,
        searchPlaceholder: "Search simulations",
        onSearchChange: setSidebarQuery
      }}
    >
      <div className="space-y-8">
        <WorkspacePageHero
          description="Ask any what-if question. A council of AI specialists debate it and give you a structured decision."
          eyebrow="Simulation council"
          title="Simulate"
        />

        <WorkspaceCard className="overflow-hidden p-0">
          <div className="mx-auto max-w-[860px] px-6 py-10 md:px-10 md:py-12">
            <div className="mx-auto max-w-[760px] text-center">
              <label className="block rounded-[14px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-5 py-4 text-left shadow-[0_16px_48px_rgba(0,0,0,0.18)] transition-colors focus-within:border-[var(--site-accent)]">
                <textarea
                  className="min-h-[92px] w-full resize-none bg-transparent text-[18px] leading-8 text-[var(--site-text)] outline-none placeholder:text-[var(--site-subtle)]"
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="What if I launch Xeivora for free with no paid plan?"
                  value={input}
                />
              </label>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {exampleScenarios.map((scenario) => (
                  <button
                    className="rounded-full border border-[color:var(--site-border)] bg-[var(--site-accent-soft)] px-3 py-1.5 text-xs text-[var(--site-muted)] transition hover:border-[color:var(--site-border-strong)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
                    key={scenario}
                    onClick={() => void handleSimulate(scenario)}
                    type="button"
                  >
                    {scenario}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex justify-center">
                <WorkspaceButton
                  className="h-12 min-w-[180px] rounded-full px-8 text-base"
                  disabled={!input.trim() || isSimulating}
                  onClick={() => void handleSimulate()}
                >
                  {isSimulating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
                  Simulate
                </WorkspaceButton>
              </div>
            </div>
          </div>
        </WorkspaceCard>

        {error ? (
          <div className="rounded-[10px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[rgba(248,113,113,0.95)]">
            {error}
          </div>
        ) : null}

        {!hasSimulation && !isSimulating && !debateFeed.length && !assemblyAgents.length ? (
          <WorkspaceEmptyState
            action={
              <WorkspaceButton disabled={!input.trim()} onClick={() => void handleSimulate()}>
                <Sparkles className="h-4 w-4" />
                Run your first simulation
              </WorkspaceButton>
            }
            description="Xeivora will assemble the right specialists, let them debate your scenario, and finish with a structured verdict you can act on."
            title="No simulation running yet"
          />
        ) : null}

        {assemblyAgents.length ? (
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
            initial={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-3">
              <WorkspaceBadge tone="learning">ASSEMBLING YOUR COUNCIL</WorkspaceBadge>
              {topicLabel ? <span className="text-sm text-[var(--site-subtle)]">{topicLabel} scenario</span> : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {assemblyAgents.slice(0, assemblyVisibleCount).map((agent) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 14 }}
                  key={agent.id}
                  transition={{ duration: 0.15 }}
                >
                  <div
                    className="rounded-[8px] border border-[color:var(--site-border)] border-l-4 bg-[var(--site-card)] p-4 text-[var(--site-text)] transition-colors duration-150 hover:border-[color:var(--site-border-strong)]"
                    style={{ borderLeftColor: agent.accentColor }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-base font-medium text-[var(--site-text)]">
                          <span>{agent.emoji}</span>
                          <span>{agent.name}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--site-subtle)]">{agent.role}</p>
                      </div>
                        <WorkspaceBadge tone="learning">selected</WorkspaceBadge>
                      </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        ) : null}

        {thinkingRows.length ? (
          <WorkspaceCard>
            <WorkspaceSectionTitle>Council is thinking</WorkspaceSectionTitle>
            <div className="mt-5 space-y-3">
              {thinkingRows.map((row) => (
                <div
                  className="flex items-center gap-3 rounded-[10px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-3"
                  key={row.id}
                >
                  <span className="text-lg">{row.emoji}</span>
                  <div className="text-sm text-[var(--site-text)]">{row.name}</div>
                  <div className="flex items-center gap-2 text-xs text-[var(--site-subtle)]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--site-accent)]" />
                    <span>{row.statusLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </WorkspaceCard>
        ) : null}

        {debateFeed.length ? (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <WorkspaceBadge tone="learning">LIVE DEBATE</WorkspaceBadge>
              <span className="text-sm text-[var(--site-subtle)]">Specialists are challenging each other in real time.</span>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {debateFeed.map((entry) => (
                  <motion.article
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4"
                    initial={{ opacity: 0, y: 14 }}
                    key={`${entry.agent.id}-${entry.message.text.slice(0, 40)}`}
                    transition={{ duration: 0.15 }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--site-border)] bg-[var(--site-card)] text-lg"
                      style={{ borderColor: `${entry.agent.accentColor}55` }}
                    >
                      {entry.agent.emoji}
                    </div>
                    <div className="max-w-[900px] min-w-0">
                      <div className="text-sm font-medium text-[var(--site-text)]">
                        {entry.agent.name}
                        <span className="ml-2 text-[12px] font-normal text-[var(--site-subtle)]">
                          {entry.message.resolvedModel || entry.message.provider}
                        </span>
                      </div>
                      <div className="mt-2 rounded-[18px] rounded-tl-[4px] border border-[color:var(--site-border)] bg-[var(--site-card)] px-4 py-3 text-[15px] leading-7 text-[var(--site-muted)]">
                        {entry.message.text}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </div>
          </section>
        ) : null}

        {selectedSimulation ? (
          <motion.section animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 16 }} transition={{ duration: 0.15 }}>
            <WorkspaceCard className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">Simulation report</div>
                  <h2 className="mt-3 text-[clamp(28px,3vw,34px)] font-semibold tracking-[-0.03em] text-[var(--site-text)]">
                    {selectedSimulation.report.verdict}
                  </h2>
                  <p className="mt-3 max-w-[760px] text-sm leading-7 text-[var(--site-subtle)]">
                    Scenario: {selectedSimulation.scenario}
                  </p>
                </div>
                <WorkspaceBadge tone="learning">{selectedSimulation.report.verdictTag}</WorkspaceBadge>
              </div>

              <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4">
                <div className="flex items-center justify-between gap-4 text-sm text-[var(--site-subtle)]">
                  <span>Confidence</span>
                  <span className="font-medium text-[var(--site-text)]">{selectedSimulation.report.confidence}%</span>
                </div>
                <div className="mt-3">
                  <WorkspaceProgressBar value={selectedSimulation.report.confidence} />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <ReportCard label="Most Likely Outcome" value={selectedSimulation.report.mostLikelyOutcome} />
                <ReportCard label="Best Case" value={selectedSimulation.report.bestCase} />
                <ReportCard label="Worst Case" value={selectedSimulation.report.worstCase} />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <WorkspaceCard className="border-[color:var(--site-border)] bg-[var(--site-panel)] p-5">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">Key risks</div>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--site-muted)]">
                    {selectedSimulation.report.keyRisks.map((risk) => (
                      <li className="flex items-start gap-3" key={risk}>
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--site-accent)]" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </WorkspaceCard>

                <WorkspaceCard className="border-[color:var(--site-border)] bg-[var(--site-panel)] p-5">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">Recommended action</div>
                  <p className="mt-4 text-sm leading-7 text-[var(--site-muted)]">
                    {selectedSimulation.report.recommendedAction}
                  </p>
                  <div className="mt-6 text-[11px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">
                    What changes the outcome
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--site-muted)]">
                    {selectedSimulation.report.outcomeVariable}
                  </p>
                </WorkspaceCard>
              </div>

              <div className="rounded-[12px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-3 text-sm text-[var(--site-muted)]">
                <span className="font-medium text-[var(--site-text)]">Agents:</span>{" "}
                {selectedSimulation.agentsUsed.map((agentId) => agentMap.get(agentId)?.name || agentId).join(", ")}
                <span className="ml-4 font-medium text-[var(--site-text)]">Confidence:</span> {selectedSimulation.report.agentConfidence}%
              </div>

              <div className="flex flex-wrap gap-3">
                <WorkspaceButton onClick={() => void handleDiscuss()}>
                  <MessageSquareText className="h-4 w-4" />
                  Discuss this
                </WorkspaceButton>
                <WorkspaceButton onClick={() => void handleCopyReport()} variant="secondary">
                  <Copy className="h-4 w-4" />
                  {copyState === "copied" ? "Copied" : "Copy report"}
                </WorkspaceButton>
                <WorkspaceButton onClick={() => void handleSimulate(selectedSimulation.scenario)} variant="secondary">
                  <ArrowRight className="h-4 w-4" />
                  Re-simulate
                </WorkspaceButton>
                <WorkspaceButton
                  onClick={() => {
                    setSavingState("saved");
                    void loadRecentSimulations();
                  }}
                  variant="secondary"
                >
                  <Save className="h-4 w-4" />
                  {savingState === "saved" ? "Saved" : "Save"}
                </WorkspaceButton>
              </div>
            </WorkspaceCard>
          </motion.section>
        ) : null}
      </div>
    </WorkspacePageShell>
  );
}

function ReportCard({ label, value }: { label: string; value: string }) {
  return (
    <WorkspaceCard className="border-[color:var(--site-border)] bg-[var(--site-panel)] p-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--site-subtle)]">{label}</div>
      <p className="mt-4 text-sm leading-7 text-[var(--site-muted)]">{value}</p>
    </WorkspaceCard>
  );
}
