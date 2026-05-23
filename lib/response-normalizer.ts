export type NormalizedProviderResponse = {
  provider: string;
  summary: string;
  completed_steps: string[];
  remaining_steps: string[];
  output: string;
  continuity_state: "not_needed" | "active" | "continued" | "completed";
  finish_reason: "stop" | "length" | "error" | "timeout" | "fallback";
};

export function normalizeProviderResponse(response: Partial<NormalizedProviderResponse>): NormalizedProviderResponse {
  return {
    provider: response.provider ?? "simulation",
    summary: response.summary ?? "",
    completed_steps: response.completed_steps ?? [],
    remaining_steps: response.remaining_steps ?? [],
    output: response.output ?? "",
    continuity_state: response.continuity_state ?? "not_needed",
    finish_reason: response.finish_reason ?? "stop"
  };
}
