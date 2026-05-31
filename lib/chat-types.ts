import type { Accent } from "@/lib/types";

export type ProviderKey = "openai" | "anthropic" | "google" | "gemini" | "ollama" | "simulation";
export type ModelKey = "orbit-auto" | "gpt-4o" | "claude" | "gemini";
export type ChatRole = "user" | "assistant" | "system";

export type ProviderStatusItem = {
  available: boolean;
  defaultModel: string;
  envVar: string;
  label: string;
  note: string;
};

export type ProviderStatus = Record<"openai" | "anthropic" | "google", ProviderStatusItem> & {
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

export type ModelSwitch = {
  fromModel: string;
  toModel: string;
  reason: string;
  contextPreserved: boolean;
  decisionsRestored: number;
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
  pinned: boolean;
  archived: boolean;
  projectId?: string | null;
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
  attachedFiles?: UploadedFileSummary[];
};

export type ChatBootstrap = {
  defaultModel: ModelKey;
  providerStatus: ProviderStatus;
  sessions: ChatSessionSummary[];
  projects: WorkspaceProject[];
};

export type WorkspaceProject = {
  id: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "paused" | "archived";
  createdAt: string;
  updatedAt: string;
  chatCount: number;
  fileCount: number;
  memoryCount: number;
};

export type UploadedFileSummary = {
  id: string;
  sessionId?: string | null;
  projectId?: string | null;
  name: string;
  mimeType: string;
  kind:
    | "pdf"
    | "docx"
    | "txt"
    | "csv"
    | "xlsx"
    | "json"
    | "image"
    | "markdown"
    | "unknown";
  size: number;
  storagePath: string;
  previewText?: string | null;
  summary?: string | null;
  extractedText?: string | null;
  analysisStatus: "queued" | "processing" | "ready" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceSearchResult = {
  id: string;
  category: "chat" | "project" | "file" | "memory";
  title: string;
  excerpt: string;
  href: string;
  updatedAt: string;
};

export type ToolExecutionResult = {
  tool:
    | "web_search"
    | "calculator"
    | "weather"
    | "file_analysis"
    | "image_analysis"
    | "image_generation"
    | "document_writer"
    | "code_assistant";
  connected: boolean;
  summary: string;
  payload?: Record<string, unknown>;
};

export type StreamMetaPayload = {
  assistantMessageId: string;
  modelKey: ModelKey;
  provider: ProviderKey;
  resolvedModel: string | null;
  routeLabel: string;
  fallbackProvider?: ProviderKey | null;
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
  currentModel?: string | null;
  fallbackProvider: ProviderKey | null;
  fallbackModel?: string | null;
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
