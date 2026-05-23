export type Accent = "cyan" | "violet" | "emerald" | "amber" | "rose";

export type NavItem = {
  label: string;
  href: string;
};

export type HeroMetric = {
  label: string;
  value: string;
  detail: string;
};

export type FeatureCard = {
  eyebrow: string;
  title: string;
  description: string;
  accent: Accent;
};

export type WorkflowStep = {
  title: string;
  description: string;
  detail: string;
};

export type PricingPlan = {
  name: string;
  price: string;
  description: string;
  cta: string;
  features: string[];
  highlight?: boolean;
};

export type OrbitSummary = {
  tasksRoutedToday: number;
  activeAgents: number;
  contextRetention: number;
  avgLatencyMs: number;
  queueDepth: number;
  sla: number;
  modelSwitches: number;
  automations: number;
};

export type OrbitWorkflow = {
  id: string;
  name: string;
  status: "Live" | "Queued" | "Optimizing" | "Syncing";
  description: string;
  trigger: string;
  throughput: string;
  successRate: number;
  latencyMs: number;
  memory: string;
  owner: string;
  tools: string[];
};

export type OrbitLog = {
  id: string;
  timestamp: string;
  level: "INFO" | "SUCCESS" | "WARNING";
  message: string;
  actor: string;
  channel: string;
};

export type OrbitIntegration = {
  name: string;
  status: "Connected" | "Observing" | "Attention";
  latency: string;
  usage: string;
  accent: Accent;
};

export type SeriesPoint = {
  label: string;
  value: number;
};

export type ModelMix = {
  name: string;
  value: number;
  accent: Accent;
};

export type OrbitMemoryLane = {
  name: string;
  coverage: number;
  items: string;
  detail: string;
  accent: Accent;
};

export type OrbitAgent = {
  name: string;
  specialty: string;
  load: number;
  status: "Live" | "Standby" | "Learning";
  model: string;
};

export type OrbitBuilderNode = {
  id: string;
  label: string;
  kind: string;
  x: number;
  y: number;
  accent: Accent;
};

export type OrbitBuilderConnection = {
  from: string;
  to: string;
  label: string;
};

export type OrbitBuilder = {
  palette: string[];
  nodes: OrbitBuilderNode[];
  connections: OrbitBuilderConnection[];
};

export type OrbitAnalytics = {
  throughput: SeriesPoint[];
  queueDepth: SeriesPoint[];
  resolutionMinutes: SeriesPoint[];
  regions: SeriesPoint[];
  modelMix: ModelMix[];
};

export type OrbitOverview = {
  timestamp: string;
  summary: OrbitSummary;
  workflows: OrbitWorkflow[];
  activityLogs: OrbitLog[];
  integrations: OrbitIntegration[];
  analytics: OrbitAnalytics;
  memoryLanes: OrbitMemoryLane[];
  builder: OrbitBuilder;
  agents: OrbitAgent[];
};
