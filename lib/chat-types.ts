import type { Accent } from "@/lib/types";

export type ProviderKey = "openai" | "anthropic" | "google" | "simulation";
export type ModelKey = "orbit-auto" | "gpt-4o" | "claude" | "gemini";
export type ChatRole = "user" | "assistant" | "system";

export type ProviderStatusItem = {
  available: boolean;
  defaultModel: string;
  envVar: string;
  label: string;
  note: string;
};

export type ProviderStatus = Record<Exclude<ProviderKey, "simulation">, ProviderStatusItem> & {
  persistence?: ProviderStatusItem;
};

export type ModelOption = {
  key: ModelKey;
  label: string;
  vendor: string;
  description: string;
  accent: Accent;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  modelKey?: ModelKey;
  provider?: ProviderKey;
};

export type ChatSessionSummary = {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  modelPreference: ModelKey;
  lastProvider: ProviderKey;
  routeLabel: string;
};

export type ChatMemoryCard = {
  id: string;
  label: string;
  detail: string;
  accent: Accent;
};

export type OrchestrationStep = {
  id: string;
  label: string;
  detail: string;
  state: "pending" | "active" | "complete";
  accent: Accent;
};

export type ChatSession = ChatSessionSummary & {
  messages: ChatMessage[];
  routeLabel: string;
  memoryCards: ChatMemoryCard[];
};

export type ChatBootstrap = {
  defaultModel: ModelKey;
  providerStatus: ProviderStatus;
  sessions: ChatSessionSummary[];
};

export type StreamMetaPayload = {
  assistantMessageId: string;
  modelKey: ModelKey;
  provider: ProviderKey;
  resolvedModel: string;
  routeLabel: string;
  intent?: string;
  complexity?: "simple" | "moderate" | "complex";
  workflowMode?: "simple_chat" | "continuity" | "coding_continuity";
  showContinuityPanel?: boolean;
};

export type StreamOrchestrationPayload = {
  provider: ProviderKey;
  routeLabel: string;
  steps: OrchestrationStep[];
};

export type StreamContinuityPayload = {
  currentProvider: ProviderKey;
  fallbackProvider: ProviderKey;
  providerChain: ProviderKey[];
  tokenRateStatus: string;
  checkpointSaved: boolean;
  contextCompressed: boolean;
  memoryPreserved: boolean;
  continuityActive: boolean;
  contextLossPercentage: number;
  finalProviderChain: ProviderKey[];
};

export type StreamDonePayload = {
  session: ChatSession;
  sessions: ChatSessionSummary[];
};

export type StreamEvent =
  | { type: "meta"; payload: StreamMetaPayload }
  | { type: "orchestration"; payload: StreamOrchestrationPayload }
  | { type: "continuity"; payload: StreamContinuityPayload }
  | { type: "delta"; payload: { text: string } }
  | { type: "done"; payload: StreamDonePayload }
  | { type: "error"; payload: { message: string } };
