import type { XeivoraIntent } from "@/lib/intent-classifier";

export type TaskComplexity = "simple" | "moderate" | "complex";

const complexIntents = new Set<XeivoraIntent>([
  "coding",
  "saas_architecture",
  "business_planning",
  "research",
  "automation",
  "analysis"
]);

export function detectTaskComplexity(prompt: string, intent: XeivoraIntent): TaskComplexity {
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const asksForManySteps = /\b(build|create|implement|design|plan|architecture|end-to-end|full|complete|production-ready|debug|integrate)\b/i.test(prompt);

  if (complexIntents.has(intent) && (asksForManySteps || words.length > 14)) {
    return "complex";
  }

  if (complexIntents.has(intent) || words.length > 35) {
    return "moderate";
  }

  return "simple";
}
