import type { Accent } from "@/lib/types";

export type ProviderKey = "openai" | "anthropic" | "google" | "gemini" | "ollama" | "simulation";
export type ModelKey = "orbit-auto" | "gpt-4o" | "claude" | "gemini";
export type ChatRole = "user" | "assistant" | "system";
export type IntegrationProvider =
  | "github"
  | "google_drive"
  | "notion"
  | "slack"
  | "gmail"
  | "linear"
  | "jira"
  | "figma";

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
  integrations: IntegrationConnectionSummary[];
};

export type IntegrationConnectionSummary = {
  provider: IntegrationProvider;
  label: string;
  description: string;
  icon: string;
  connected: boolean;
  available: boolean;
  accountLabel?: string | null;
  scopes: string[];
  connectedAt?: string | null;
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

export type WorkspacePreviewVersion = {
  id: string;
  projectId?: string | null;
  sessionId?: string | null;
  versionNumber: number;
  title: string;
  summary: string;
  status: "live" | "approved" | "deploy_ready";
  routePath: string;
  changedFiles: string[];
  notes?: string | null;
  approvedAt?: string | null;
  deployedAt?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type ChatToolExecution = {
  id: string;
  name: string;
  uiLabel: string;
  status: "completed" | "not_connected" | "error" | "running";
  connected: boolean;
  source: "mcp" | "workspace" | "integration";
  summary: string;
  input?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  durationMs?: number;
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

export type StreamToolPayload = {
  assistantMessageId: string;
  executions: ChatToolExecution[];
};

export type StreamDonePayload = {
  session: ChatSession;
  sessions: ChatSessionSummary[];
};

export type StreamEvent =
  | { type: "meta"; payload: StreamMetaPayload }
  | { type: "tool"; payload: StreamToolPayload }
  | { type: "orchestration"; payload: StreamOrchestrationPayload }
  | { type: "continuity"; payload: StreamContinuityPayload }
  | { type: "delta"; payload: { text: string } }
  | { type: "done"; payload: StreamDonePayload }
  | { type: "error"; payload: { message: string } };
