import type {
  FeatureCard,
  HeroMetric,
  NavItem,
  OrbitIntegration,
  PricingPlan,
  WorkflowStep
} from "@/lib/types";

export const navItems: NavItem[] = [
  { label: "Platform", href: "#platform" },
  { label: "Workflow Builder", href: "#builder" },
  { label: "Pricing", href: "#pricing" },
  { label: "Dashboard", href: "#dashboard-preview" }
];

export const heroMetrics: HeroMetric[] = [
  {
    label: "Model routing accuracy",
    value: "98.6%",
    detail: "OrbitAI sends work to the best-fit model, tool, or agent in real time."
  },
  {
    label: "Context preserved",
    value: "14.2M tokens",
    detail: "Persistent memory travels with every workflow instead of resetting between steps."
  },
  {
    label: "Automations orchestrated",
    value: "18.2K/day",
    detail: "Revenue, support, product, and ops workflows run from one continuous intelligence layer."
  }
];

export const featureCards: FeatureCard[] = [
  {
    eyebrow: "Context Fabric",
    title: "Preserve memory across every AI step",
    description:
      "OrbitAI keeps user intent, artifacts, handoffs, and decisions alive as work moves between models, tools, and human approvals.",
    accent: "cyan"
  },
  {
    eyebrow: "Adaptive Routing",
    title: "Send tasks to the best AI automatically",
    description:
      "Route reasoning, drafting, retrieval, coding, and actions through the right combination of agents, APIs, and SaaS tools.",
    accent: "violet"
  },
  {
    eyebrow: "Workflow Autopilot",
    title: "Run multi-step processes end to end",
    description:
      "Coordinate triggers, tool calls, memory updates, and approvals without gluing together brittle point-to-point automations.",
    accent: "emerald"
  },
  {
    eyebrow: "Observability",
    title: "See every decision and system handoff",
    description:
      "Track latency, throughput, tool health, task routing, and agent output quality from one control plane.",
    accent: "amber"
  },
  {
    eyebrow: "Agent Runtime",
    title: "Launch specialized agents with guardrails",
    description:
      "Create purpose-built agents for support, GTM, product ops, finance, and engineering while keeping governance centralized.",
    accent: "rose"
  },
  {
    eyebrow: "Enterprise Integrations",
    title: "Plug into the stack you already use",
    description:
      "Connect ChatGPT, Claude, Gemini, Slack, Notion, GitHub, internal APIs, and databases into one coordinated AI system.",
    accent: "cyan"
  }
];

export const workflowSteps: WorkflowStep[] = [
  {
    title: "Signal intake",
    description: "OrbitAI captures events from Slack, GitHub, forms, CRMs, and API triggers.",
    detail: "Every trigger is normalized into one shared execution context."
  },
  {
    title: "Intent + model routing",
    description: "The platform evaluates the task and delegates each step to the best model or agent.",
    detail: "Reasoning, retrieval, coding, summarization, and actions are split automatically."
  },
  {
    title: "Persistent context memory",
    description: "Decisions, artifacts, and handoffs are written into memory so the workflow never loses state.",
    detail: "Project memory, customer memory, and policy memory stay attached throughout the run."
  },
  {
    title: "Action orchestration",
    description: "OrbitAI writes updates, opens tickets, sends approvals, and launches downstream workflows.",
    detail: "The result is a continuous intelligent system instead of isolated prompts."
  }
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "$79",
    description: "For small teams unifying a few critical AI workflows.",
    cta: "Start building",
    features: [
      "Up to 10 orchestrated workflows",
      "Core model routing + memory lanes",
      "Slack, Notion, and GitHub integrations",
      "Realtime activity feed"
    ]
  },
  {
    name: "Growth",
    price: "$249",
    description: "For scaling companies replacing fragmented AI tooling with one control layer.",
    cta: "Launch OrbitAI",
    highlight: true,
    features: [
      "Unlimited workflows and agents",
      "Advanced routing policies",
      "Shared context graph across teams",
      "Analytics, approvals, and governance"
    ]
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations orchestrating secure, high-volume intelligent operations.",
    cta: "Talk to sales",
    features: [
      "Custom memory architecture",
      "Private connectors and internal APIs",
      "SLA, observability, and audit trails",
      "Dedicated solution engineering"
    ]
  }
];

export const landingIntegrations: OrbitIntegration[] = [
  {
    name: "ChatGPT",
    status: "Connected",
    latency: "410ms",
    usage: "Long-form reasoning and synthesis",
    accent: "cyan"
  },
  {
    name: "Claude",
    status: "Connected",
    latency: "520ms",
    usage: "Document analysis and policy work",
    accent: "violet"
  },
  {
    name: "Gemini",
    status: "Observing",
    latency: "470ms",
    usage: "Multimodal classification and search",
    accent: "emerald"
  },
  {
    name: "Slack",
    status: "Connected",
    latency: "140ms",
    usage: "Triggers, approvals, and notifications",
    accent: "amber"
  },
  {
    name: "Notion",
    status: "Connected",
    latency: "230ms",
    usage: "Knowledge sync and memory updates",
    accent: "rose"
  },
  {
    name: "GitHub",
    status: "Connected",
    latency: "180ms",
    usage: "Code handoffs and issue actions",
    accent: "cyan"
  }
];
