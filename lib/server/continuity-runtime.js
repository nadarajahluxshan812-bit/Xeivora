const { routeIntent } = require("./intent-router");

function analyzePrompt(prompt) {
  return routeIntent(prompt);
}

function createContinuationPacket({ prompt, completedWork, provider }) {
  return {
    goal: prompt,
    current_progress: "Initial provider completed the first part of the workflow before handoff.",
    completed_work: completedWork,
    remaining_work: [
      "Continue from the last completed checkpoint",
      "Preserve the same structure and coding style",
      "Finish the answer as one uninterrupted response"
    ],
    important_decisions: [
      "Do not restart the task",
      "Keep implementation details consistent",
      "Preserve markdown and code formatting"
    ],
    code_file_state: "Architecture and implementation notes are represented in the streamed output.",
    output_style: "Technical markdown with clear sections and practical next steps.",
    provider_previously_used: provider,
    instruction: "Do not restart. Continue from this exact point."
  };
}

function normalizeProviderResponse({
  provider,
  summary = "",
  completed_steps = [],
  remaining_steps = [],
  output = "",
  continuity_state = "not_needed",
  finish_reason = "stop"
}) {
  return {
    provider,
    summary,
    completed_steps,
    remaining_steps,
    output,
    continuity_state,
    finish_reason
  };
}

function stitchProviderOutputs(parts) {
  return parts.map((part) => part.trim()).filter(Boolean).join("\n\n").replace(/\n{3,}/g, "\n\n");
}

function getCodingContinuityDemo(prompt) {
  const openAiPart = [
    "## Next.js SaaS authentication system",
    "",
    "### 1. Architecture",
    "- Use Next.js App Router with server-first route protection.",
    "- Keep auth actions on the server and expose only session-safe data to client components.",
    "- Store users, accounts, sessions, organizations, and audit events separately.",
    "",
    "### 2. Auth flow",
    "- Sign up creates a user, organization, and first admin membership.",
    "- Sign in validates credentials, rotates the session token, and writes an audit event.",
    "- Protected routes read the server session before rendering private workspace pages."
  ].join("\n");

  const checkpoints = [
    "Architecture complete",
    "Auth flow complete",
    "Database schema complete"
  ];

  const packet = createContinuationPacket({
    prompt,
    provider: "openai",
    completedWork: checkpoints
  });

  const claudePart = [
    "### 3. Database schema",
    "```sql",
    "create table users (",
    "  id uuid primary key,",
    "  email text unique not null,",
    "  password_hash text not null,",
    "  created_at timestamptz default now()",
    ");",
    "",
    "create table sessions (",
    "  id uuid primary key,",
    "  user_id uuid references users(id) on delete cascade,",
    "  token_hash text unique not null,",
    "  expires_at timestamptz not null",
    ");",
    "```",
    "",
    "### 4. Security checklist",
    "- Hash passwords with `argon2id` or a managed auth provider.",
    "- Store only hashed session tokens.",
    "- Add CSRF protection for credential actions.",
    "- Rate-limit login attempts by email and IP.",
    "- Record audit events for sign in, sign out, password reset, and role changes.",
    "",
    "### 5. Implementation order",
    "1. Create schema and migration.",
    "2. Add server auth actions.",
    "3. Add session helper and protected layout.",
    "4. Build sign in/sign up UI.",
    "5. Add tests for session creation, expiry, and protected-route redirects.",
    "",
    "Continuity handoff completed: the second provider continued from the saved packet instead of restarting."
  ].join("\n");

  return {
    checkpoints,
    packet,
    output: stitchProviderOutputs([openAiPart, claudePart]),
    normalized: normalizeProviderResponse({
      provider: "openai -> anthropic",
      summary: "Generated a practical Next.js SaaS auth architecture with a continuity handoff.",
      completed_steps: checkpoints,
      remaining_steps: ["Turn plan into files", "Connect database adapter", "Add automated tests"],
      output: stitchProviderOutputs([openAiPart, claudePart]),
      continuity_state: "completed",
      finish_reason: "fallback"
    })
  };
}

function createSimpleFallback(prompt, intent) {
  const lower = prompt.toLowerCase();

  if (/\bwhat is xeivora|explain xeivora|xeivora\?/i.test(lower)) {
    return "Xeivora is an AI continuity workspace: it keeps conversations, progress, and workflow context intact while work moves across models and tools.";
  }

  if (intent === "conversational") return "Hey 👋 How can I help today?";
  if (intent === "factual") return "I’ll answer directly when I can verify the facts or reach a live service.";
  if (/\bweather\b/.test(lower)) return "I couldn't reach the live weather service just now, but I can try again in a moment.";

  return "I’m ready to help. Ask directly and I’ll keep the response clear and useful.";
}

module.exports = {
  analyzePrompt,
  createContinuationPacket,
  createSimpleFallback,
  getCodingContinuityDemo,
  normalizeProviderResponse,
  stitchProviderOutputs
};
