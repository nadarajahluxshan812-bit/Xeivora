const SIGNAL_GROUPS = {
  travel: /\b(flight|flights|travel|trip|visit|going to|visa|passport|esim|sim card|data plan|hotel|accommodation|book|booking)\b/i,
  weather: /\b(weather|temperature|forecast|rain|sunny|hot|cold|climate|degrees)\b/i,
  search: /\b(latest|current|today|news|what happened|who is|price of|cost of|how much is|stock|crypto|score|result)\b/i,
  calculation: /\b(calculate|convert|how many|percentage|exchange rate|currency|equals)\b/i,
  memory: /\b(remember|save this|note that|dont forget|don't forget|keep in mind|store this)\b/i
};

export function likelyNeedsTool(message: string): boolean {
  const value = `${message || ""}`.trim();

  if (!value) {
    return false;
  }

  return Object.values(SIGNAL_GROUPS).some((pattern) => pattern.test(value));
}
