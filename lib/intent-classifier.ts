export type XeivoraIntent =
  | "casual"
  | "simple_qa"
  | "translation"
  | "definition"
  | "coding"
  | "saas_architecture"
  | "business_planning"
  | "research"
  | "automation"
  | "analysis"
  | "writing";

const intentPatterns: Array<[XeivoraIntent, RegExp]> = [
  ["coding", /\b(code|coding|debug|bug|typescript|javascript|react|next\.?js|api|server|database|auth|authentication|login|schema)\b/i],
  ["saas_architecture", /\b(saas|architecture|multi-tenant|subscription|billing|platform|mvp|system design)\b/i],
  ["automation", /\b(workflow|automation|n8n|zapier|trigger|webhook|pipeline|integration)\b/i],
  ["business_planning", /\b(launch|roadmap|gtm|go-to-market|business plan|pricing|investor|pitch|strategy)\b/i],
  ["research", /\b(research|sources|market|compare|competitor|literature|deep dive)\b/i],
  ["analysis", /\b(analyze|analysis|evaluate|metrics|data|tradeoff|risk)\b/i],
  ["writing", /\b(write|draft|rewrite|email|blog|caption|copy|proposal)\b/i],
  ["translation", /\b(translate|translation|in spanish|in french|in tamil|in sinhala)\b/i],
  ["definition", /\b(define|meaning of|what does .* mean|explain the term)\b/i],
  ["casual", /\b(hi|hello|hey|thanks|thank you|how are you)\b/i]
];

export function classifyIntent(prompt: string): XeivoraIntent {
  const normalized = prompt.trim();

  if (!normalized) {
    return "simple_qa";
  }

  for (const [intent, pattern] of intentPatterns) {
    if (pattern.test(normalized)) {
      return intent;
    }
  }

  return "simple_qa";
}
