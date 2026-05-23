const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const keys = [
  ["OPENAI_API_KEY", "OpenAI"],
  ["ANTHROPIC_API_KEY", "Anthropic / Claude"],
  ["GEMINI_API_KEY", "Gemini"],
  ["GOOGLE_API_KEY", "Google API"]
];

for (const [envVar, label] of keys) {
  const value = process.env[envVar] || "";
  const status = value.trim().length > 0 ? "configured" : "missing";
  console.log(`${label}: ${status}`);
}

console.log("No secret values were printed.");
