function createDefaultOrbitSnapshot() {
  return {
    timestamp: "2026-05-20T09:30:00.000Z",
    summary: {
      tasksRoutedToday: 18240,
      activeAgents: 24,
      contextRetention: 98.6,
      avgLatencyMs: 1840,
      queueDepth: 14,
      sla: 99.98,
      modelSwitches: 1364,
      automations: 184
    },
    workflows: [
      {
        id: "wf-revenue-ops",
        name: "Revenue Ops Co-Pilot",
        status: "Live",
        description:
          "Routes inbound revenue questions through reasoning, account memory, approval logic, and knowledge updates without losing deal context.",
        trigger: "Slack escalation",
        throughput: "2.1K/day",
        successRate: 98.2,
        latencyMs: 1420,
        memory: "Account lane attached",
        owner: "Growth",
        tools: ["Slack", "ChatGPT", "Claude", "Notion"]
      },
      {
        id: "wf-product-launch",
        name: "Launch Readiness Swarm",
        status: "Optimizing",
        description:
          "Coordinates release notes, changelog drafts, issue tagging, and executive summaries across docs and engineering systems.",
        trigger: "GitHub milestone change",
        throughput: "780/day",
        successRate: 96.7,
        latencyMs: 2260,
        memory: "Project lane synced",
        owner: "Product",
        tools: ["GitHub", "Claude", "Notion", "Slack"]
      },
      {
        id: "wf-support-resolution",
        name: "Support Resolution Loop",
        status: "Syncing",
        description:
          "Triages customer tickets, drafts responses, checks policy memory, and escalates only when the workflow detects real ambiguity.",
        trigger: "API intake",
        throughput: "4.8K/day",
        successRate: 97.9,
        latencyMs: 1640,
        memory: "Customer lane active",
        owner: "Support",
        tools: ["Gemini", "ChatGPT", "Slack", "Notion"]
      }
    ],
    activityLogs: [
      {
        id: "log-001",
        timestamp: "2026-05-20T09:28:44.000Z",
        level: "SUCCESS",
        message: "Xeivora merged Claude policy analysis into the support response draft and returned a ready-to-send summary in Slack.",
        actor: "Context Router",
        channel: "Support"
      },
      {
        id: "log-002",
        timestamp: "2026-05-20T09:27:12.000Z",
        level: "INFO",
        message: "Project memory lane updated with the latest launch dependencies before GitHub issue creation.",
        actor: "Memory Fabric",
        channel: "Product"
      },
      {
        id: "log-003",
        timestamp: "2026-05-20T09:25:31.000Z",
        level: "WARNING",
        message: "Lead qualification workflow requested a Slack approval checkpoint after confidence dropped below the routing threshold.",
        actor: "Policy Guard",
        channel: "Growth"
      },
      {
        id: "log-004",
        timestamp: "2026-05-20T09:24:05.000Z",
        level: "SUCCESS",
        message: "Gemini classified a multimodal intake packet and handed structured context to ChatGPT for action planning.",
        actor: "Model Router",
        channel: "Operations"
      },
      {
        id: "log-005",
        timestamp: "2026-05-20T09:22:19.000Z",
        level: "INFO",
        message: "Xeivora reopened the launch readiness workflow after a new dependency landed in GitHub.",
        actor: "Workflow Engine",
        channel: "Engineering"
      }
    ],
    integrations: [
      {
        name: "ChatGPT",
        status: "Connected",
        latency: "410ms",
        usage: "Reasoning, synthesis, and execution planning",
        accent: "cyan"
      },
      {
        name: "Claude",
        status: "Connected",
        latency: "520ms",
        usage: "Long-form document work and policy interpretation",
        accent: "violet"
      },
      {
        name: "Gemini",
        status: "Observing",
        latency: "470ms",
        usage: "Multimodal intake and search-assisted classification",
        accent: "emerald"
      },
      {
        name: "Slack",
        status: "Connected",
        latency: "140ms",
        usage: "Approvals, escalations, and human feedback loops",
        accent: "amber"
      },
      {
        name: "Notion",
        status: "Connected",
        latency: "230ms",
        usage: "Knowledge sync, decision logs, and persistent memory",
        accent: "rose"
      },
      {
        name: "GitHub",
        status: "Connected",
        latency: "180ms",
        usage: "Issue actions, release workflows, and developer handoffs",
        accent: "cyan"
      }
    ],
    analytics: {
      throughput: [
        { label: "09:00", value: 980 },
        { label: "09:05", value: 1080 },
        { label: "09:10", value: 1160 },
        { label: "09:15", value: 1250 },
        { label: "09:20", value: 1390 },
        { label: "09:25", value: 1470 }
      ],
      queueDepth: [
        { label: "09:00", value: 8 },
        { label: "09:05", value: 10 },
        { label: "09:10", value: 9 },
        { label: "09:15", value: 12 },
        { label: "09:20", value: 13 },
        { label: "09:25", value: 14 }
      ],
      resolutionMinutes: [
        { label: "09:00", value: 4.8 },
        { label: "09:05", value: 4.4 },
        { label: "09:10", value: 4.1 },
        { label: "09:15", value: 3.9 },
        { label: "09:20", value: 3.5 },
        { label: "09:25", value: 3.2 }
      ],
      regions: [
        { label: "US", value: 48 },
        { label: "EU", value: 34 },
        { label: "APAC", value: 18 }
      ],
      modelMix: [
        { name: "GPT-4o", value: 42, accent: "cyan" },
        { name: "Claude Sonnet", value: 26, accent: "violet" },
        { name: "Gemini 2.5", value: 18, accent: "emerald" },
        { name: "Xeivora agents", value: 14, accent: "amber" }
      ]
    },
    memoryLanes: [
      {
        name: "Execution memory lane",
        coverage: 98,
        items: "Live objective",
        detail: "Current step data, drafts, and routing decisions remain attached across model handoffs.",
        accent: "cyan"
      },
      {
        name: "Project memory lane",
        coverage: 94,
        items: "14.2M tokens",
        detail: "Historical decisions, launch plans, customer notes, and documentation stay accessible inside every workflow.",
        accent: "violet"
      },
      {
        name: "Policy memory lane",
        coverage: 100,
        items: "Guardrails active",
        detail: "Brand, compliance, approval, and escalation rules are injected before actions are taken.",
        accent: "emerald"
      }
    ],
    builder: {
      palette: [
        "Webhook trigger",
        "Intent router",
        "Context memory",
        "Model step",
        "Tool action",
        "Human approval"
      ],
      nodes: [
        { id: "trigger", label: "Inbound signal", kind: "Trigger", x: 8, y: 18, accent: "cyan" },
        { id: "router", label: "Xeivora router", kind: "Core", x: 34, y: 18, accent: "violet" },
        { id: "memory", label: "Memory lane", kind: "State", x: 34, y: 56, accent: "emerald" },
        { id: "claude", label: "Claude brief", kind: "Model", x: 68, y: 8, accent: "violet" },
        { id: "chatgpt", label: "ChatGPT action", kind: "Model", x: 68, y: 34, accent: "cyan" },
        { id: "slack", label: "Slack approval", kind: "Human", x: 68, y: 64, accent: "amber" },
        { id: "github", label: "GitHub issue", kind: "Action", x: 84, y: 64, accent: "rose" }
      ],
      connections: [
        { from: "trigger", to: "router", label: "normalize" },
        { from: "router", to: "claude", label: "reason" },
        { from: "router", to: "chatgpt", label: "act" },
        { from: "router", to: "memory", label: "persist" },
        { from: "memory", to: "slack", label: "approve" },
        { from: "slack", to: "github", label: "dispatch" }
      ]
    },
    agents: [
      {
        name: "Navigator Agent",
        specialty: "Routing strategy",
        load: 72,
        status: "Live",
        model: "GPT-4o"
      },
      {
        name: "Memory Keeper",
        specialty: "Context stitching",
        load: 64,
        status: "Live",
        model: "Claude Sonnet"
      },
      {
        name: "Ops Pilot",
        specialty: "Action execution",
        load: 53,
        status: "Standby",
        model: "Gemini 2.5"
      }
    ]
  };
}

module.exports = {
  createDefaultOrbitSnapshot
};
