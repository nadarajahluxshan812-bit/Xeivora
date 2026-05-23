const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { createDefaultOrbitSnapshot } = require("./orbit-default");

const dataFile = path.join(process.cwd(), "data", "orbit-data.json");

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSeed() {
  try {
    if (!fs.existsSync(dataFile)) {
      console.warn("[Xeivora] data/orbit-data.json is missing. Using built-in demo orbit data.");
      return createDefaultOrbitSnapshot();
    }

    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (error) {
    console.warn(
      "[Xeivora] Unable to load data/orbit-data.json. Falling back to built-in demo orbit data.",
      error instanceof Error ? error.message : error
    );
    return createDefaultOrbitSnapshot();
  }
}

const state = loadSeed();
const clients = new Set();
const listeners = new Set();
let tickerStarted = false;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function refreshSeries(series, value, fixed = null) {
  const now = new Date();
  const label = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  });

  series.push({
    label,
    value: fixed === null ? value : Number(value.toFixed(fixed))
  });

  if (series.length > 8) {
    series.shift();
  }
}

function buildLog(workflow) {
  const lastTool = workflow.tools[workflow.tools.length - 1];

  const messages = [
    `${workflow.name} routed its latest branch through ${workflow.tools[1]} and wrote the outcome back to ${lastTool}.`,
    `Xeivora preserved ${workflow.memory.toLowerCase()} while moving ${workflow.name} into its next action phase.`,
    `${workflow.name} completed a ${workflow.trigger.toLowerCase()} handoff and updated downstream systems with fresh context.`,
    `The policy layer reviewed ${workflow.name} before dispatching actions across ${workflow.tools.slice(0, 3).join(", ")}.`
  ];

  return {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    level: pick(["INFO", "SUCCESS", "SUCCESS", "WARNING"]),
    message: pick(messages),
    actor: pick(["Workflow Engine", "Context Router", "Memory Fabric", "Policy Guard", "Model Router"]),
    channel: workflow.owner
  };
}

function mutateModelMix() {
  const mix = state.analytics.modelMix;
  const deltas = mix.map(() => randomBetween(-2.2, 2.2));

  let total = 0;
  for (let index = 0; index < mix.length; index += 1) {
    mix[index].value = clamp(Math.round(mix[index].value + deltas[index]), 8, 52);
    total += mix[index].value;
  }

  const difference = 100 - total;
  mix[0].value = clamp(mix[0].value + difference, 10, 60);
}

function mutateAgents() {
  state.agents = state.agents.map((agent) => ({
    ...agent,
    load: clamp(agent.load + randomInt(-6, 7), 32, 92),
    status: pick(["Live", "Live", "Standby", "Learning"])
  }));
}

function mutateWorkflows() {
  return state.workflows.map((workflow) => ({
    ...workflow,
    status: pick(["Live", "Live", "Optimizing", "Syncing", "Queued"]),
    successRate: Number(clamp(workflow.successRate + randomBetween(-0.7, 0.7), 94.2, 99.8).toFixed(1)),
    latencyMs: Math.round(clamp(workflow.latencyMs + randomBetween(-180, 220), 920, 2800))
  }));
}

function advanceState() {
  state.timestamp = new Date().toISOString();
  state.summary.tasksRoutedToday += randomInt(18, 42);
  state.summary.activeAgents = clamp(state.summary.activeAgents + pick([-1, 0, 0, 1]), 18, 31);
  state.summary.contextRetention = Number(
    clamp(state.summary.contextRetention + randomBetween(-0.2, 0.2), 97.1, 99.4).toFixed(1)
  );
  state.summary.avgLatencyMs = Math.round(
    clamp(state.summary.avgLatencyMs + randomBetween(-160, 150), 1280, 2320)
  );
  state.summary.queueDepth = clamp(state.summary.queueDepth + pick([-2, -1, 0, 1, 2]), 6, 22);
  state.summary.sla = Number(clamp(state.summary.sla + randomBetween(-0.02, 0.02), 99.91, 99.99).toFixed(2));
  state.summary.modelSwitches += randomInt(3, 11);
  state.summary.automations = clamp(state.summary.automations + pick([0, 0, 1]), 180, 210);

  state.workflows = mutateWorkflows();
  mutateAgents();
  mutateModelMix();

  const busiestWorkflow = pick(state.workflows);
  const log = buildLog(busiestWorkflow);
  state.activityLogs.unshift(log);
  state.activityLogs = state.activityLogs.slice(0, 8);

  const latestThroughput = state.analytics.throughput[state.analytics.throughput.length - 1].value;
  const latestQueue = state.analytics.queueDepth[state.analytics.queueDepth.length - 1].value;
  const latestResolution =
    state.analytics.resolutionMinutes[state.analytics.resolutionMinutes.length - 1].value;

  refreshSeries(
    state.analytics.throughput,
    clamp(latestThroughput + randomBetween(-70, 120), 940, 2400)
  );
  refreshSeries(state.analytics.queueDepth, clamp(latestQueue + randomBetween(-2, 3), 5, 24), 0);
  refreshSeries(
    state.analytics.resolutionMinutes,
    clamp(latestResolution + randomBetween(-0.35, 0.3), 2.6, 5),
    1
  );
}

function getOrbitSnapshot() {
  return deepClone(state);
}

function broadcast() {
  const snapshot = getOrbitSnapshot();
  const payload = `data: ${JSON.stringify(snapshot)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }

  for (const listener of listeners) {
    listener(snapshot);
  }
}

function startOrbitTicker() {
  if (tickerStarted) {
    return;
  }

  tickerStarted = true;
  setInterval(() => {
    advanceState();
    broadcast();
  }, 2600);
}

function registerOrbitStream(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify(getOrbitSnapshot())}\n\n`);

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
    res.end();
  });
}

function subscribeOrbitStream(listener) {
  startOrbitTicker();
  listeners.add(listener);
  listener(getOrbitSnapshot());

  return () => {
    listeners.delete(listener);
  };
}

module.exports = {
  getOrbitSnapshot,
  registerOrbitStream,
  subscribeOrbitStream,
  startOrbitTicker
};
