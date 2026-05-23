import type { TaskComplexity } from "@/lib/task-complexity-detector";
import type { XeivoraIntent } from "@/lib/intent-classifier";

const workflowIntents = new Set<XeivoraIntent>([
  "coding",
  "saas_architecture",
  "automation",
  "business_planning",
  "research"
]);

export function needsWorkflow(prompt: string, intent: XeivoraIntent, complexity: TaskComplexity) {
  const hasExecutionLanguage = /\b(build|implement|debug|deploy|migrate|integrate|architect|workflow|system|app|platform)\b/i.test(prompt);

  return complexity === "complex" && workflowIntents.has(intent) && hasExecutionLanguage;
}
