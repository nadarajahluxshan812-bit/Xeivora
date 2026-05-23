export type ProviderChoice = {
  primary: "openai" | "anthropic" | "google" | "simulation";
  fallback: "openai" | "anthropic" | "google" | "simulation";
  chain: Array<"openai" | "anthropic" | "google" | "simulation">;
};

export function routeProviderForContinuity(providerAvailability: {
  openai: boolean;
  anthropic: boolean;
  google: boolean;
}): ProviderChoice {
  const chain: ProviderChoice["chain"] = ["openai", "anthropic", "google", "simulation"];
  const primary = providerAvailability.openai ? "openai" : providerAvailability.anthropic ? "anthropic" : providerAvailability.google ? "google" : "simulation";
  const fallback = primary === "openai" && providerAvailability.anthropic
    ? "anthropic"
    : primary !== "google" && providerAvailability.google
      ? "google"
      : "simulation";

  return { primary, fallback, chain };
}
