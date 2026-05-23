import { createWorkflowCheckpoint } from "@/lib/checkpoint-manager";
import { createContinuationPacket } from "@/lib/context-compressor";
import { routeProviderForContinuity } from "@/lib/provider-router";
import { stitchProviderOutputs } from "@/lib/response-stitcher";

export function createCodingContinuityDemo(prompt: string) {
  const route = routeProviderForContinuity({
    openai: true,
    anthropic: true,
    google: true
  });

  const checkpoints = [
    createWorkflowCheckpoint("Architecture complete", "Next.js app structure, route protection, and auth boundaries defined."),
    createWorkflowCheckpoint("Auth flow complete", "Sign up, sign in, session refresh, and protected route behavior mapped."),
    createWorkflowCheckpoint("Database schema complete", "Users, accounts, sessions, audit logs, and organization tables planned.")
  ];

  const packet = createContinuationPacket({
    goal: prompt,
    current_progress: "OpenAI completed the architecture and auth flow, then hit a simulated context limit.",
    completed_work: checkpoints.map((checkpoint) => checkpoint.summary),
    remaining_work: ["Continue implementation notes", "Add security hardening", "Return final stitched build plan"],
    important_decisions: ["Use server-side sessions", "Keep provider transfer invisible", "Preserve markdown/code style"],
    code_file_state: "No local files changed in demo mode; output represents implementation state.",
    output_style: "Concise technical markdown with code-oriented sections.",
    provider_previously_used: route.primary
  });

  return {
    route,
    checkpoints,
    packet,
    stitchedPreview: stitchProviderOutputs([
      "OpenAI completed the initial architecture and auth flow.",
      "Claude continued from the continuation packet without restarting the task."
    ])
  };
}
