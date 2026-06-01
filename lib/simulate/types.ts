export type SimulationTopic =
  | "business"
  | "pricing"
  | "travel"
  | "health"
  | "hiring"
  | "marketing"
  | "general";

export type SimulationAgent = {
  id:
    | "strategist"
    | "devils_advocate"
    | "optimist"
    | "realist"
    | "data_agent"
    | "risk_agent"
    | "customer_agent"
    | "finance_agent"
    | "legal_agent"
    | "competitor_agent"
    | "market_agent"
    | "psychology_agent";
  name: string;
  emoji: string;
  role: string;
  thinks_like: string;
  system_prompt: string;
  has_web_search?: boolean;
  accentColor: string;
};

export type SimulationAgentOutput = {
  agentId: SimulationAgent["id"];
  provider: string;
  resolvedModel: string | null;
  summary: string;
  text: string;
};

export type SimulationReport = {
  scenario: string;
  verdict: string;
  verdictTag: string;
  confidence: number;
  mostLikelyOutcome: string;
  bestCase: string;
  worstCase: string;
  keyRisks: string[];
  recommendedAction: string;
  outcomeVariable: string;
  agentConfidence: number;
};

export type SimulationRecord = {
  id: string;
  userId: string;
  scenario: string;
  topic: SimulationTopic;
  title: string;
  agentsUsed: SimulationAgent["id"][];
  report: SimulationReport;
  debate: SimulationAgentOutput[];
  createdAt: string;
};

export type SimulationSummary = {
  id: string;
  scenario: string;
  title: string;
  agentsUsed: SimulationAgent["id"][];
  createdAt: string;
};
