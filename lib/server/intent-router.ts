export type XeivoraIntent =
  | "conversational"
  | "factual"
  | "workflow"
  | "coding"
  | "orchestration";

export type XeivoraPromptComplexity = "simple" | "moderate" | "complex";

export type XeivoraIntentRoute = {
  intent: XeivoraIntent;
  complexity: XeivoraPromptComplexity;
  workflowNeeded: boolean;
  workflowKind: "simple_chat" | "continuity" | "coding_continuity";
  directResponsePreferred: boolean;
};

// Runtime implementation lives in `intent-router.js` because the local Express
// server currently runs in CommonJS without a TypeScript loader.
