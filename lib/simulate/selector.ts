import { agentMap } from "@/lib/simulate/agents";
import type { SimulationAgent, SimulationTopic } from "@/lib/simulate/types";

const BUSINESS_KEYWORDS = ["startup", "business", "launch", "saas", "product", "pricing", "market", "company"];
const PRICING_KEYWORDS = ["price", "pricing", "charge", "subscription", "plan", "discount"];
const TRAVEL_KEYWORDS = ["travel", "trip", "japan", "flight", "hotel", "visa", "itinerary", "esim"];
const HEALTH_KEYWORDS = ["health", "symptom", "doctor", "medication", "sleep", "diet", "illness"];
const HIRING_KEYWORDS = ["hire", "hiring", "employee", "recruit", "team member", "contractor"];
const MARKETING_KEYWORDS = ["marketing", "tiktok", "instagram", "content", "social", "campaign", "ads", "brand"];

const topicAgents: Record<SimulationTopic, SimulationAgent["id"][]> = {
  business: ["strategist", "finance_agent", "devils_advocate", "customer_agent", "competitor_agent", "risk_agent", "realist"],
  pricing: ["finance_agent", "customer_agent", "competitor_agent", "psychology_agent", "devils_advocate", "realist"],
  travel: ["risk_agent", "data_agent", "realist", "psychology_agent", "market_agent", "optimist"],
  health: ["legal_agent", "risk_agent", "data_agent", "realist", "psychology_agent"],
  hiring: ["finance_agent", "risk_agent", "psychology_agent", "strategist", "realist"],
  marketing: ["customer_agent", "psychology_agent", "market_agent", "data_agent", "optimist", "devils_advocate"],
  general: ["strategist", "realist", "risk_agent", "optimist", "devils_advocate"]
};

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function classifyScenarioTopic(scenario: string): SimulationTopic {
  const normalized = scenario.toLowerCase();

  if (containsAny(normalized, PRICING_KEYWORDS)) return "pricing";
  if (containsAny(normalized, TRAVEL_KEYWORDS)) return "travel";
  if (containsAny(normalized, HEALTH_KEYWORDS)) return "health";
  if (containsAny(normalized, HIRING_KEYWORDS)) return "hiring";
  if (containsAny(normalized, MARKETING_KEYWORDS)) return "marketing";
  if (containsAny(normalized, BUSINESS_KEYWORDS)) return "business";
  return "general";
}

export function selectAgentsForScenario(scenario: string) {
  const topic = classifyScenarioTopic(scenario);
  const agents = topicAgents[topic]
    .map((id) => agentMap.get(id))
    .filter(Boolean) as SimulationAgent[];

  return {
    topic,
    agents
  };
}
