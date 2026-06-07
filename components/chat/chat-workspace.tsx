"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUp,
  AudioLines,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Command,
  Copy,
  Download,
  Ellipsis,
  ExternalLink,
  Folder,
  FolderOpen,
  FileText,
  FolderKanban,
  FolderPlus,
  GraduationCap,
  Heart,
  Keyboard,
  Laptop,
  LoaderCircle,
  LogOut,
  MessageSquareText,
  Mic,
  Moon,
  PanelLeft,
  Paperclip,
  Pencil,
  Plane,
  PlugZap,
  Plus,
  RefreshCcw,
  Search,
  Save,
  Settings2,
  Share2,
  Square,
  Star,
  Sun,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Volume2,
  Workflow,
  X
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode, RefObject } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { MessageErrorBoundary } from "@/components/chat/message-error-boundary";
import { OrbitLogo, XeivoraGlyph } from "@/components/orbit-logo";
import { ThemeToggleButton } from "@/components/theme/theme-toggle-button";
import { useXeivoraTheme } from "@/components/theme/theme-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PreviewSideTab, type PreviewSideTabKey } from "@/components/chat/preview-side-tabs";
import { ProjectWorkspaceTabs } from "@/components/workspace/project-workspace-tabs";
import { useElectron, type DesktopFileNode } from "@/hooks/useElectron";
import type { AuthUser } from "@/lib/auth-types";
import type {
  ChatBootstrap,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ChatToolExecution,
  IntegrationConnectionSummary,
  IntegrationProvider,
  ModelKey,
  OrchestrationStep,
  ProviderKey,
  ProviderStatus,
  StreamContinuityPayload,
  StreamEvent,
  UploadedFileSummary,
  WorkspacePreviewPayload,
  WorkspacePreviewVersion,
  WorkspaceProject
} from "@/lib/chat-types";
import { cn } from "@/lib/utils";

const workspaceName = "Xeivora";
const coralAccent = "var(--xv-chat-accent)";

const navItems: SidebarItem[] = [
  { label: "Chats", icon: MessageSquareText, href: "/chat" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard" },
  { label: "Project Memory", icon: BrainCircuit, href: "/memory" },
  { label: "Workflows", icon: Workflow, href: "/workflows", soon: true },
  { label: "Agents", icon: Bot, href: "/agents", soon: true },
  { label: "Simulate", icon: Target, href: "/simulate", soon: true },
  { label: "Integrations", icon: PlugZap, href: "/integrations", soon: true },
  { label: "Settings", icon: Settings2, href: "/settings" }
];

const modelPickerOptions = [
  {
    id: "auto",
    modelKey: "orbit-auto" as ModelKey,
    label: "Auto (Xeivora chooses)",
    shortLabel: "Xeivora",
    description: "Best overall routing for continuity and speed",
    dotColor: coralAccent,
    tier: "balanced"
  },
  {
    id: "claude-sonnet",
    modelKey: "claude" as ModelKey,
    label: "Claude Sonnet",
    shortLabel: "Claude Sonnet",
    description: "Best for complex reasoning",
    dotColor: "#f59e0b",
    tier: "balanced"
  },
  {
    id: "claude-opus",
    modelKey: "claude" as ModelKey,
    label: "Claude Opus",
    shortLabel: "Claude Opus",
    description: "Most powerful for long-form thinking",
    dotColor: "#ef4444",
    tier: "powerful"
  },
  {
    id: "gpt-4o",
    modelKey: "gpt-4o" as ModelKey,
    label: "GPT-4o",
    shortLabel: "GPT-4o",
    description: "Best for coding and general work",
    dotColor: "#16a34a",
    tier: "fast"
  },
  {
    id: "gpt-4o-mini",
    modelKey: "gpt-4o" as ModelKey,
    label: "GPT-4o Mini",
    shortLabel: "GPT-4o Mini",
    description: "Fastest for everyday tasks",
    dotColor: "#16a34a",
    tier: "fast"
  },
  {
    id: "gemini-2.5-pro",
    modelKey: "gemini" as ModelKey,
    label: "Gemini 2.5 Pro",
    shortLabel: "Gemini Pro",
    description: "Strong for research and synthesis",
    dotColor: "#f59e0b",
    tier: "balanced"
  },
  {
    id: "gemini-2.5-flash",
    modelKey: "gemini" as ModelKey,
    label: "Gemini 2.5 Flash",
    shortLabel: "Gemini Flash",
    description: "Fast for quick answers",
    dotColor: "#16a34a",
    tier: "fast"
  },
  {
    id: "deepseek-r1",
    modelKey: "orbit-auto" as ModelKey,
    label: "DeepSeek R1",
    shortLabel: "DeepSeek R1",
    description: "Reasoning-first fallback mode",
    dotColor: "#ef4444",
    tier: "powerful"
  }
] as const;

type SidebarItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  soon?: boolean;
};

type ModelPickerOption = (typeof modelPickerOptions)[number];
type ModelPickerId = ModelPickerOption["id"];

type ContinuityState = StreamContinuityPayload;
type VoiceState = "idle" | "listening" | "processing";
type WorkflowMode = "simple_chat" | "continuity" | "coding_continuity";
type DesktopSaveState = "idle" | "saving" | "saved" | "error";
type DesktopApplyDraft = {
  currentContent: string;
  messageId: string;
  nextContent: string;
  targetPath: string;
};

function hasProjectContinuity(project: WorkspaceProject) {
  return (
    Number(project.chatCount || 0) > 0 ||
    Number(project.fileCount || 0) > 0 ||
    Number(project.memoryCount || 0) > 0
  );
}
type DesktopCommandResult = {
  command: string;
  error?: string | null;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  success: boolean;
};

type ImageIntent = {
  count: number;
  imagePrompt: string;
  isImageAndText: boolean;
  isImageOnly: boolean;
  isImageRequest: boolean;
  textPrompt: string | null;
};

type ExecutionImage = {
  id: string;
  revisedPrompt: string;
  url: string;
};

const chatTheme = {
  "--xeivora-coral": coralAccent,
  "--xv-chat-bg": "var(--site-bg)",
  "--xv-chat-surface": "var(--site-card)",
  "--xv-chat-surface-soft": "var(--site-card-soft)",
  "--xv-chat-sidebar": "var(--site-panel)",
  "--xv-chat-border": "var(--site-border)",
  "--xv-chat-border-strong": "var(--site-border-strong)",
  "--xv-chat-text": "var(--site-text)",
  "--xv-chat-muted": "var(--site-subtle)",
  "--xv-chat-accent": "var(--site-accent)",
  "--xv-chat-code-bg": "var(--site-card)",
  "--xv-chat-code-header-bg": "var(--site-card-soft)",
  "--xv-chat-code-border": "var(--site-border)",
  "--xv-chat-code-text": "var(--site-text)",
  "--xv-chat-inline-code-bg": "var(--site-accent-soft)",
  "--xv-chat-inline-code-text": "var(--site-text)",
  "--xv-chat-ghost-bg": "var(--site-ghost-bg)",
  "--xv-chat-ghost-bg-hover": "var(--site-ghost-hover)",
  "--xv-chat-ghost-text": "var(--site-subtle)",
  "--xv-chat-shadow": "0 12px 30px rgba(0, 0, 0, 0.28)"
} as CSSProperties;

export function ChatWorkspace({ viewer = null }: { viewer?: AuthUser | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resolvedTheme, toggleTheme } = useXeivoraTheme();
  const {
    activeFile,
    activeFileContent,
    completeFirstLaunch,
    fileTree,
    fileTreeLoading,
    firstLaunchComplete,
    folderLabel,
    isDesktop,
    openFileInEditor,
    openFolder,
    openFolderPath,
    readFileForAI,
    runCommand,
    saveFile,
    setActiveFile,
    setActiveFileContent
  } = useElectron();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnectionSummary[]>([]);
  const [enabledIntegrationProviders, setEnabledIntegrationProviders] = useState<IntegrationProvider[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [sessionFiles, setSessionFiles] = useState<UploadedFileSummary[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("orbit-auto");
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [orchestrationSteps, setOrchestrationSteps] = useState<OrchestrationStep[]>([]);
  const [routeLabel, setRouteLabel] = useState("Xeivora is ready");
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("simulation");
  const [thinking, setThinking] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showContinuityPanel, setShowContinuityPanel] = useState(false);
  const [sessionMenuOpenId, setSessionMenuOpenId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState("");
  const [projectMenuSessionId, setProjectMenuSessionId] = useState<string | null>(null);
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedModelPreset, setSelectedModelPreset] = useState<ModelPickerId>("auto");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageFeedback, setMessageFeedback] = useState<Record<string, "good" | "bad">>({});
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("simple_chat");
  const [modelPulseActive, setModelPulseActive] = useState(false);
  const [toolExecutionsByMessageId, setToolExecutionsByMessageId] = useState<Record<string, ChatToolExecution[]>>({});
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);
  const [livePreviewContext, setLivePreviewContext] = useState<{ projectId: string | null; sessionId: string | null }>({
    projectId: null,
    sessionId: null
  });
  const [livePreviewVersions, setLivePreviewVersions] = useState<WorkspacePreviewVersion[]>([]);
  const [livePreviewLoading, setLivePreviewLoading] = useState(false);
  const [livePreviewInitializing, setLivePreviewInitializing] = useState(false);
  const [livePreviewError, setLivePreviewError] = useState<string | null>(null);
  const [livePreviewRefreshKey, setLivePreviewRefreshKey] = useState(0);
  const [livePreviewUpdatingId, setLivePreviewUpdatingId] = useState<string | null>(null);
  const [livePreviewSavingVersion, setLivePreviewSavingVersion] = useState(false);
  const [livePreviewFrameLoading, setLivePreviewFrameLoading] = useState(false);
  const [livePreviewFrameError, setLivePreviewFrameError] = useState<string | null>(null);
  const [livePreviewWidth, setLivePreviewWidth] = useState<number | null>(null);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [desktopExpandedFolders, setDesktopExpandedFolders] = useState<Record<string, boolean>>({});
  const [desktopSaveState, setDesktopSaveState] = useState<DesktopSaveState>("idle");
  const [desktopApplyDraft, setDesktopApplyDraft] = useState<DesktopApplyDraft | null>(null);
  const [desktopCommandOpen, setDesktopCommandOpen] = useState(false);
  const [desktopCommandInput, setDesktopCommandInput] = useState("");
  const [desktopCommandRunning, setDesktopCommandRunning] = useState(false);
  const [desktopCommandResult, setDesktopCommandResult] = useState<DesktopCommandResult | null>(null);
  const [continuityStatus, setContinuityStatus] = useState<ContinuityState>({
    currentProvider: "simulation",
    currentModel: null,
    fallbackProvider: null,
    fallbackModel: null,
    providerChain: ["anthropic", "openai", "google", "ollama", "simulation"],
    tokenRateStatus: "ready",
    checkpointSaved: false,
    contextCompressed: false,
    memoryPreserved: true,
    continuityActive: true,
    contextLossPercentage: 0,
    finalProviderChain: ["simulation"]
  });

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const activeProviderRef = useRef<ProviderKey>("simulation");
  const persistedPreviewSignatureRef = useRef<string | null>(null);
  const hydratedPreviewSignatureRef = useRef<string | null>(null);

  const messages = activeSession?.messages ?? [];
  const hasMessages = messages.length > 0;
  const viewerName = viewer?.name || "Nadarajah Luxshan";
  const viewerEmail = viewer?.email || "luxshan@xeivora.com";
  const filteredSessions = useMemo(() => sessions, [sessions]);
  const groupedSessions = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);
  const connectedIntegrations = useMemo(
    () => integrations.filter((integration) => integration.connected),
    [integrations]
  );
  const lastAssistantMessage = useMemo(
    () => messages.filter((message) => message.role === "assistant").slice(-1)[0] || null,
    [messages]
  );
  const latestLivePreview = livePreviewVersions[0] || null;
  const livePreviewDraftPayload = useMemo(() => {
    if (!livePreviewOpen || !lastAssistantMessage?.content) {
      return null;
    }

    return extractPreviewPayloadFromContent(
      lastAssistantMessage.content,
      getLastUserPrompt(activeSession)
    );
  }, [activeSession, lastAssistantMessage?.content, livePreviewOpen]);
  const effectiveLivePreviewPayload = livePreviewDraftPayload || latestLivePreview?.previewPayload || null;
  const currentModelSummary = continuityStatus.memoryPreserved ? "Project memory active" : "Project memory syncing";
  const fallbackSummary = latestLivePreview ? `Preview v${latestLivePreview.versionNumber}` : "Preview standby";
  const systemIndicatorLive =
    showContinuityPanel || workflowMode !== "simple_chat" || continuityStatus.checkpointSaved || isStreaming;
  const connectedProviders = useMemo(() => {
    if (!providerStatus) {
      return 0;
    }

    return Object.values(providerStatus).filter((provider) => provider?.available).length;
  }, [providerStatus]);
  const topbarModel = getTopbarModelMeta(
    selectedModelPreset,
    continuityStatus.currentProvider === "simulation" ? selectedModel : providerToModelKey(continuityStatus.currentProvider),
    continuityStatus.currentModel
  );
  const topbarTitle =
    activeSession?.title && activeSession.title.trim() !== "New Xeivora chat"
      ? activeSession.title
      : selectedProjectId
        ? `Continue ${projects.find((project) => project.id === selectedProjectId)?.name || "Project"}`
        : "Continue project";
  const workspaceProjectId = selectedProjectId || activeSession?.projectId || projects[0]?.id || null;
  const livePreviewProjectId = livePreviewContext.projectId || workspaceProjectId;
  const livePreviewSessionId = livePreviewContext.sessionId || activeSession?.id || null;
  // Only treat the project as "linked" when the chat is genuinely attached to one,
  // so the preview never mislabels itself with the default seed project.
  const linkedPreviewProjectId = livePreviewContext.projectId || activeSession?.projectId || null;
  const previewDisplayName =
    projects.find((project) => project.id === linkedPreviewProjectId)?.name || "Live Preview";
  const livePreviewDocked = livePreviewOpen && viewportWidth >= 1280;
  const livePreviewSheetSide = viewportWidth >= 768 ? "right" : "bottom";
  // Resizable chat/preview split. Default is 60% chat / 40% preview, draggable between ~25% and ~75%.
  const previewContentWidth = Math.max((viewportWidth || 1280) - 260, 320);
  const livePreviewDesktopWidth = Math.min(
    Math.max(livePreviewWidth ?? Math.round(previewContentWidth * 0.4), 360),
    Math.round(previewContentWidth * 0.75)
  );
  const showDesktopFilePreview = isDesktop && Boolean(activeFile) && !livePreviewDocked;

  useEffect(() => {
    if (!isResizingPreview) {
      return;
    }
    function handleMove(event: MouseEvent) {
      setLivePreviewWidth(window.innerWidth - event.clientX);
    }
    function handleUp() {
      setIsResizingPreview(false);
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      document.body.style.userSelect = previousUserSelect;
    };
  }, [isResizingPreview]);

  // Restore the saved divider width on load, and persist it whenever it changes.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("xeivora:preview-width");
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        setLivePreviewWidth(parsed);
      }
    } catch {
      // Ignore storage access issues (private mode, disabled storage).
    }
  }, []);

  useEffect(() => {
    if (livePreviewWidth == null) {
      return;
    }
    try {
      window.localStorage.setItem("xeivora:preview-width", String(Math.round(livePreviewWidth)));
    } catch {
      // Ignore storage write failures.
    }
  }, [livePreviewWidth]);

  const searchResults = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) {
      return sessions.slice(0, 12);
    }

    return sessions.filter((session) =>
      [session.title, session.preview]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [searchQuery, sessions]);

  useEffect(() => {
    setModelPulseActive(true);
    const timeout = window.setTimeout(() => setModelPulseActive(false), 900);
    return () => window.clearTimeout(timeout);
  }, [topbarModel.label, topbarModel.dotColor]);

  useEffect(() => {
    if (openFolderPath) {
      setDesktopExpandedFolders((current) => ({
        ...current,
        [openFolderPath]: true
      }));
    }
  }, [openFolderPath]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);

    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  useEffect(() => {
    if (!livePreviewOpen) {
      return;
    }

    const resolvedProjectId = livePreviewContext.projectId || workspaceProjectId;
    const resolvedSessionId = livePreviewContext.sessionId || activeSession?.id || null;

    if (
      resolvedProjectId !== livePreviewContext.projectId ||
      resolvedSessionId !== livePreviewContext.sessionId
    ) {
      setLivePreviewContext({
        projectId: resolvedProjectId,
        sessionId: resolvedSessionId
      });
    }
  }, [
    activeSession?.id,
    livePreviewContext.projectId,
    livePreviewContext.sessionId,
    livePreviewOpen,
    workspaceProjectId
  ]);

  useEffect(() => {
    if (!livePreviewOpen || (!livePreviewProjectId && !livePreviewSessionId)) {
      return undefined;
    }

    void loadLivePreviews(livePreviewProjectId, livePreviewSessionId);
    const interval = window.setInterval(() => {
      void loadLivePreviews(livePreviewProjectId, livePreviewSessionId, { silent: true });
    }, 4000);

    return () => window.clearInterval(interval);
  }, [livePreviewOpen, livePreviewProjectId, livePreviewSessionId]);

  useEffect(() => {
    if (!effectiveLivePreviewPayload) {
      setLivePreviewFrameLoading(false);
      return;
    }

    setLivePreviewFrameError(null);
    setLivePreviewFrameLoading(effectiveLivePreviewPayload.renderMode === "browser");
  }, [effectiveLivePreviewPayload?.srcDoc, effectiveLivePreviewPayload?.reason, effectiveLivePreviewPayload?.renderMode, livePreviewRefreshKey]);

  useEffect(() => {
    if (!livePreviewOpen || !effectiveLivePreviewPayload || latestLivePreview || !lastAssistantMessage?.id) {
      return undefined;
    }

    if (!livePreviewProjectId && !livePreviewSessionId) {
      return undefined;
    }

    const signature = JSON.stringify({
      projectId: livePreviewProjectId,
      sessionId: livePreviewSessionId,
      messageId: lastAssistantMessage.id,
      payload: effectiveLivePreviewPayload
    });

    if (hydratedPreviewSignatureRef.current === signature) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      hydratedPreviewSignatureRef.current = signature;
      setLivePreviewFrameError(null);

      void (async () => {
        try {
          const params = new URLSearchParams();
          if (livePreviewProjectId) {
            params.set("projectId", livePreviewProjectId);
          }
          if (livePreviewSessionId) {
            params.set("sessionId", livePreviewSessionId);
          }
          params.set("limit", "1");

          const existingResponse = await fetch(`/api/previews?${params.toString()}`, { cache: "no-store" });
          if (!existingResponse.ok) {
            throw new Error("Xeivora could not load the latest preview checkpoints.");
          }

          const existingPayload = (await existingResponse.json()) as WorkspacePreviewVersion[];
          const existingPreview = Array.isArray(existingPayload) ? existingPayload[0] || null : null;

          if (existingPreview) {
            const needsPayloadRefresh =
              JSON.stringify(existingPreview.previewPayload || null) !== JSON.stringify(effectiveLivePreviewPayload);

            if (!needsPayloadRefresh) {
              setLivePreviewVersions((current) => mergePreviewVersions(current, [existingPreview]));
              setLivePreviewInitializing(false);
              setLivePreviewError(null);
              return;
            }

            const patchResponse = await fetch(`/api/previews/${existingPreview.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                previewPayload: effectiveLivePreviewPayload,
                summary: "Preview checkpoint created"
              })
            });

            if (!patchResponse.ok) {
              throw new Error("Xeivora could not attach this live preview checkpoint.");
            }

            const updatedPreview = (await patchResponse.json()) as WorkspacePreviewVersion;
            setLivePreviewVersions((current) => mergePreviewVersions(current, [updatedPreview]));
            setLivePreviewInitializing(false);
            setLivePreviewError(null);
            return;
          }

          const createResponse = await fetch("/api/previews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              projectId: livePreviewProjectId,
              sessionId: livePreviewSessionId,
              title: "Preview checkpoint",
              summary: "Preview checkpoint created",
              routePath: "/",
              changedFiles: [],
              previewPayload: effectiveLivePreviewPayload
            })
          });

          if (!createResponse.ok) {
            throw new Error("Xeivora could not create this live preview checkpoint.");
          }

          const createdPreview = (await createResponse.json()) as WorkspacePreviewVersion;
          setLivePreviewVersions((current) => mergePreviewVersions(current, [createdPreview]));
          setLivePreviewInitializing(false);
          setLivePreviewError(null);
        } catch (nextError) {
          hydratedPreviewSignatureRef.current = null;
          setLivePreviewError(
            nextError instanceof Error ? nextError.message : "Xeivora could not create this live preview checkpoint."
          );
        }
      })();
    }, isStreaming ? 350 : 40);

    return () => window.clearTimeout(timer);
  }, [
    effectiveLivePreviewPayload,
    isStreaming,
    lastAssistantMessage?.id,
    latestLivePreview,
    livePreviewOpen,
    livePreviewProjectId,
    livePreviewSessionId
  ]);

  useEffect(() => {
    if (!livePreviewOpen || !latestLivePreview || !lastAssistantMessage?.id || !effectiveLivePreviewPayload) {
      return undefined;
    }

    const signature = JSON.stringify({
      previewId: latestLivePreview.id,
      messageId: lastAssistantMessage.id,
      payload: effectiveLivePreviewPayload
    });

    if (persistedPreviewSignatureRef.current === signature) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      persistedPreviewSignatureRef.current = signature;
      void (async () => {
        try {
          const response = await fetch(`/api/previews/${latestLivePreview.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              previewPayload: effectiveLivePreviewPayload,
              summary: "Preview checkpoint created"
            })
          });

          if (!response.ok) {
            throw new Error("Xeivora could not attach this live preview checkpoint.");
          }

          const updated = (await response.json()) as WorkspacePreviewVersion;
          setLivePreviewVersions((current) => mergePreviewVersions(current, [updated]));
          setLivePreviewError(null);
        } catch (nextError) {
          persistedPreviewSignatureRef.current = null;
          setLivePreviewError(
            nextError instanceof Error ? nextError.message : "Xeivora could not attach this live preview checkpoint."
          );
        }
      })();
    }, isStreaming ? 450 : 80);

    return () => window.clearTimeout(timer);
  }, [
    effectiveLivePreviewPayload,
    isStreaming,
    lastAssistantMessage?.id,
    latestLivePreview,
    livePreviewOpen
  ]);

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined" || !window.xeivora) {
      return undefined;
    }

    const removeNewChatListener = window.xeivora.onNewChat(() => {
      void handleNewChat();
    });
    const removeNavigateListener = window.xeivora.onNavigate((href: string) => {
      router.push(href);
    });

    return () => {
      removeNewChatListener?.();
      removeNavigateListener?.();
    };
  }, [isDesktop, router]);

  useEffect(() => {
    void bootstrapWorkspace().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Xeivora.");
    });
  }, []);

  useEffect(() => {
    const sessionId = searchParams.get("session");
    const projectId = searchParams.get("project");
    const shouldOpenPreviewFromQuery = searchParams.get("preview") === "1";
    if (sessionId) {
      void loadSession(sessionId).catch(() => {
        // Ignore deep-link load failures and keep the workspace usable.
      });
    }
    if (!sessionId && projectId) {
      setSelectedProjectId(projectId);
    }
    if (shouldOpenPreviewFromQuery) {
      openLivePreview({
        projectId,
        sessionId
      });
    }
  }, [searchParams]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length, lastAssistantMessage?.content, isStreaming]);

  useEffect(() => {
    if (!composerRef.current) {
      return;
    }

    composerRef.current.style.height = "0px";
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 100)}px`;
  }, [prompt]);

  useEffect(() => {
    if (!sessionMenuOpenId && !statusOpen && !projectMenuSessionId && !profileMenuOpen && !modelMenuOpen) {
      return;
    }

    function handleClose() {
      setSessionMenuOpenId(null);
      setStatusOpen(false);
      setProjectMenuSessionId(null);
      setProfileMenuOpen(false);
      setModelMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSessionMenuOpenId(null);
        setStatusOpen(false);
        setProjectMenuSessionId(null);
        setProfileMenuOpen(false);
        setModelMenuOpen(false);
      }
    }

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [modelMenuOpen, profileMenuOpen, projectMenuSessionId, sessionMenuOpenId, statusOpen]);

  useEffect(() => {
    function handleShortcuts(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;

      if (isModifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setSearchQuery("");
        setSessionMenuOpenId(null);
        setProjectMenuSessionId(null);
        setProfileMenuOpen(false);
        setModelMenuOpen(false);
      }

      if (isModifier && event.key.toLowerCase() === "n") {
        event.preventDefault();
        void handleNewChat();
      }

      if (isModifier && event.key === ",") {
        event.preventDefault();
        router.push("/settings");
      }

      if (isModifier && event.key === "/") {
        event.preventDefault();
        setShortcutsOpen(true);
      }

      if (event.key === "Escape") {
        setShortcutsOpen(false);
        setSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [router, searchOpen]);

  async function bootstrapWorkspace() {
    const response = await fetch("/api/chat/bootstrap", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load Xeivora workspace.");
    }

    const bootstrap = (await response.json()) as ChatBootstrap;

    startTransition(() => {
      setSessions(bootstrap.sessions);
      setProviderStatus(bootstrap.providerStatus);
      setSelectedModel(bootstrap.defaultModel);
      setSelectedModelPreset(modelKeyToPresetId(bootstrap.defaultModel));
      setProjects(bootstrap.projects);
      setIntegrations(bootstrap.integrations || []);
      setEnabledIntegrationProviders(
        (bootstrap.integrations || [])
          .filter((integration) => integration.connected)
          .map((integration) => integration.provider)
      );
    });
  }

  function handleToggleIntegration(provider: IntegrationProvider) {
    setEnabledIntegrationProviders((current) =>
      current.includes(provider) ? current.filter((entry) => entry !== provider) : [...current, provider]
    );
  }

  function openLivePreview(next?: { projectId?: string | null; sessionId?: string | null }) {
    setLivePreviewContext({
      projectId: next?.projectId ?? workspaceProjectId ?? null,
      sessionId: next?.sessionId ?? activeSession?.id ?? null
    });
    setLivePreviewOpen(true);
    setLivePreviewError(null);
  }

  async function loadLivePreviews(
    projectId = livePreviewProjectId,
    sessionId = livePreviewSessionId,
    options: { silent?: boolean } = {}
  ) {
    if (!projectId && !sessionId) {
      setLivePreviewVersions([]);
      setLivePreviewLoading(false);
      return;
    }

    if (!options.silent) {
      setLivePreviewLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (projectId) {
        params.set("projectId", projectId);
      }
      if (sessionId) {
        params.set("sessionId", sessionId);
      }
      params.set("limit", "24");

      const response = await fetch(`/api/previews?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Xeivora could not load the latest preview checkpoints.");
      }

      const payload = (await response.json()) as WorkspacePreviewVersion[];
      const nextVersions = Array.isArray(payload) ? payload : [];
      setLivePreviewVersions(nextVersions);
      if (nextVersions.length > 0) {
        setLivePreviewInitializing(!Boolean(nextVersions[0]?.previewPayload));
      }
      setLivePreviewError(null);
    } catch (nextError) {
      setLivePreviewError(
        nextError instanceof Error ? nextError.message : "Xeivora could not load the latest preview checkpoints."
      );
    } finally {
      if (!options.silent) {
        setLivePreviewLoading(false);
      }
    }
  }

  async function updateLivePreviewStatus(previewId: string, status: WorkspacePreviewVersion["status"]) {
    setLivePreviewUpdatingId(previewId);
    try {
      const response = await fetch(`/api/previews/${previewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          approvedAt: status === "approved" ? new Date().toISOString() : undefined,
          deployedAt: status === "deploy_ready" ? new Date().toISOString() : undefined
        })
      });

      if (!response.ok) {
        throw new Error("Xeivora could not update this preview checkpoint.");
      }

      const updated = (await response.json()) as WorkspacePreviewVersion;
      setLivePreviewVersions((current) => mergePreviewVersions(current, [updated]));
      setLivePreviewError(null);
    } catch (nextError) {
      setLivePreviewError(
        nextError instanceof Error ? nextError.message : "Xeivora could not update this preview checkpoint."
      );
    } finally {
      setLivePreviewUpdatingId(null);
    }
  }

  async function saveLivePreviewVersion() {
    if (!latestLivePreview) {
      return;
    }

    setLivePreviewSavingVersion(true);
    try {
      const response = await fetch("/api/previews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: latestLivePreview.projectId,
          sessionId: latestLivePreview.sessionId,
          title: latestLivePreview.title,
          summary: latestLivePreview.summary,
          routePath: latestLivePreview.routePath,
          changedFiles: latestLivePreview.changedFiles,
          previewPayload: effectiveLivePreviewPayload || latestLivePreview.previewPayload || null,
          notes: latestLivePreview.notes
        })
      });

      if (!response.ok) {
        throw new Error("Xeivora could not save a new preview version.");
      }

      const saved = (await response.json()) as WorkspacePreviewVersion;
      setLivePreviewVersions((current) => mergePreviewVersions(current, [saved]));
      setLivePreviewError(null);
    } catch (nextError) {
      setLivePreviewError(
        nextError instanceof Error ? nextError.message : "Xeivora could not save a new preview version."
      );
    } finally {
      setLivePreviewSavingVersion(false);
    }
  }

  function openPreviewInNewTab(
    preview: WorkspacePreviewVersion,
    payload: WorkspacePreviewPayload | null
  ) {
    if (typeof window === "undefined") {
      return;
    }

    const nextWindow = window.open("", "_blank", "noopener,noreferrer");
    if (nextWindow) {
      nextWindow.document.open();
      nextWindow.document.write(
        buildPreviewExternalDocument(
          preview,
          payload,
          "Preview could not render this output."
        )
      );
      nextWindow.document.close();
      return;
    }

    if (preview.routePath) {
      window.open(preview.routePath, "_blank", "noopener,noreferrer");
    }
  }

  async function handleRegenerateImageExecution(
    messageId: string,
    executionId: string,
    nextPrompt: string,
    count = 1
  ) {
    const cleanPrompt = `${nextPrompt || ""}`.trim();
    const safeCount = Math.min(4, Math.max(1, Number.parseInt(`${count || 1}`, 10) || 1));

    if (!cleanPrompt) {
      return;
    }

    setToolExecutionsByMessageId((current) => ({
      ...current,
      [messageId]: (current[messageId] || []).map((execution) =>
        execution.id === executionId
          ? {
              ...execution,
              status: "running",
              connected: true,
              summary: "Generating your image...",
              payload: {
                ...execution.payload,
                prompt: cleanPrompt,
                count: safeCount,
                images: [],
                loading: true
              }
            }
          : execution
      )
    }));

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanPrompt,
          count: safeCount
        })
      });

      const result = await response.json().catch(() => ({}));

      setToolExecutionsByMessageId((current) => ({
        ...current,
        [messageId]: (current[messageId] || []).map((execution) =>
          execution.id === executionId
            ? {
                ...execution,
                status: result?.connected ? "completed" : "error",
                connected: Boolean(result?.connected),
                summary: result?.connected
                  ? `Generated ${result.images?.length || safeCount} image${result.images?.length === 1 ? "" : "s"} with ${result.modelLabel || result.model || "DALL-E 3"}.`
                  : result?.message || "Xeivora could not generate the image right now.",
                payload: {
                  ...execution.payload,
                  images: Array.isArray(result?.images) ? result.images : [],
                  prompt: cleanPrompt,
                  count: result?.count || safeCount,
                  model: result?.model || null,
                  modelLabel: result?.modelLabel || result?.model || "DALL-E 3",
                  provider: result?.provider || "openai",
                  attempts: Array.isArray(result?.attempts) ? result.attempts : [],
                  dailyLimit: result?.dailyLimit,
                  remaining: result?.remaining,
                  usedToday: result?.usedToday,
                  loading: false
                }
              }
            : execution
        )
      }));
    } catch (nextError) {
      setToolExecutionsByMessageId((current) => ({
        ...current,
        [messageId]: (current[messageId] || []).map((execution) =>
          execution.id === executionId
            ? {
                ...execution,
                status: "error",
                connected: false,
                summary:
                  nextError instanceof Error ? nextError.message : "Xeivora could not generate the image right now.",
                payload: {
                  ...execution.payload,
                  prompt: cleanPrompt,
                  count: safeCount,
                  loading: false
                }
              }
            : execution
        )
      }));
    }
  }

  async function loadSession(sessionId: string) {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load the selected conversation.");
    }

    const session = (await response.json()) as ChatSession;
    startTransition(() => {
      setActiveSession(session);
      setSessionFiles(session.attachedFiles ?? []);
      setSelectedModel(session.modelPreference);
      setSelectedModelPreset(modelKeyToPresetId(session.modelPreference));
      setSelectedProjectId(session.projectId ?? null);
      setRouteLabel(toXeivoraLabel(session.routeLabel));
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setError(null);
      setMobileSidebarOpen(false);
      setSessionMenuOpenId(null);
      setEditingSessionId(null);
      setProjectMenuSessionId(null);
    });
  }

  async function createSession() {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelPreference: selectedModel, projectId: selectedProjectId })
    });

    if (!response.ok) {
      throw new Error("Unable to create a new chat.");
    }

    const payload = (await response.json()) as {
      session: ChatSession;
      sessions: ChatSessionSummary[];
      providerStatus: ProviderStatus;
    };

    startTransition(() => {
      setSessions(payload.sessions);
      setProviderStatus(payload.providerStatus);
      setActiveSession(payload.session);
      setSessionFiles(payload.session.attachedFiles ?? []);
      setSelectedModelPreset(modelKeyToPresetId(payload.session.modelPreference));
      setSelectedProjectId(payload.session.projectId ?? null);
      setRouteLabel("Xeivora is ready");
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setMobileSidebarOpen(false);
      setSessionMenuOpenId(null);
      setEditingSessionId(null);
      setProjectMenuSessionId(null);
    });

    composerRef.current?.focus();
    return payload.session;
  }

  async function handleNewChat() {
    setError(null);
    setPrompt("");
    setActiveSession(null);
    setSessionFiles([]);
    setSelectedProjectId(null);
    setRouteLabel("Xeivora is ready");
    setOrchestrationSteps([]);
    setShowContinuityPanel(false);
    setWorkflowMode("simple_chat");
    setMobileSidebarOpen(false);
    setSessionMenuOpenId(null);
    setEditingSessionId(null);
    setProjectMenuSessionId(null);
    setShareFeedback(null);
    composerRef.current?.focus();
  }

  async function handleRenameSession(sessionId: string) {
    try {
      const nextTitle = editingSessionTitle.trim();
      const session = sessions.find((candidate) => candidate.id === sessionId);

      if (!nextTitle || nextTitle === session?.title) {
        setEditingSessionId(null);
        setEditingSessionTitle("");
        setSessionMenuOpenId(null);
        return;
      }

      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle })
      });

      const payload = (await response.json()) as {
        error?: string;
        session?: ChatSession;
        sessions?: ChatSessionSummary[];
      };

      if (!response.ok || !payload.session || !payload.sessions) {
        throw new Error(payload.error || "Unable to rename this chat.");
      }
      const nextSession = payload.session;
      const nextSessions = payload.sessions;

      startTransition(() => {
        setSessions(nextSessions);
        if (activeSession?.id === nextSession.id) {
          setActiveSession(nextSession);
        }
      });
      setEditingSessionId(null);
      setEditingSessionTitle("");
      setSessionMenuOpenId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to rename this chat.");
    }
  }

  function beginInlineRename(sessionId: string) {
    const session = sessions.find((candidate) => candidate.id === sessionId);
    setEditingSessionId(sessionId);
    setEditingSessionTitle(session?.title || "");
    setSessionMenuOpenId(null);
    setProjectMenuSessionId(null);
  }

  async function handleDeleteSession(sessionId: string) {
    const session = sessions.find((candidate) => candidate.id === sessionId);

    if (!window.confirm(`Delete "${session?.title || "this chat"}"?`)) {
      setSessionMenuOpenId(null);
      return;
    }

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as {
        deleted?: boolean;
        error?: string;
        sessions?: ChatSessionSummary[];
      };

      if (!response.ok || !payload.deleted || !payload.sessions) {
        throw new Error(payload.error || "Unable to delete this chat.");
      }

      startTransition(() => {
        setSessions(payload.sessions || []);
        if (activeSession?.id === sessionId) {
          setActiveSession(null);
          setPrompt("");
          setRouteLabel("Xeivora is ready");
          setOrchestrationSteps([]);
          setShowContinuityPanel(false);
          setWorkflowMode("simple_chat");
        }
      });
      setSessionMenuOpenId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to delete this chat.");
    }
  }

  async function handleUpdateSessionMetadata(
    sessionId: string,
    updates: Partial<Pick<ChatSessionSummary, "pinned" | "archived" | "projectId" | "title">>
  ) {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    const payload = (await response.json()) as {
      error?: string;
      session?: ChatSession;
      sessions?: ChatSessionSummary[];
    };

    if (!response.ok || !payload.session || !payload.sessions) {
      throw new Error(payload.error || "Unable to update this chat.");
    }
    const nextSession = payload.session;
    const nextSessions = payload.sessions;

    startTransition(() => {
      setSessions(nextSessions);
      if (activeSession?.id === nextSession.id) {
        setActiveSession(nextSession);
        setSessionFiles(nextSession.attachedFiles ?? []);
        setSelectedProjectId(nextSession.projectId ?? null);
      }
    });
  }

  async function handlePinSession(sessionId: string, pinned: boolean) {
    try {
      await handleUpdateSessionMetadata(sessionId, { pinned });
      setSessionMenuOpenId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update this chat.");
    }
  }

  async function handleAssignSessionProject(sessionId: string, projectId: string | null) {
    try {
      await handleUpdateSessionMetadata(sessionId, { projectId });
      setProjectMenuSessionId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update this chat.");
    }
  }

  async function handleProjectChange(projectId: string | null) {
    setSelectedProjectId(projectId);

    if (!activeSession) {
      return;
    }

    try {
      await handleUpdateSessionMetadata(activeSession.id, { projectId });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update the workspace project.");
    }
  }

  async function handleUploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList || []).filter(Boolean);

    if (!files.length || isUploadingFiles) {
      return;
    }

    setError(null);
    setIsUploadingFiles(true);

    try {
      const session = activeSession ?? (await createSession());
      const formData = new FormData();
      formData.append("sessionId", session.id);
      if (selectedProjectId) {
        formData.append("projectId", selectedProjectId);
      }
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/files", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as { error?: string; files?: UploadedFileSummary[] };

      if (!response.ok || !payload.files) {
        throw new Error(payload.error || "Unable to upload files.");
      }

      startTransition(() => {
        setSessionFiles((current) => {
          const map = new Map(current.map((file) => [file.id, file]));
          payload.files?.forEach((file) => map.set(file.id, file));
          return Array.from(map.values()).sort(
            (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          );
        });
        setActiveSession((current) =>
          current
            ? {
                ...current,
                attachedFiles: [
                  ...(current.attachedFiles || []).filter(
                    (existing) => !payload.files?.some((nextFile) => nextFile.id === existing.id)
                  ),
                  ...(payload.files || [])
                ]
              }
            : current
        );
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to upload files.");
    } finally {
      setIsUploadingFiles(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveFile(fileId: string) {
    try {
      const response = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
      const payload = (await response.json()) as { deleted?: boolean };

      if (!response.ok || !payload.deleted) {
        throw new Error("Unable to remove this file.");
      }

      startTransition(() => {
        setSessionFiles((current) => current.filter((file) => file.id !== fileId));
        setActiveSession((current) =>
          current
            ? {
                ...current,
                attachedFiles: (current.attachedFiles || []).filter((file) => file.id !== fileId)
              }
            : current
        );
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to remove this file.");
    }
  }

  async function startVoiceCapture() {
    if (voiceState !== "idle") {
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice capture is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingChunksRef.current = [];
      setVoiceState("listening");

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];

        if (!blob.size) {
          setVoiceState("idle");
          return;
        }

        setVoiceState("processing");
        try {
          const formData = new FormData();
          formData.append("audio", new File([blob], "xeivora-voice.webm", { type: "audio/webm" }));
          const response = await fetch("/api/voice/transcribe", {
            method: "POST",
            body: formData
          });
          const payload = (await response.json()) as { transcript?: string; message?: string };

          if (payload.transcript) {
            setPrompt((current) => `${current}${current ? " " : ""}${payload.transcript}`.trim());
          } else if (payload.message) {
            setError(payload.message);
          }
        } catch (nextError) {
          setError(nextError instanceof Error ? nextError.message : "Unable to transcribe the recording.");
        } finally {
          setVoiceState("idle");
        }
      };

      recorder.start();
    } catch (nextError) {
      setVoiceState("idle");
      setError(nextError instanceof Error ? nextError.message : "Unable to start voice capture.");
    }
  }

  function stopVoiceCapture() {
    if (mediaRecorderRef.current && voiceState === "listening") {
      mediaRecorderRef.current.stop();
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setThinking(false);
    setRouteLabel("Generation stopped");
  }

  function toggleDesktopFolder(path: string) {
    setDesktopExpandedFolders((current) => ({
      ...current,
      [path]: !current[path]
    }));
  }

  async function handleSaveActiveDesktopFile() {
    if (!activeFile) {
      return;
    }

    setDesktopSaveState("saving");
    const saved = await saveFile(activeFile, activeFileContent);
    setDesktopSaveState(saved ? "saved" : "error");
    window.setTimeout(() => setDesktopSaveState("idle"), 1800);
  }

  async function handleApplyDesktopChanges() {
    if (!desktopApplyDraft) {
      return;
    }

    setDesktopSaveState("saving");
    const saved = await saveFile(desktopApplyDraft.targetPath, desktopApplyDraft.nextContent);
    setDesktopSaveState(saved ? "saved" : "error");

    if (saved) {
      setActiveFile(desktopApplyDraft.targetPath);
      setActiveFileContent(desktopApplyDraft.nextContent);
      setDesktopApplyDraft(null);
    }

    window.setTimeout(() => setDesktopSaveState("idle"), 1800);
  }

  async function handleDesktopListFilesPrompt() {
    if (!isDesktop || !openFolderPath) {
      setError("Open a folder in the Xeivora desktop app first.");
      return;
    }

    const promptValue = "List the important files in this opened folder and tell me where I should work next.";
    setPrompt(promptValue);
    await handleSend(false, promptValue);
  }

  async function handleDesktopReadActiveFilePrompt() {
    if (!isDesktop || !activeFile) {
      setError("Open a file from the desktop file explorer first.");
      return;
    }

    const fileName = activeFile.split(/[\\/]/).pop() || "this file";
    const promptValue = `Review the currently open file ${fileName} and suggest the best next changes.`;
    setPrompt(promptValue);
    await handleSend(false, promptValue);
  }

  async function handleRunDesktopCommand() {
    if (!desktopCommandInput.trim()) {
      return;
    }

    setDesktopCommandRunning(true);
    setDesktopCommandResult(null);

    try {
      const result = await runCommand(desktopCommandInput.trim());
      setDesktopCommandResult({
        command: desktopCommandInput.trim(),
        error: result?.error || null,
        exitCode: typeof result?.exitCode === "number" ? result.exitCode : 0,
        stderr: result?.stderr || "",
        stdout: result?.stdout || "",
        success: Boolean(result?.success)
      });
    } finally {
      setDesktopCommandRunning(false);
    }
  }

  async function handleSendDesktopCommandResultToChat() {
    if (!desktopCommandResult) {
      return;
    }

    const commandPrompt = [
      `I ran this local command in Xeivora desktop: ${desktopCommandResult.command}`,
      desktopCommandResult.stdout ? `STDOUT:\n${desktopCommandResult.stdout}` : null,
      desktopCommandResult.stderr ? `STDERR:\n${desktopCommandResult.stderr}` : null,
      `Exit code: ${desktopCommandResult.exitCode ?? 0}`,
      "Explain the result and tell me the best next step."
    ]
      .filter(Boolean)
      .join("\n\n");

    setDesktopCommandOpen(false);
    setPrompt(commandPrompt);
    await handleSend(false, commandPrompt);
  }

  function handleOpenDesktopCommandModal() {
    if (!isDesktop || !openFolderPath) {
      setError("Open a folder in the Xeivora desktop app first.");
      return;
    }

    setDesktopCommandOpen(true);
  }

  function handlePrepareAssistantApply(message: ChatMessage) {
    if (!activeFile) {
      setError("Open a file in the desktop sidebar first so Xeivora knows where to apply the change.");
      return;
    }

    const codeBlock = extractPrimaryCodeBlock(message.content);
    if (!codeBlock) {
      setError("This response does not contain a code block Xeivora can apply.");
      return;
    }

    setDesktopApplyDraft({
      messageId: message.id,
      targetPath: activeFile,
      currentContent: activeFileContent,
      nextContent: normalizeCodeForApply(codeBlock.code)
    });
  }

  async function buildDesktopContext(input: string) {
    if (!isDesktop || !openFolderPath) {
      return null;
    }

    const prompt = `${input}`.trim();
    const matchedFile = await findMentionedDesktopFile({
      activeFilePath: activeFile,
      activeFileContent,
      fileTree,
      prompt,
      readFileForAI
    });

    if (!matchedFile && !activeFile) {
      return [
        `The user is working in the Xeivora desktop app.`,
        `Open folder: ${openFolderPath}`,
        summarizeDesktopFileTree(fileTree),
        `Only reference local file context if it is included below. Do not claim you changed local files or ran commands unless the user explicitly confirms that step.`
      ].join("\n");
    }

    return formatDesktopContext({
      activeFileContent,
      activeFilePath: activeFile,
      matchedFile,
      openFolderPath
    });
  }

  async function handleShareSession() {
    if (!activeSession || typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/chat?session=${activeSession.id}`);
      setShareFeedback("Link copied");
      window.setTimeout(() => setShareFeedback(null), 1600);
    } catch {
      setShareFeedback("Unable to copy");
      window.setTimeout(() => setShareFeedback(null), 1600);
    }
  }

  async function handleShareSpecificSession(sessionId: string) {
    if (typeof window === "undefined") {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}/chat?session=${sessionId}`);
      setShareFeedback("Link copied");
      window.setTimeout(() => setShareFeedback(null), 1600);
      setSessionMenuOpenId(null);
    } catch {
      setShareFeedback("Unable to copy");
      window.setTimeout(() => setShareFeedback(null), 1600);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function handleSelectModelPreset(presetId: ModelPickerId) {
    const option = modelPickerOptions.find((entry) => entry.id === presetId) || modelPickerOptions[0];
    setSelectedModelPreset(option.id);
    setSelectedModel(option.modelKey);
    setModelMenuOpen(false);
  }

  async function handleSend(regenerate = false, overrideInput?: string) {
    if (isStreaming) {
      return;
    }

    const input = regenerate ? getLastUserPrompt(activeSession) : (overrideInput ?? prompt).trim();
    if (!input) {
      return;
    }

    setError(null);
    setThinking(true);
    setIsStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;
    let assistantDraftId = "";
    const shouldOpenPreview = looksLikeCodeContinuationPrompt(input);

    try {
      const session = activeSession ?? (await createSession());
      const desktopContext = await buildDesktopContext(input);
      const pendingImageExecution = buildPendingImageExecution(input);
      assistantDraftId = `draft-${Date.now()}`;

      if (shouldOpenPreview) {
        setLivePreviewOpen(true);
        setLivePreviewInitializing(true);
        setLivePreviewError(null);
        setLivePreviewVersions([]);
        setLivePreviewContext({
          projectId: selectedProjectId || session.projectId || null,
          sessionId: session.id
        });
      }

      startTransition(() => {
        setActiveSession((current) => {
          const base = current ?? session;
          const nextMessages = regenerate
            ? base.messages.filter(
                (message, index, list) => !(index === list.length - 1 && message.role === "assistant")
              )
            : [
                ...base.messages,
                {
                  id: `local-user-${Date.now()}`,
                  role: "user",
                  content: input,
                  createdAt: new Date().toISOString(),
                  modelKey: selectedModel
                } satisfies ChatMessage
              ];

          return {
            ...base,
            title:
              base.title === "New OrbitAI thread" || base.title === "New Xeivora chat"
                ? input.replace(/\s+/g, " ").trim().slice(0, 42) || "Xeivora conversation"
                : base.title,
            messages: [
              ...nextMessages,
              {
                id: assistantDraftId,
                role: "assistant",
                content: "",
                createdAt: new Date().toISOString(),
                modelKey: selectedModel,
                provider: "simulation"
              }
            ]
          };
        });
      });

      if (pendingImageExecution) {
        setToolExecutionsByMessageId((current) => ({
          ...current,
          [assistantDraftId]: [pendingImageExecution]
        }));
      }

      setPrompt("");
      setRouteLabel("Routing prompt...");

      const response = await fetch(`/api/chat/sessions/${session.id}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          modelKey: selectedModel,
          regenerate,
          desktopContext,
          enabledIntegrationProviders
        }),
        signal: abortController.signal
      });

      if (!response.ok || !response.body) {
        throw new Error("Xeivora could not start the streaming response.");
      }

      await consumeEventStream(response, async (event) => {
        const typedEvent = event as StreamEvent;

        if (typedEvent.type === "meta") {
          setRouteLabel(toXeivoraLabel(typedEvent.payload.routeLabel));
          setActiveProvider(typedEvent.payload.provider);
          activeProviderRef.current = typedEvent.payload.provider;
          setShowContinuityPanel(Boolean(typedEvent.payload.showContinuityPanel));
          setWorkflowMode(typedEvent.payload.workflowMode ?? "simple_chat");
          setToolExecutionsByMessageId((current) => {
            if (!assistantDraftId || !current[assistantDraftId]) {
              return current;
            }

            const next = { ...current };
            next[typedEvent.payload.assistantMessageId] = next[assistantDraftId];
            delete next[assistantDraftId];
            return next;
          });
          setActiveSession((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              routeLabel: toXeivoraLabel(typedEvent.payload.routeLabel),
              messages: current.messages.map((message, index, list) =>
                index === list.length - 1 && message.role === "assistant"
                  ? {
                      ...message,
                      id: typedEvent.payload.assistantMessageId,
                      provider: typedEvent.payload.provider,
                      modelKey: typedEvent.payload.modelKey
                    }
                  : message
              )
            };
          });
        }

        if (typedEvent.type === "tool") {
          const codePreviewExecutions = typedEvent.payload.executions.filter(
            (execution) => execution.name === "code_assistant"
          );
          if (codePreviewExecutions.length > 0) {
            const previewVersions = codePreviewExecutions
              .map((execution) => getExecutionPreviewVersion(execution))
              .filter((preview): preview is WorkspacePreviewVersion => Boolean(preview));

            openLivePreview({
              projectId: previewVersions[0]?.projectId || selectedProjectId || session.projectId || null,
              sessionId: previewVersions[0]?.sessionId || session.id
            });
            setLivePreviewInitializing(!Boolean(previewVersions[0]?.previewPayload));
            setLivePreviewFrameError(null);

            if (previewVersions.length > 0) {
              setLivePreviewVersions((current) => mergePreviewVersions(current, previewVersions));
            } else {
              void loadLivePreviews(selectedProjectId || session.projectId || null, session.id, { silent: true });
            }
          }

          setToolExecutionsByMessageId((current) => ({
            ...current,
            [typedEvent.payload.assistantMessageId]: typedEvent.payload.executions
          }));
        }

        if (typedEvent.type === "orchestration") {
          setRouteLabel(toXeivoraLabel(typedEvent.payload.routeLabel));
          setActiveProvider(typedEvent.payload.provider);
          activeProviderRef.current = typedEvent.payload.provider;
          setOrchestrationSteps(typedEvent.payload.steps);
        }

        if (typedEvent.type === "continuity") {
          setActiveProvider(typedEvent.payload.currentProvider);
          setContinuityStatus(typedEvent.payload);

          activeProviderRef.current = typedEvent.payload.currentProvider;
        }

        if (typedEvent.type === "delta") {
          setThinking(false);
          setActiveSession((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              messages: current.messages.map((message, index, list) =>
                index === list.length - 1 && message.role === "assistant"
                  ? { ...message, content: `${message.content}${typedEvent.payload.text}` }
                  : message
              )
            };
          });
        }

        if (typedEvent.type === "done") {
          setLivePreviewInitializing(false);
          startTransition(() => {
            setActiveSession({
              ...typedEvent.payload.session,
              routeLabel: toXeivoraLabel(typedEvent.payload.session.routeLabel)
            });
            setSessions(typedEvent.payload.sessions);
            setRouteLabel(toXeivoraLabel(typedEvent.payload.session.routeLabel));
            setSelectedModel(typedEvent.payload.session.modelPreference);
            setSelectedModelPreset((current) =>
              current === "auto" ? modelKeyToPresetId(typedEvent.payload.session.modelPreference) : current
            );
          });
        }

        if (typedEvent.type === "error") {
          setError(toFriendlyError(typedEvent.payload.message));
        }
      });
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") {
        return;
      }

      setActiveSession((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          messages: current.messages.map((message, index, list) =>
            index === list.length - 1 && message.role === "assistant" && !message.content
              ? {
                  ...message,
                  content:
                    "Xeivora ran into an interruption before the answer completed. Try again and continuity will resume cleanly."
                }
              : message
          )
        };
      });
      if (assistantDraftId) {
        setToolExecutionsByMessageId((current) => {
          if (!current[assistantDraftId]) {
            return current;
          }

          const next = { ...current };
          delete next[assistantDraftId];
          return next;
        });
      }
      setError(
        toFriendlyError(nextError instanceof Error ? nextError.message : "Xeivora could not complete the response.")
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setThinking(false);
      setLivePreviewInitializing(false);
    }
  }

  return (
    <div
      className="h-dvh overflow-hidden bg-[var(--xv-chat-bg)] text-[var(--xv-chat-text)]"
      style={{ ...chatTheme, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="h-dvh bg-[var(--xv-chat-bg)]">
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[260px] shrink-0 border-r border-[var(--xv-chat-border)] bg-[var(--xv-chat-sidebar)] md:flex">
          <SidebarContent
            activeSessionId={activeSession?.id ?? null}
            collapsed={false}
            connectedIntegrations={connectedIntegrations}
            desktopExpandedFolders={desktopExpandedFolders}
            desktopFileTree={fileTree}
            desktopFolderLabel={folderLabel}
            desktopFolderOpen={Boolean(openFolderPath)}
            desktopLoading={fileTreeLoading}
            desktopOpenFilePath={activeFile}
            isDesktop={isDesktop}
            onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
            onDismiss={() => setMobileSidebarOpen(false)}
            onDesktopFileOpen={(filePath) => void openFileInEditor(filePath)}
            onDesktopFolderOpen={() => void openFolder()}
            onDesktopFolderToggle={toggleDesktopFolder}
            onNewChat={() => void handleNewChat()}
            onAssignProject={(sessionId, projectId) => void handleAssignSessionProject(sessionId, projectId)}
            onPinSession={(sessionId, pinned) => void handlePinSession(sessionId, pinned)}
            onRenameSession={beginInlineRename}
            onSelectSession={(sessionId) => void loadSession(sessionId)}
            onShareSession={(sessionId) => void handleShareSpecificSession(sessionId)}
            onToggleCollapse={() => setMobileSidebarOpen(false)}
            onToggleProjectMenu={setProjectMenuSessionId}
            onToggleSessionMenu={setSessionMenuOpenId}
            onToggleProfileMenu={setProfileMenuOpen}
            onToggleSearch={() => {
              setSearchOpen(true);
              setSearchQuery("");
            }}
            onLogout={() => void handleLogout()}
            onOpenShortcuts={() => setShortcutsOpen(true)}
            openProjectMenuId={projectMenuSessionId}
            openProfileMenu={profileMenuOpen}
            openSessionMenuId={sessionMenuOpenId}
            pathname={pathname}
            projects={projects}
            resolvedTheme={resolvedTheme}
            sessionGroups={groupedSessions}
            viewer={viewer}
            editingSessionId={editingSessionId}
            editingSessionTitle={editingSessionTitle}
            onEditingSessionTitleChange={setEditingSessionTitle}
            onEditingSessionSubmit={(sessionId) => void handleRenameSession(sessionId)}
            onEditingSessionCancel={() => {
              setEditingSessionId(null);
              setEditingSessionTitle("");
            }}
            onThemeToggle={toggleTheme}
          />
        </aside>

        <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
          <SheetContent className="bg-[var(--xv-chat-sidebar)] p-0" side="left">
            <SidebarContent
              activeSessionId={activeSession?.id ?? null}
              collapsed={false}
              connectedIntegrations={connectedIntegrations}
              desktopExpandedFolders={desktopExpandedFolders}
              desktopFileTree={fileTree}
              desktopFolderLabel={folderLabel}
              desktopFolderOpen={Boolean(openFolderPath)}
              desktopLoading={fileTreeLoading}
              desktopOpenFilePath={activeFile}
              isDesktop={isDesktop}
              mobile
              onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
              onDismiss={() => setMobileSidebarOpen(false)}
              onDesktopFileOpen={(filePath) => void openFileInEditor(filePath)}
              onDesktopFolderOpen={() => void openFolder()}
              onDesktopFolderToggle={toggleDesktopFolder}
              onNewChat={() => void handleNewChat()}
              onAssignProject={(sessionId, projectId) => void handleAssignSessionProject(sessionId, projectId)}
              onPinSession={(sessionId, pinned) => void handlePinSession(sessionId, pinned)}
              onRenameSession={beginInlineRename}
              onSelectSession={(sessionId) => void loadSession(sessionId)}
              onShareSession={(sessionId) => void handleShareSpecificSession(sessionId)}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              onToggleProjectMenu={setProjectMenuSessionId}
              onToggleSessionMenu={setSessionMenuOpenId}
              onToggleProfileMenu={setProfileMenuOpen}
              onToggleSearch={() => {
                setSearchOpen(true);
                setSearchQuery("");
              }}
              onLogout={() => void handleLogout()}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              openProjectMenuId={projectMenuSessionId}
              openProfileMenu={profileMenuOpen}
              openSessionMenuId={sessionMenuOpenId}
              pathname={pathname}
              projects={projects}
              resolvedTheme={resolvedTheme}
              sessionGroups={groupedSessions}
              viewer={viewer}
              editingSessionId={editingSessionId}
              editingSessionTitle={editingSessionTitle}
              onEditingSessionTitleChange={setEditingSessionTitle}
              onEditingSessionSubmit={(sessionId) => void handleRenameSession(sessionId)}
              onEditingSessionCancel={() => {
                setEditingSessionId(null);
                setEditingSessionTitle("");
              }}
              onThemeToggle={toggleTheme}
            />
          </SheetContent>
        </Sheet>

        <main className="relative flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-[var(--xv-chat-bg)] md:ml-[260px]">
          <button
            aria-label="Open sidebar"
            className="absolute left-3 top-[10px] z-30 inline-flex h-7 w-7 items-center justify-center rounded-[10px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-surface-soft)] md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            type="button"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <ChatTopbar
            connectedProviders={connectedProviders}
            currentModelSummary={currentModelSummary}
            fallbackSummary={fallbackSummary}
            model={topbarModel}
            modelPulseActive={modelPulseActive}
            modelMenuOpen={modelMenuOpen}
            modelOptions={modelPickerOptions}
            onShare={() => void handleShareSession()}
            onSelectModel={(presetId) => handleSelectModelPreset(presetId)}
            onToggleStatus={() => setStatusOpen((value) => !value)}
            onToggleModelMenu={() => setModelMenuOpen((value) => !value)}
            orchestrationSteps={orchestrationSteps}
            routeLabel={routeLabel}
            selectedModelPreset={selectedModelPreset}
            shareFeedback={shareFeedback}
            shareReady={Boolean(activeSession)}
            statusOpen={statusOpen}
            systemIndicatorLive={systemIndicatorLive}
            title={topbarTitle}
            continuityStatus={continuityStatus}
            workflowMode={workflowMode}
          />

          <div className="border-b border-[var(--xv-chat-border)] px-4 py-3 md:px-6">
            <ProjectWorkspaceTabs
              active={livePreviewOpen ? "preview" : "chat"}
              onPreviewSelect={() => {
                openLivePreview({
                  projectId: workspaceProjectId,
                  sessionId: activeSession?.id || null
                });
                if (!latestLivePreview) {
                  setLivePreviewInitializing(true);
                }
              }}
              projectId={workspaceProjectId}
              sessionId={activeSession?.id || null}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden pt-[8px]">
            <div
              className={cn("flex h-full min-h-0 overflow-hidden", livePreviewDocked || showDesktopFilePreview ? "xl:grid" : "")}
              style={
                livePreviewDocked
                  ? { gridTemplateColumns: `minmax(0, 1fr) 6px ${livePreviewDesktopWidth}px` }
                  : showDesktopFilePreview
                    ? { gridTemplateColumns: "minmax(0, 1fr) 380px" }
                    : undefined
              }
            >
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                {hasMessages ? (
                  <ChatThreadView
                    activeDesktopFilePath={activeFile}
                    composerRef={composerRef}
                    copiedResponseId={copiedResponseId}
                    desktopRightInset={livePreviewDocked ? livePreviewDesktopWidth : 0}
                    desktopFolderOpen={Boolean(openFolderPath)}
                    desktopToolBar={
                      isDesktop ? (
                        <DesktopToolBar
                          activeFilePath={activeFile}
                          folderOpen={Boolean(openFolderPath)}
                          onListFiles={() => void handleDesktopListFilesPrompt()}
                          onOpenFolder={() => void openFolder()}
                          onReadActiveFile={() => void handleDesktopReadActiveFilePrompt()}
                          onRunCommand={handleOpenDesktopCommandModal}
                        />
                      ) : null
                    }
                    error={error}
                    fileInputRef={fileInputRef}
                    isStreaming={isStreaming}
                    isDesktop={isDesktop}
                    isUploadingFiles={isUploadingFiles}
                    lastAssistantMessage={lastAssistantMessage}
                    messages={messages}
                    messagesRef={messagesRef}
                    onApplyAssistantCode={(message) => handlePrepareAssistantApply(message)}
                    onCopyResponse={async (message) => {
                      await navigator.clipboard.writeText(message.content);
                      setCopiedResponseId(message.id);
                      setTimeout(() => setCopiedResponseId(null), 1200);
                    }}
                    onFeedback={(messageId, value) =>
                      setMessageFeedback((current) => ({ ...current, [messageId]: value }))
                    }
                    onFilesSelected={(files) => void handleUploadFiles(files)}
                    onOpenPreview={(projectId, sessionId) => {
                      openLivePreview({ projectId, sessionId });
                      setLivePreviewInitializing(!latestLivePreview);
                    }}
                    onPromptChange={setPrompt}
                    onRegenerate={() => void handleSend(true)}
                    onRegenerateImage={(messageId, executionId, nextPrompt, count) =>
                      void handleRegenerateImageExecution(messageId, executionId, nextPrompt, count)
                    }
                    onRemoveFile={(fileId) => void handleRemoveFile(fileId)}
                    onRetry={() => void handleSend(true)}
                    onSend={() => void handleSend(false)}
                    onStartVoiceCapture={() => void startVoiceCapture()}
                    onStop={stopGenerating}
                    onStopVoiceCapture={stopVoiceCapture}
                    prompt={prompt}
                    sessionFiles={sessionFiles}
                    thinking={thinking}
                    toolExecutionsByMessageId={toolExecutionsByMessageId}
                    voiceState={voiceState}
                    feedbackByMessageId={messageFeedback}
                  />
                ) : (
                  <ChatHomeView
                    activeProject={
                      (selectedProjectId
                        ? projects.find((project) => project.id === selectedProjectId) || null
                        : activeSession?.projectId
                          ? projects.find((project) => project.id === activeSession.projectId) || null
                          : null) || null
                    }
                    composerRef={composerRef}
                    desktopRightInset={livePreviewDocked ? livePreviewDesktopWidth : 0}
                    projects={projects}
                    desktopToolBar={
                      isDesktop ? (
                        <DesktopToolBar
                          activeFilePath={activeFile}
                          folderOpen={Boolean(openFolderPath)}
                          onListFiles={() => void handleDesktopListFilesPrompt()}
                          onOpenFolder={() => void openFolder()}
                          onReadActiveFile={() => void handleDesktopReadActiveFilePrompt()}
                          onRunCommand={handleOpenDesktopCommandModal}
                        />
                      ) : null
                    }
                    error={error}
                    fileInputRef={fileInputRef}
                    connectedIntegrations={connectedIntegrations}
                    enabledIntegrationProviders={enabledIntegrationProviders}
                    isDesktop={isDesktop}
                    isStreaming={isStreaming}
                    isUploadingFiles={isUploadingFiles}
                    onFilesSelected={(files) => void handleUploadFiles(files)}
                    onPromptChange={setPrompt}
                    onRemoveFile={(fileId) => void handleRemoveFile(fileId)}
                    onSend={() => void handleSend(false)}
                    onStartVoiceCapture={() => void startVoiceCapture()}
                    onStop={stopGenerating}
                    onStopVoiceCapture={stopVoiceCapture}
                    onToggleIntegration={handleToggleIntegration}
                    prompt={prompt}
                    sessionFiles={sessionFiles}
                    voiceState={voiceState}
                  />
                )}
              </div>

              {livePreviewDocked ? (
                <div
                  aria-orientation="vertical"
                  className="hidden cursor-col-resize select-none xl:flex xl:items-stretch xl:justify-center"
                  onMouseDown={() => setIsResizingPreview(true)}
                  role="separator"
                >
                  <div
                    className={cn(
                      "w-px transition",
                      isResizingPreview
                        ? "bg-[var(--xv-chat-accent)]"
                        : "bg-[var(--xv-chat-border)] hover:bg-[var(--xv-chat-accent)]"
                    )}
                  />
                </div>
              ) : null}

              {livePreviewDocked ? (
                <LivePreviewPanel
                  error={livePreviewError}
                  frameError={livePreviewFrameError}
                  frameLoading={livePreviewFrameLoading}
                  initializing={livePreviewInitializing}
                  latestPreview={latestLivePreview}
                  loading={livePreviewLoading}
                  onApprove={(previewId) => void updateLivePreviewStatus(previewId, "approved")}
                  onClose={() => setLivePreviewOpen(false)}
                  onCopySource={async (code) => {
                    await navigator.clipboard.writeText(code);
                  }}
                  onExternalOpen={(preview, payload) => {
                    openPreviewInNewTab(preview, payload);
                  }}
                  onFrameLoad={() => setLivePreviewFrameLoading(false)}
                  onFrameError={() => {
                    setLivePreviewFrameLoading(false);
                    setLivePreviewFrameError("Preview could not render this output.");
                  }}
                  onMarkDeployReady={(previewId) => void updateLivePreviewStatus(previewId, "deploy_ready")}
                  onRefresh={() => {
                    setLivePreviewRefreshKey((value) => value + 1);
                    setLivePreviewFrameError(null);
                    void loadLivePreviews(livePreviewProjectId, livePreviewSessionId);
                  }}
                  onSaveVersion={() => void saveLivePreviewVersion()}
                  previewProjectName={previewDisplayName}
                  previewProjectId={linkedPreviewProjectId}
                  refreshKey={livePreviewRefreshKey}
                  renderPayload={effectiveLivePreviewPayload}
                  savingVersion={livePreviewSavingVersion}
                  updatingId={livePreviewUpdatingId}
                  versions={livePreviewVersions}
                />
              ) : null}

              {showDesktopFilePreview ? (
                <DesktopFilePreviewPanel
                  content={activeFileContent}
                  filePath={activeFile}
                  onChange={setActiveFileContent}
                  onClose={() => setActiveFile(null)}
                  onSave={() => void handleSaveActiveDesktopFile()}
                  saveState={desktopSaveState}
                />
              ) : null}
            </div>

            {!livePreviewDocked && livePreviewOpen ? (
              <Sheet onOpenChange={setLivePreviewOpen} open={livePreviewOpen}>
                <SheetContent
                  className="border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-0 text-[var(--xv-chat-text)]"
                  side={livePreviewSheetSide}
                >
                  <LivePreviewPanel
                    compact
                    error={livePreviewError}
                    frameError={livePreviewFrameError}
                    frameLoading={livePreviewFrameLoading}
                    initializing={livePreviewInitializing}
                    latestPreview={latestLivePreview}
                    loading={livePreviewLoading}
                    onApprove={(previewId) => void updateLivePreviewStatus(previewId, "approved")}
                    onClose={() => setLivePreviewOpen(false)}
                    onCopySource={async (code) => {
                      await navigator.clipboard.writeText(code);
                    }}
                    onExternalOpen={(preview, payload) => {
                      openPreviewInNewTab(preview, payload);
                    }}
                    onFrameLoad={() => setLivePreviewFrameLoading(false)}
                    onFrameError={() => {
                      setLivePreviewFrameLoading(false);
                      setLivePreviewFrameError("Preview could not render this output.");
                    }}
                    onMarkDeployReady={(previewId) => void updateLivePreviewStatus(previewId, "deploy_ready")}
                    onRefresh={() => {
                      setLivePreviewRefreshKey((value) => value + 1);
                      setLivePreviewFrameError(null);
                      void loadLivePreviews(livePreviewProjectId, livePreviewSessionId);
                    }}
                    onSaveVersion={() => void saveLivePreviewVersion()}
                    previewProjectName={previewDisplayName}
                    previewProjectId={linkedPreviewProjectId}
                    refreshKey={livePreviewRefreshKey}
                    renderPayload={effectiveLivePreviewPayload}
                    savingVersion={livePreviewSavingVersion}
                    updatingId={livePreviewUpdatingId}
                    versions={livePreviewVersions}
                  />
                </SheetContent>
              </Sheet>
            ) : null}

            {isDesktop && !firstLaunchComplete ? (
              <DesktopWelcomeOverlay onComplete={() => void completeFirstLaunch()} onOpenFolder={() => void openFolder()} />
            ) : null}

            {desktopCommandOpen ? (
              <DesktopCommandModal
                command={desktopCommandInput}
                onChange={setDesktopCommandInput}
                onClose={() => {
                  setDesktopCommandOpen(false);
                  setDesktopCommandResult(null);
                }}
                onRun={() => void handleRunDesktopCommand()}
                onSendToChat={() => void handleSendDesktopCommandResultToChat()}
                result={desktopCommandResult}
                running={desktopCommandRunning}
              />
            ) : null}

            {desktopApplyDraft ? (
              <DesktopApplyDiffModal
                draft={desktopApplyDraft}
                onApply={() => void handleApplyDesktopChanges()}
                onClose={() => setDesktopApplyDraft(null)}
                saveState={desktopSaveState}
              />
            ) : null}

            {searchOpen ? (
              <SearchCommandModal
                onClose={() => setSearchOpen(false)}
                onOpenSession={(sessionId) => {
                  setSearchOpen(false);
                  setSearchQuery("");
                  void loadSession(sessionId);
                }}
                query={searchQuery}
                results={searchResults}
                setQuery={setSearchQuery}
              />
            ) : null}

            {shortcutsOpen ? <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  activeSessionId: string | null;
  collapsed: boolean;
  connectedIntegrations: IntegrationConnectionSummary[];
  desktopExpandedFolders: Record<string, boolean>;
  desktopFileTree: DesktopFileNode[];
  desktopFolderLabel: string | null;
  desktopFolderOpen: boolean;
  desktopLoading: boolean;
  desktopOpenFilePath: string | null;
  editingSessionId: string | null;
  editingSessionTitle: string;
  isDesktop: boolean;
  mobile?: boolean;
  onAssignProject: (sessionId: string, projectId: string | null) => void;
  onDeleteSession: (sessionId: string) => void;
  onDesktopFileOpen: (filePath: string) => void;
  onDesktopFolderOpen: () => void;
  onDesktopFolderToggle: (path: string) => void;
  onDismiss?: () => void;
  onEditingSessionCancel: () => void;
  onEditingSessionSubmit: (sessionId: string) => void;
  onEditingSessionTitleChange: (value: string) => void;
  onLogout: () => void;
  onNewChat: () => void;
  onOpenShortcuts: () => void;
  onPinSession: (sessionId: string, pinned: boolean) => void;
  onRenameSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onShareSession: (sessionId: string) => void;
  onThemeToggle: () => void;
  onToggleCollapse: () => void;
  onToggleProjectMenu: (sessionId: string | null) => void;
  onToggleProfileMenu: (open: boolean) => void;
  onToggleSearch: () => void;
  onToggleSessionMenu: (sessionId: string | null) => void;
  openProjectMenuId: string | null;
  openProfileMenu: boolean;
  openSessionMenuId: string | null;
  pathname: string;
  projects: WorkspaceProject[];
  resolvedTheme: "dark" | "light";
  sessionGroups: Array<[string, ChatSessionSummary[]]>;
  viewer?: AuthUser | null;
};

function SidebarContent({
  activeSessionId,
  collapsed,
  connectedIntegrations,
  desktopExpandedFolders,
  desktopFileTree,
  desktopFolderLabel,
  desktopFolderOpen,
  desktopLoading,
  desktopOpenFilePath,
  editingSessionId,
  editingSessionTitle,
  isDesktop,
  mobile = false,
  onAssignProject,
  onDeleteSession,
  onDesktopFileOpen,
  onDesktopFolderOpen,
  onDesktopFolderToggle,
  onDismiss,
  onEditingSessionCancel,
  onEditingSessionSubmit,
  onEditingSessionTitleChange,
  onLogout,
  onNewChat,
  onOpenShortcuts,
  onPinSession,
  onRenameSession,
  onSelectSession,
  onShareSession,
  onThemeToggle,
  onToggleCollapse,
  onToggleProjectMenu,
  onToggleProfileMenu,
  onToggleSearch,
  onToggleSessionMenu,
  openProjectMenuId,
  openProfileMenu,
  openSessionMenuId,
  pathname,
  projects,
  resolvedTheme,
  sessionGroups,
  viewer = null
}: SidebarContentProps) {
  const router = useRouter();
  const profileName = viewer?.name || workspaceName;
  const profilePlan = viewer?.plan || "Pro";
  const profileEmail = viewer?.email || "luxshan@xeivora.com";
  const [soonNotice, setSoonNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!soonNotice) {
      return;
    }

    const timeout = window.setTimeout(() => setSoonNotice(null), 1000);
    return () => window.clearTimeout(timeout);
  }, [soonNotice]);

  const handleSoonItemClick = () => {
    setSoonNotice("Available soon");
  };

  const handleContinueProject = () => {
    onDismiss?.();
    router.push("/dashboard");
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden px-[10px] py-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1.5">
        <Link
          className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-[var(--xv-chat-ghost-bg)]"
          href="/"
          onClick={() => onDismiss?.()}
        >
          <OrbitLogo iconSize={28} nameClassName="text-[15px] tracking-[-0.01em]" showTagline={false} />
        </Link>

        <div className="flex items-center gap-2">
          <button
            aria-label="Start new chat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
            onClick={onNewChat}
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {mobile ? (
              <button
                aria-label="Close sidebar"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                onClick={onToggleCollapse}
                type="button"
              >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <button
        className={cn(
          "mb-2 flex h-10 items-center rounded-[10px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-3 text-[13px] font-normal text-[var(--xv-chat-muted)] shadow-sm transition hover:border-[var(--xv-chat-border-strong)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]",
          collapsed ? "justify-center px-0" : "gap-2.5"
        )}
        onClick={handleContinueProject}
        type="button"
      >
        <Plus className="h-4 w-4 shrink-0" />
        {!collapsed ? <span>Continue project</span> : null}
      </button>

      {!collapsed || mobile ? (
        <>
          <nav className="grid gap-[1px] border-b border-[var(--xv-chat-border)] pb-2" aria-label="Workspace navigation">
            {navItems.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.label}
                onDismiss={onDismiss}
                onSoonClick={handleSoonItemClick}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="mt-2 min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 flex-col">
              {isDesktop ? (
                <DesktopFileExplorerSection
                  activeFilePath={desktopOpenFilePath}
                  expandedFolders={desktopExpandedFolders}
                  fileTree={desktopFileTree}
                  folderLabel={desktopFolderLabel}
                  folderOpen={desktopFolderOpen}
                  loading={desktopLoading}
                  onFileOpen={(filePath) => {
                    onDesktopFileOpen(filePath);
                    onDismiss?.();
                  }}
                  onFolderOpen={onDesktopFolderOpen}
                  onFolderToggle={onDesktopFolderToggle}
                />
              ) : null}

              <div className="mb-1 flex items-center justify-between px-2">
                <p className="text-[11px] font-normal tracking-[0.01em] text-[var(--xv-chat-muted)]">
                  Recent context
                </p>
                <button
                  aria-label="Search chats"
                  className="inline-flex h-6 w-6 items-center justify-center rounded-[8px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                  onClick={onToggleSearch}
                  type="button"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>

              <ScrollArea className="h-full pr-1">
                <div className="space-y-3 pb-4">
                  {sessionGroups.length ? (
                    sessionGroups.map(([group, items]) => (
                      <div className="space-y-1" key={group}>
                        <h3 className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">
                          {group}
                        </h3>
                        {items.map((session) => (
                          <RecentSessionRow
                            active={activeSessionId === session.id}
                            editing={editingSessionId === session.id}
                            editingTitle={editingSessionTitle}
                            key={session.id}
                            menuProjectOpen={openProjectMenuId === session.id}
                            menuOpen={openSessionMenuId === session.id}
                            onAssignProject={(projectId) => onAssignProject(session.id, projectId)}
                            onDelete={() => onDeleteSession(session.id)}
                            onEditingCancel={onEditingSessionCancel}
                            onEditingSubmit={() => onEditingSessionSubmit(session.id)}
                            onEditingTitleChange={onEditingSessionTitleChange}
                            onOpenChange={(nextOpen) => onToggleSessionMenu(nextOpen ? session.id : null)}
                            onProjectMenuOpenChange={(nextOpen) => onToggleProjectMenu(nextOpen ? session.id : null)}
                            onPin={() => onPinSession(session.id, !session.pinned)}
                            onRename={() => onRenameSession(session.id)}
                            onSelect={() => {
                              onSelectSession(session.id);
                              onDismiss?.();
                            }}
                            onShare={() => onShareSession(session.id)}
                            projects={projects}
                            session={session}
                          />
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="px-2 pt-2 text-[13px] text-[var(--xv-chat-muted)]">No saved continuity yet.</div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="mt-auto border-t border-[var(--xv-chat-border)] px-1 pt-2">
            {connectedIntegrations.length ? (
              <div className="mb-2 px-1.5">
                <p className="mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">
                  Connected apps
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {connectedIntegrations.map((integration) => (
                    <Link
                      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-2 text-[10px] font-medium text-[var(--xv-chat-muted)] transition hover:border-[var(--xv-chat-border-strong)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                      href="/integrations"
                      key={integration.provider}
                      onClick={() => onDismiss?.()}
                      title={integration.label}
                    >
                      {integration.label.slice(0, 2).toUpperCase()}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="relative">
              <button
                className="flex w-full items-center gap-2 rounded-[10px] px-1.5 py-1.5 text-left transition hover:bg-[var(--xv-chat-ghost-bg)]"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleProfileMenu(!openProfileMenu);
                }}
                type="button"
              >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-[10px] font-medium text-white">
                {getInitials(profileName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-[var(--xv-chat-text)]">{profileName}</p>
                <p className="text-[10.5px] text-[var(--xv-chat-muted)]">{profilePlan}</p>
              </div>
              <span
                aria-hidden="true"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)]"
              >
                <Ellipsis className="h-4 w-4" />
              </span>
              </button>

              <AnimatePresence>
                {openProfileMenu ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-[999] rounded-[14px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-2 shadow-[var(--xv-chat-shadow)]"
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    onClick={(event) => event.stopPropagation()}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-[11px] font-medium text-white">
                        {getInitials(profileName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--xv-chat-text)]">{profileName}</p>
                        <p className="truncate text-[11px] text-[var(--xv-chat-muted)]">{profileEmail}</p>
                      </div>
                      <span className="ml-auto rounded-full border border-[var(--xv-chat-border-strong)] px-2 py-0.5 text-[10px] text-[var(--xv-chat-accent)]">
                        {profilePlan}
                      </span>
                    </div>
                    <div className="my-2 h-px bg-[var(--xv-chat-border)]" />
                    <ProfileMenuButton
                      icon={resolvedTheme === "dark" ? Sun : Moon}
                      label={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
                      onClick={onThemeToggle}
                    />
                    <ProfileMenuButton
                      icon={Settings2}
                      label="Settings"
                      onClick={() => {
                        onToggleProfileMenu(false);
                        onDismiss?.();
                        router.push("/settings");
                      }}
                    />
                    <ProfileMenuButton
                      icon={PlugZap}
                      label="Integrations"
                      onClick={() => {
                        onToggleProfileMenu(false);
                        onDismiss?.();
                        router.push("/integrations");
                      }}
                    />
                    <ProfileMenuButton
                      icon={Keyboard}
                      label="Keyboard shortcuts"
                      onClick={() => {
                        onToggleProfileMenu(false);
                        onOpenShortcuts();
                      }}
                    />
                    <div className="my-2 h-px bg-[var(--xv-chat-border)]" />
                    <ProfileMenuButton destructive icon={LogOut} label="Log out" onClick={onLogout} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {soonNotice ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--xv-chat-text)] shadow-[var(--xv-chat-shadow)]"
                exit={{ opacity: 0, y: 6 }}
                initial={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {soonNotice}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      ) : (
        <>
          <div className="grid gap-1">
            {navItems.map((item) =>
              item.soon ? (
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-surface)] hover:text-[var(--xv-chat-text)]"
                  key={item.label}
                  onClick={handleSoonItemClick}
                  title={`${item.label} available soon`}
                  type="button"
                >
                  <item.icon className="h-4 w-4" />
                </button>
              ) : (
                <Link
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl transition",
                    pathname === item.href
                      ? "bg-[var(--xv-chat-surface)] text-[var(--xv-chat-text)]"
                      : "text-[var(--xv-chat-muted)] hover:bg-[var(--xv-chat-surface)] hover:text-[var(--xv-chat-text)]"
                  )}
                  href={item.href}
                  key={item.label}
                  title={item.label}
                >
                  <item.icon className="h-4 w-4" />
                </Link>
              )
            )}
          </div>
          <div className="flex-1" />
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-sm font-semibold text-white">
            {getInitials(profileName)}
          </div>

          <AnimatePresence>
            {soonNotice ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--xv-chat-text)] shadow-[var(--xv-chat-shadow)]"
                exit={{ opacity: 0, y: 6 }}
                initial={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                {soonNotice}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function SidebarNavItem({
  item,
  onDismiss,
  onSoonClick,
  pathname
}: {
  item: SidebarItem;
  onDismiss?: () => void;
  onSoonClick: () => void;
  pathname: string;
}) {
  const isActive = pathname === item.href;

  if (item.soon) {
    return (
      <button
        className="flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[13px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
        onClick={() => {
          onSoonClick();
        }}
        type="button"
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
        <span className="ml-auto rounded-full border border-[var(--xv-chat-border)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">
          Soon
        </span>
      </button>
    );
  }

  return (
    <Link
      className={cn(
        "flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[13px] transition",
        isActive
          ? "bg-[var(--xv-chat-surface)] font-medium text-[var(--xv-chat-text)]"
          : "text-[var(--xv-chat-muted)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
      )}
      href={item.href}
      onClick={() => onDismiss?.()}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function RecentSessionRow({
  active,
  editing,
  editingTitle,
  menuProjectOpen,
  menuOpen,
  onAssignProject,
  onDelete,
  onEditingCancel,
  onEditingSubmit,
  onEditingTitleChange,
  onOpenChange,
  onProjectMenuOpenChange,
  onPin,
  onRename,
  onSelect,
  onShare,
  projects,
  session
}: {
  active: boolean;
  editing: boolean;
  editingTitle: string;
  menuProjectOpen: boolean;
  menuOpen: boolean;
  onAssignProject: (projectId: string | null) => void;
  onDelete: () => void;
  onEditingCancel: () => void;
  onEditingSubmit: () => void;
  onEditingTitleChange: (value: string) => void;
  onOpenChange: (nextOpen: boolean) => void;
  onProjectMenuOpenChange: (nextOpen: boolean) => void;
  onPin: () => void;
  onRename: () => void;
  onSelect: () => void;
  onShare: () => void;
  projects: WorkspaceProject[];
  session: ChatSessionSummary;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!menuOpen) {
      setConfirmDelete(false);
    }
  }, [menuOpen]);

  return (
    <div className="group relative">
      {editing ? (
        <form
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-[10px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-2.5 pr-2 text-left text-[12px] font-normal",
            active ? "text-[var(--xv-chat-text)]" : "text-[var(--xv-chat-muted)]"
          )}
          onClick={(event) => event.stopPropagation()}
          onSubmit={(event) => {
            event.preventDefault();
            onEditingSubmit();
          }}
        >
          {session.pinned ? <span className="shrink-0 text-[12px] text-[var(--xv-chat-accent)]">★</span> : null}
          <input
            autoFocus
            className="w-full bg-transparent text-[12px] text-[var(--xv-chat-text)] outline-none"
            onBlur={onEditingSubmit}
            onChange={(event) => onEditingTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                onEditingCancel();
              }
            }}
            value={editingTitle}
          />
        </form>
      ) : (
        <div
          className={cn(
            "flex h-9 w-full items-center gap-1 rounded-[10px] pl-0.5 pr-1 transition",
            active ? "bg-[var(--xv-chat-surface)]" : "hover:bg-[var(--xv-chat-ghost-bg)]"
          )}
        >
          <button
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-[10px] px-2.5 text-left text-[12px] font-normal transition",
              active ? "text-[var(--xv-chat-text)]" : "text-[var(--xv-chat-muted)] hover:text-[var(--xv-chat-text)]"
            )}
            onClick={onSelect}
            type="button"
          >
            {session.pinned ? <span className="shrink-0 text-[12px] text-[var(--xv-chat-accent)]">★</span> : null}
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {truncateSidebarSessionTitle(session.title)}
            </span>
          </button>

          <button
            aria-label={`Open options for ${session.title}`}
            className={cn(
              "z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-transparent transition",
              menuOpen || menuProjectOpen
                ? "bg-[var(--xv-chat-ghost-bg-hover)] text-[var(--xv-chat-text)] opacity-100"
                : "bg-transparent text-[var(--xv-chat-muted)] opacity-0 hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)] group-hover:opacity-100"
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onOpenChange(!menuOpen);
            }}
            type="button"
          >
            <span className="text-[16px] leading-none">⋮</span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 top-[calc(100%+4px)] z-[999] min-w-[160px] rounded-[8px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-1 shadow-[var(--xv-chat-shadow)]"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            {!confirmDelete ? (
              <>
                <SessionMenuButton icon={Pencil} label="Rename" onClick={onRename} />
                <SessionMenuButton icon={Star} label={session.pinned ? "Pin to top" : "Pin to top"} onClick={onPin} />
                <SessionMenuButton
                  icon={FolderPlus}
                  label="Move to project"
                  onClick={() => {
                    onOpenChange(false);
                    onProjectMenuOpenChange(true);
                  }}
                />
                <SessionMenuButton icon={Share2} label="Share chat" onClick={onShare} />
                <SessionMenuButton destructive icon={Trash2} label="Delete" onClick={() => setConfirmDelete(true)} />
              </>
            ) : (
              <div className="space-y-2 px-2 py-2">
                <p className="text-[12px] text-[var(--xv-chat-text)]">Delete this chat?</p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-[6px] border border-[var(--xv-chat-border)] px-2 py-1.5 text-[12px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                    onClick={() => setConfirmDelete(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 rounded-[6px] border border-[rgba(239,68,68,0.28)] px-2 py-1.5 text-[12px] text-[#ef4444] transition hover:bg-[rgba(239,68,68,0.12)]"
                    onClick={onDelete}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {menuProjectOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute right-0 top-[calc(100%+4px)] z-[999] min-w-[180px] rounded-[8px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-1 shadow-[var(--xv-chat-shadow)]"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <button
              className="flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[13px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
              onClick={() => onAssignProject(null)}
              type="button"
            >
              <FolderPlus className="h-4 w-4 shrink-0" />
              <span>No project</span>
            </button>

            {projects.map((project) => (
              <button
                className="flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[13px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                key={project.id}
                onClick={() => onAssignProject(project.id)}
                type="button"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SessionMenuButton({
  destructive = false,
  icon: Icon,
  label,
  onClick
}: {
  destructive?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-3 py-2 text-left text-[13px] transition",
        destructive
          ? "text-[var(--xv-chat-text)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#ef4444]"
          : "text-[var(--xv-chat-text)] hover:bg-[var(--xv-chat-ghost-bg)]"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function escapePreviewHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPreviewModeLabel(mode: WorkspacePreviewPayload["renderMode"] | null | undefined) {
  switch (mode) {
    case "browser":
      return "Browser preview";
    case "react":
      return "Component preview";
    case "terminal":
      return "Terminal output";
    case "api":
      return "API preview";
    case "database":
      return "Database preview";
    case "markdown":
      return "Markdown preview";
    case "pdf":
      return "PDF preview";
    case "slides":
      return "Slides preview";
    case "image":
      return "Image preview";
    case "video":
      return "Video preview";
    case "code":
      return "Code preview";
    default:
      return "Preview ready";
  }
}

function buildPreviewExternalDocument(
  preview: WorkspacePreviewVersion,
  payload: WorkspacePreviewPayload | null,
  fallbackMessage: string
) {
  if (payload?.renderMode === "browser" && payload.srcDoc) {
    return payload.srcDoc;
  }

  const title = escapePreviewHtml(preview.title || "Xeivora Preview");
  const modeLabel = escapePreviewHtml(formatPreviewModeLabel(payload?.renderMode));
  const entryLabel = escapePreviewHtml(payload?.entryLabel || preview.routePath || "preview");
  const reason = escapePreviewHtml(payload?.reason || fallbackMessage);
  const sourceCode = payload?.sourceCode ? escapePreviewHtml(payload.sourceCode) : "";
  const stdout = payload?.stdout ? escapePreviewHtml(payload.stdout) : "";
  const stderr = payload?.stderr ? escapePreviewHtml(payload.stderr) : "";
  const markdown = payload?.markdown ? escapePreviewHtml(payload.markdown) : "";
  const sampleRequest = payload?.sampleRequest ? escapePreviewHtml(payload.sampleRequest) : "";
  const sampleResponse = payload?.sampleResponse ? escapePreviewHtml(payload.sampleResponse) : "";
  const endpointsMarkup = payload?.endpoints?.length
    ? `<div class="pills">${payload.endpoints
        .map(
          (endpoint) =>
            `<span class="pill"><strong>${escapePreviewHtml(endpoint.method)}</strong> ${escapePreviewHtml(endpoint.path)}</span>`
        )
        .join("")}</div>`
    : "";
  const tablesMarkup = payload?.tables?.length
    ? payload.tables
        .map((table) => {
          const headers = table.columns.map((column) => `<th>${escapePreviewHtml(column.name)}</th>`).join("");
          const rows = (table.rows?.length ? table.rows : [{}]).map((row) => {
            const cells = table.columns
              .map((column) => `<td>${escapePreviewHtml(`${row[column.name] ?? "—"}`)}</td>`)
              .join("");
            return `<tr>${cells}</tr>`;
          });

          return `<section class="panel"><h3>${escapePreviewHtml(table.name)}</h3><table><thead><tr>${headers}</tr></thead><tbody>${rows.join(
            ""
          )}</tbody></table></section>`;
        })
        .join("")
    : "";

  let bodyMarkup = `<section class="panel"><p>${reason}</p></section>`;

  switch (payload?.renderMode) {
    case "react":
      bodyMarkup = `<section class="panel"><h3>Component shell</h3><p>${reason}</p></section>${
        sourceCode ? `<section class="panel"><pre>${sourceCode}</pre></section>` : ""
      }`;
      break;
    case "terminal":
      bodyMarkup = `<section class="panel"><div class="muted">$ ${escapePreviewHtml(payload.command || "run")}</div><pre>${stdout || "Execution preview prepared."}</pre>${
        stderr ? `<div class="error">${stderr}</div>` : ""
      }</section>${sourceCode ? `<section class="panel"><pre>${sourceCode}</pre></section>` : ""}`;
      break;
    case "api":
      bodyMarkup = `<section class="panel"><h3>Endpoints</h3>${endpointsMarkup || "<p>No endpoints inferred yet.</p>"}</section>${
        sampleRequest ? `<section class="panel"><h3>Sample request</h3><pre>${sampleRequest}</pre></section>` : ""
      }${sampleResponse ? `<section class="panel"><h3>Sample response</h3><pre>${sampleResponse}</pre></section>` : ""}${
        sourceCode ? `<section class="panel"><h3>Source</h3><pre>${sourceCode}</pre></section>` : ""
      }`;
      break;
    case "database":
      bodyMarkup = `${tablesMarkup || `<section class="panel"><p>${reason}</p></section>`}${
        payload.query ? `<section class="panel"><h3>Query</h3><pre>${escapePreviewHtml(payload.query)}</pre></section>` : ""
      }`;
      break;
    case "markdown":
      bodyMarkup = `<section class="panel"><pre>${markdown || sourceCode || reason}</pre></section>`;
      break;
    case "pdf":
    case "slides":
    case "image":
    case "video":
      bodyMarkup = `<section class="panel"><h3>${modeLabel}</h3><p>${reason}</p></section>${
        sourceCode ? `<section class="panel"><pre>${sourceCode}</pre></section>` : ""
      }`;
      break;
    case "code":
      bodyMarkup = `<section class="panel"><p>${reason}</p></section>${
        sourceCode ? `<section class="panel"><pre>${sourceCode}</pre></section>` : ""
      }`;
      break;
    default:
      break;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: Inter, system-ui, sans-serif;
        background: #050505;
        color: rgba(255,255,255,0.92);
        padding: 24px;
      }
      .shell {
        max-width: 1040px;
        margin: 0 auto;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 999px;
        padding: 8px 12px;
        color: rgba(255,255,255,0.68);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .panel {
        margin-top: 16px;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 18px;
        background: #0a0a0a;
        padding: 18px;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 13px;
        line-height: 1.6;
      }
      h1, h3, p { margin: 0; }
      h1 { margin-top: 14px; font-size: 28px; }
      h3 { margin-bottom: 10px; font-size: 14px; }
      p, .muted { color: rgba(255,255,255,0.72); line-height: 1.7; }
      .muted { font-size: 13px; }
      .error { margin-top: 12px; color: #f87171; }
      .pills { display: flex; flex-wrap: wrap; gap: 8px; }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.1);
        background: #111111;
        padding: 6px 10px;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-top: 1px solid rgba(255,255,255,0.08);
        padding: 10px 12px;
        text-align: left;
        font-size: 12px;
      }
      th {
        color: rgba(255,255,255,0.72);
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="eyebrow">${modeLabel} · ${entryLabel}</div>
      <h1>${title}</h1>
      ${bodyMarkup}
    </div>
  </body>
</html>`;
}

function LivePreviewPanel({
  compact = false,
  error,
  frameError,
  frameLoading,
  initializing,
  latestPreview,
  loading,
  onApprove,
  onClose,
  onCopySource,
  onExternalOpen,
  onFrameError,
  onFrameLoad,
  onMarkDeployReady,
  onRefresh,
  onSaveVersion,
  previewProjectId,
  previewProjectName,
  refreshKey,
  renderPayload,
  savingVersion,
  updatingId,
  versions
}: {
  compact?: boolean;
  error: string | null;
  frameError: string | null;
  frameLoading: boolean;
  initializing: boolean;
  latestPreview: WorkspacePreviewVersion | null;
  loading: boolean;
  onApprove: (previewId: string) => void;
  onClose: () => void;
  onCopySource: (code: string) => void;
  onExternalOpen: (preview: WorkspacePreviewVersion, payload: WorkspacePreviewPayload | null) => void;
  onFrameError: () => void;
  onFrameLoad: () => void;
  onMarkDeployReady: (previewId: string) => void;
  onRefresh: () => void;
  onSaveVersion: () => void;
  previewProjectId: string | null;
  previewProjectName: string;
  refreshKey: number;
  renderPayload: WorkspacePreviewPayload | null;
  savingVersion: boolean;
  updatingId: string | null;
  versions: WorkspacePreviewVersion[];
}) {
  const [activeTab, setActiveTab] = useState<"preview" | PreviewSideTabKey>("preview");
  const previewStatusLabel = latestPreview ? formatPreviewStatusLabel(latestPreview.status) : "Standby";
  const renderMode = renderPayload?.renderMode ?? null;
  const renderTypeLabel = formatPreviewModeLabel(renderMode);
  const showRenderableFrame = renderMode === "browser" && Boolean(renderPayload?.srcDoc);
  const copyableSource =
    renderPayload?.sourceCode ||
    renderPayload?.markdown ||
    renderPayload?.query ||
    renderPayload?.stdout ||
    null;
  const hasRenderablePreview = Boolean(renderPayload) || Boolean(latestPreview);
  const previewMessage =
    renderPayload?.reason ||
    frameError ||
    error ||
    (latestPreview ? "Preview could not render this output." : "Start a coding task and a live preview will appear here.");
  const actionButtonClass =
    "inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]";
  const iconButtonClass =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)] disabled:cursor-not-allowed disabled:opacity-60";

  function renderPreviewContent(): ReactNode {
    if (showRenderableFrame) {
      return (
        <>
          <iframe
            className="h-full w-full bg-white"
            key={`${latestPreview?.id || "draft"}-${latestPreview?.updatedAt || "now"}-${refreshKey}-${renderPayload?.srcDoc?.length || 0}`}
            onError={onFrameError}
            onLoad={onFrameLoad}
            sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"
            srcDoc={renderPayload?.srcDoc || ""}
            title={`Live preview for ${previewProjectName}`}
          />
          {frameLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:rgba(0,0,0,0.18)] backdrop-blur-[2px]">
              <div className="rounded-[18px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-5 py-4 text-center shadow-[var(--xv-chat-shadow)]">
                <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-[var(--xv-chat-accent)]" />
                <div className="mt-3 text-[13px] font-medium text-[var(--xv-chat-text)]">Updating preview…</div>
              </div>
            </div>
          ) : null}
          {frameError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[color:rgba(0,0,0,0.2)] p-5 backdrop-blur-[2px]">
              <div className="max-w-[340px] rounded-[18px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-5 py-4 text-center text-[13px] leading-6 text-[var(--xv-chat-text)] shadow-[var(--xv-chat-shadow)]">
                <div className="font-medium">Preview could not render this output.</div>
                <div className="mt-2 text-[var(--xv-chat-muted)]">{previewMessage}</div>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button className={actionButtonClass} onClick={onRefresh} type="button">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>
                  {copyableSource ? (
                    <button
                      className={actionButtonClass}
                      onClick={() => onCopySource(copyableSource)}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy code</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </>
      );
    }

    if (initializing || loading) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-[300px] text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)]">
              <LoaderCircle className="h-5 w-5 animate-spin text-[var(--xv-chat-accent)]" />
            </div>
            <div className="mt-4 text-[15px] font-medium text-[var(--xv-chat-text)]">Generating your live preview…</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--xv-chat-muted)]">
              Xeivora is choosing the most useful preview mode for this coding checkpoint.
            </p>
          </div>
        </div>
      );
    }

    if (!renderPayload) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-[280px] text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)]">
              <Laptop className="h-5 w-5 text-[var(--xv-chat-accent)]" />
            </div>
            <div className="mt-4 text-[15px] font-medium text-[var(--xv-chat-text)]">Start building to generate a preview.</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--xv-chat-muted)]">
              Ask Xeivora to build a UI, script, API, schema, or document and it renders here in the most useful format.
            </p>
            {error ? <p className="mt-3 text-[12px] text-[#ef4444]">{error}</p> : null}
          </div>
        </div>
      );
    }

    if (renderMode === "react") {
      return (
        <div className="h-full overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
              <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Component preview shell</div>
              <div className="mt-3 rounded-[18px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-panel)] p-5">
                <div className="rounded-[14px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)] px-4 py-3 text-[13px] text-[var(--xv-chat-text)]">
                  <div className="font-medium">React output detected</div>
                  <p className="mt-2 leading-6 text-[var(--xv-chat-muted)]">
                    {renderPayload.reason || "Xeivora saved the component and prepared a shell preview for this checkpoint."}
                  </p>
                </div>
              </div>
            </div>
            {copyableSource ? (
              <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Source</div>
                  <button className={actionButtonClass} onClick={() => onCopySource(copyableSource)} type="button">
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy code</span>
                  </button>
                </div>
                <pre className="overflow-x-auto rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-4 text-[12px] leading-6 text-[var(--xv-chat-text)]">
                  <code>{copyableSource}</code>
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (renderMode === "terminal") {
      return (
        <div className="h-full overflow-y-auto p-5">
          <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[#020202] shadow-[var(--xv-chat-shadow)]">
            <div className="border-b border-[var(--xv-chat-border)] px-4 py-3 text-[12px] text-[var(--xv-chat-muted)]">
              $ {renderPayload.command || "run"}
            </div>
            <div className="space-y-4 p-4 font-mono text-[12px] leading-6 text-white">
              <pre className="whitespace-pre-wrap">{renderPayload.stdout || "Execution preview prepared."}</pre>
              {renderPayload.stderr ? (
                <div className="rounded-[14px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] p-3 text-[#fca5a5]">
                  <pre className="whitespace-pre-wrap">{renderPayload.stderr}</pre>
                </div>
              ) : null}
            </div>
          </div>
          {copyableSource ? (
            <div className="mt-4 flex justify-end">
              <button className={actionButtonClass} onClick={() => onCopySource(copyableSource)} type="button">
                <Copy className="h-3.5 w-3.5" />
                <span>Copy code</span>
              </button>
            </div>
          ) : null}
        </div>
      );
    }

    if (renderMode === "api") {
      return (
        <div className="h-full overflow-y-auto p-5">
          <div className="space-y-4">
            <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
              <div className="text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Endpoints</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {renderPayload.endpoints?.length ? (
                  renderPayload.endpoints.map((endpoint) => (
                    <div
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-panel)] px-3 py-1.5 text-[12px] text-[var(--xv-chat-text)]"
                      key={`${endpoint.method}-${endpoint.path}`}
                    >
                      <span className="font-medium text-[var(--xv-chat-accent)]">{endpoint.method}</span>
                      <span>{endpoint.path}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-[13px] leading-6 text-[var(--xv-chat-muted)]">
                    {renderPayload.reason || "Xeivora inferred an API preview from the generated output."}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
                <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Sample request</div>
                <pre className="overflow-x-auto rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-4 text-[12px] leading-6 text-[var(--xv-chat-text)]">
                  <code>{renderPayload.sampleRequest || "No request body required."}</code>
                </pre>
              </div>
              <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
                <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Sample response</div>
                <pre className="overflow-x-auto rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-4 text-[12px] leading-6 text-[var(--xv-chat-text)]">
                  <code>{renderPayload.sampleResponse || "{\"status\":\"ok\"}"}</code>
                </pre>
              </div>
            </div>

            {copyableSource ? (
              <div className="flex justify-end">
                <button className={actionButtonClass} onClick={() => onCopySource(copyableSource)} type="button">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy code</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (renderMode === "database") {
      return (
        <div className="h-full overflow-y-auto p-5">
          <div className="space-y-4">
            {renderPayload.tables?.length ? (
              renderPayload.tables.map((table) => (
                <div
                  className="overflow-hidden rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] shadow-[var(--xv-chat-shadow)]"
                  key={table.name}
                >
                  <div className="border-b border-[var(--xv-chat-border)] px-5 py-4">
                    <div className="text-[14px] font-medium text-[var(--xv-chat-text)]">{table.name}</div>
                    <div className="mt-1 text-[12px] text-[var(--xv-chat-muted)]">Schema preview</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-[12px] text-[var(--xv-chat-text)]">
                      <thead className="bg-[var(--xv-chat-panel)] text-[var(--xv-chat-muted)]">
                        <tr>
                          {table.columns.map((column) => (
                            <th className="px-4 py-3 font-medium" key={column.name}>
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(table.rows?.length ? table.rows : [{}]).map((row, rowIndex) => (
                          <tr className="border-t border-[var(--xv-chat-border)]" key={`${table.name}-row-${rowIndex}`}>
                            {table.columns.map((column) => (
                              <td className="px-4 py-3 text-[var(--xv-chat-muted)]" key={`${table.name}-${column.name}`}>
                                {`${row[column.name] ?? "—"}`}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 text-[13px] leading-6 text-[var(--xv-chat-muted)] shadow-[var(--xv-chat-shadow)]">
                {previewMessage}
              </div>
            )}

            {renderPayload.query ? (
              <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5 shadow-[var(--xv-chat-shadow)]">
                <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">Query</div>
                <pre className="overflow-x-auto rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-4 text-[12px] leading-6 text-[var(--xv-chat-text)]">
                  <code>{renderPayload.query}</code>
                </pre>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    if (renderMode === "markdown") {
      return (
        <div className="h-full overflow-y-auto p-5">
          <div className="rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-6 shadow-[var(--xv-chat-shadow)]">
            <ChatMarkdown content={renderPayload.markdown || renderPayload.sourceCode || previewMessage} />
          </div>
        </div>
      );
    }

    if (renderMode === "pdf" || renderMode === "slides" || renderMode === "image" || renderMode === "video") {
      return (
        <div className="flex h-full items-center justify-center p-5">
          <div className="w-full max-w-[360px] rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-5 py-6 text-center shadow-[var(--xv-chat-shadow)]">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)]">
              <FileText className="h-5 w-5 text-[var(--xv-chat-accent)]" />
            </div>
            <div className="mt-4 text-[15px] font-medium text-[var(--xv-chat-text)]">{renderTypeLabel}</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--xv-chat-muted)]">{previewMessage}</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button className={actionButtonClass} onClick={onRefresh} type="button">
                <RefreshCcw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
              {copyableSource ? (
                <button className={actionButtonClass} onClick={() => onCopySource(copyableSource)} type="button">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy code</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center p-5">
        <div className="w-full max-w-[360px] rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-5 py-6 text-center shadow-[var(--xv-chat-shadow)]">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)]">
            <Code2 className="h-5 w-5 text-[var(--xv-chat-accent)]" />
          </div>
          <div className="mt-4 text-[15px] font-medium text-[var(--xv-chat-text)]">Preview could not render this output.</div>
          <p className="mt-2 text-[13px] leading-6 text-[var(--xv-chat-muted)]">{previewMessage}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button className={actionButtonClass} onClick={onRefresh} type="button">
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
            {copyableSource ? (
              <button className={actionButtonClass} onClick={() => onCopySource(copyableSource)} type="button">
                <Copy className="h-3.5 w-3.5" />
                <span>Copy code</span>
              </button>
            ) : null}
          </div>
          {copyableSource ? (
            <pre className="mt-4 max-h-[220px] overflow-auto rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] p-4 text-left text-[12px] leading-6 text-[var(--xv-chat-text)]">
              <code>{copyableSource}</code>
            </pre>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)]",
        compact ? "h-full" : "border-l xl:sticky xl:top-0"
      )}
    >
      <div className="border-b border-[var(--xv-chat-border)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-[var(--xv-chat-text)]">{previewProjectName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[var(--xv-chat-muted)]">
              <span>{latestPreview ? `Version ${latestPreview.versionNumber}` : "No checkpoint yet"}</span>
              <span>•</span>
              <span>{renderTypeLabel}</span>
              <span>•</span>
              <span className="text-[var(--xv-chat-text)]">{previewStatusLabel}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button aria-label="Refresh" className={iconButtonClass} onClick={onRefresh} title="Refresh" type="button">
              <RefreshCcw className="h-4 w-4" />
            </button>
            {latestPreview ? (
              <button
                aria-label="Open external"
                className={iconButtonClass}
                onClick={() => onExternalOpen(latestPreview, renderPayload)}
                title="Open external"
                type="button"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            ) : null}
            {hasRenderablePreview ? (
              <button
                aria-label="Save checkpoint"
                className={iconButtonClass}
                disabled={savingVersion}
                onClick={onSaveVersion}
                title="Save checkpoint"
                type="button"
              >
                <Save className="h-4 w-4" />
              </button>
            ) : null}
            <button aria-label="Close preview" className={iconButtonClass} onClick={onClose} title="Close" type="button">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-[var(--xv-chat-border)] px-2">
        <div className="flex items-center gap-1 overflow-x-auto py-1.5">
          {(["preview", "files", "timeline", "memory", "deployments"] as const).map((key) => (
            <button
              className={cn(
                "inline-flex h-7 shrink-0 items-center rounded-[8px] px-2.5 text-[11px] font-medium capitalize transition",
                activeTab === key
                  ? "bg-[var(--xv-chat-ghost-bg)] text-[var(--xv-chat-text)]"
                  : "text-[var(--xv-chat-muted)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
              )}
              key={key}
              onClick={() => setActiveTab(key)}
              type="button"
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === "preview" ? (
          <div className="relative h-full min-h-0 bg-[var(--xv-chat-panel)]">{renderPreviewContent()}</div>
        ) : (
          <PreviewSideTab projectId={previewProjectId} tab={activeTab} />
        )}
      </div>

      {activeTab === "preview" ? (
      <div className="border-t border-[var(--xv-chat-border)] px-4 py-3">
        {versions.length ? (
          <div className="mb-2 flex items-center gap-1 overflow-x-auto">
            {versions
              .slice()
              .sort((left, right) => left.versionNumber - right.versionNumber)
              .map((version) => (
                <button
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[10px] font-medium transition",
                    latestPreview?.id === version.id
                      ? "border-[var(--xv-chat-accent)] text-[var(--xv-chat-accent)]"
                      : "border-[var(--xv-chat-border)] text-[var(--xv-chat-muted)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                  )}
                  key={version.id}
                  onClick={() => onExternalOpen(version, version.previewPayload || null)}
                  title={`Open Version ${version.versionNumber}`}
                  type="button"
                >
                  v{version.versionNumber}
                </button>
              ))}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[var(--xv-chat-text)]">
              {latestPreview
                ? `Version ${latestPreview.versionNumber} · ${previewStatusLabel}`
                : hasRenderablePreview
                  ? "Preview ready · Saving checkpoint"
                  : "Waiting for the first preview checkpoint"}
            </div>
            <div className="mt-1 text-[11px] text-[var(--xv-chat-muted)]">
              {latestPreview
                ? `${latestPreview.title} · ${formatRelativeTime(latestPreview.updatedAt)}`
                : hasRenderablePreview
                  ? "Xeivora is attaching this visual checkpoint to the project timeline."
                  : "The project remembers visual progress alongside chat, files, and timeline."}
            </div>
          </div>

          {latestPreview ? (
            <div className="flex flex-wrap items-center gap-2">
              {latestPreview.status !== "approved" ? (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  disabled={updatingId === latestPreview.id}
                  onClick={() => onApprove(latestPreview.id)}
                  type="button"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve checkpoint
                </button>
              ) : null}
              <button
                className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1.5 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingVersion}
                onClick={onSaveVersion}
                type="button"
              >
                <Save className="h-3.5 w-3.5" />
                Save checkpoint
              </button>
              {latestPreview.status !== "deploy_ready" ? (
                <button
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--xv-chat-accent)] px-3 py-1.5 text-[11px] font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={updatingId === latestPreview.id}
                  onClick={() => onMarkDeployReady(latestPreview.id)}
                  type="button"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Mark deploy-ready
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </aside>
  );
}

function DesktopFileExplorerSection({
  activeFilePath,
  expandedFolders,
  fileTree,
  folderLabel,
  folderOpen,
  loading,
  onFileOpen,
  onFolderOpen,
  onFolderToggle
}: {
  activeFilePath: string | null;
  expandedFolders: Record<string, boolean>;
  fileTree: DesktopFileNode[];
  folderLabel: string | null;
  folderOpen: boolean;
  loading: boolean;
  onFileOpen: (filePath: string) => void;
  onFolderOpen: () => void;
  onFolderToggle: (path: string) => void;
}) {
  return (
    <div className="mb-3 border-b border-t border-[var(--xv-chat-border)] py-3">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">Files</p>
        <button
          className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border border-[var(--xv-chat-border-strong)] px-2.5 font-mono text-[11px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
          onClick={onFolderOpen}
          type="button"
        >
          <FolderOpen className="h-3.5 w-3.5 text-[var(--xv-chat-accent)]" />
          <span>{folderOpen ? "Change folder" : "Open folder"}</span>
        </button>
      </div>

      {folderOpen ? (
        <div className="space-y-2">
          <div className="px-2 text-[11px] text-[var(--xv-chat-muted)]">
            {folderLabel || "Project folder"}
          </div>

          <ScrollArea className="max-h-[300px] pr-1">
            <div className="space-y-0.5 px-1">
              {loading ? (
                <div className="px-2 py-2 text-[12px] text-[var(--xv-chat-muted)]">Loading files...</div>
              ) : fileTree.length ? (
                fileTree.map((node) => (
                  <DesktopFileTreeNode
                    activeFilePath={activeFilePath}
                    expandedFolders={expandedFolders}
                    key={node.path}
                    level={0}
                    node={node}
                    onFileOpen={onFileOpen}
                    onFolderToggle={onFolderToggle}
                  />
                ))
              ) : (
                <div className="px-2 py-2 text-[12px] text-[var(--xv-chat-muted)]">No visible files in this folder yet.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="px-2 text-[12px] text-[var(--xv-chat-muted)]">
          Open a folder in the desktop app to browse local files safely inside Xeivora.
        </div>
      )}
    </div>
  );
}

function DesktopFileTreeNode({
  activeFilePath,
  expandedFolders,
  level,
  node,
  onFileOpen,
  onFolderToggle
}: {
  activeFilePath: string | null;
  expandedFolders: Record<string, boolean>;
  level: number;
  node: DesktopFileNode;
  onFileOpen: (filePath: string) => void;
  onFolderToggle: (path: string) => void;
}) {
  const expanded = expandedFolders[node.path] ?? level < 1;
  const isActive = activeFilePath === node.path;

  if (node.isDirectory) {
    return (
      <div>
        <button
          className="flex w-full items-center gap-1 rounded-[6px] px-2 py-1 text-left transition hover:bg-[var(--xv-chat-ghost-bg)]"
          onClick={() => onFolderToggle(node.path)}
          style={{ paddingLeft: `${8 + level * 12}px` }}
          type="button"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--xv-chat-accent)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--xv-chat-accent)]" />
          )}
          <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--xv-chat-accent)]" />
          <span className="truncate text-[12px] text-[var(--xv-chat-text)]">{node.name}</span>
        </button>

        {expanded && node.children?.length ? (
          <div className="space-y-0.5">
            {node.children.map((child: DesktopFileNode) => (
              <DesktopFileTreeNode
                activeFilePath={activeFilePath}
                expandedFolders={expandedFolders}
                key={child.path}
                level={level + 1}
                node={child}
                onFileOpen={onFileOpen}
                onFolderToggle={onFolderToggle}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-[6px] py-1.5 text-left transition",
        isActive
          ? "border-l-2 border-[var(--xv-chat-accent)] bg-[var(--xv-chat-inline-code-bg)]"
          : "hover:bg-[var(--xv-chat-ghost-bg)]"
      )}
      onClick={() => onFileOpen(node.path)}
      style={{ paddingLeft: `${18 + level * 12}px`, paddingRight: "8px" }}
      type="button"
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-[rgba(255,255,255,0.42)]" />
      <span className="truncate text-[12px] text-[var(--xv-chat-muted)]">{node.name}</span>
    </button>
  );
}

function DesktopFilePreviewPanel({
  content,
  filePath,
  onChange,
  onClose,
  onSave,
  saveState
}: {
  content: string;
  filePath: string | null;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  saveState: "idle" | "saving" | "saved" | "error";
}) {
  if (!filePath) {
    return null;
  }

  return (
    <aside className="hidden h-full min-h-0 border-l border-[var(--xv-chat-border)] bg-[var(--xv-chat-sidebar)] xl:flex xl:flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--xv-chat-border)] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-inline-code-bg)] px-3 py-1">
            <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--xv-chat-accent)]" />
            <span className="truncate text-[12px] text-[var(--xv-chat-text)]">{filePath.split(/[\\/]/).pop()}</span>
          </div>
          <p className="mt-1 truncate text-[11px] text-[var(--xv-chat-muted)]">{filePath}</p>
        </div>

        <button
          className="inline-flex h-8 items-center gap-2 rounded-[10px] border border-[var(--xv-chat-border-strong)] px-3 text-[12px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
          onClick={onSave}
          type="button"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{desktopSaveLabel(saveState)}</span>
        </button>

        <button
          aria-label="Close file preview"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        className="h-full min-h-0 w-full resize-none bg-transparent px-4 py-4 font-mono text-[12px] leading-6 text-[var(--xv-chat-text)] outline-none"
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        value={content}
      />
    </aside>
  );
}

function DesktopWelcomeOverlay({
  onComplete,
  onOpenFolder
}: {
  onComplete: () => void;
  onOpenFolder: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(14,11,8,0.82)] px-6 backdrop-blur-sm">
      <div className="w-full max-w-[560px] rounded-[26px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-sidebar)] p-8 shadow-[var(--xv-chat-shadow)]">
        <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-inline-code-bg)] px-4 py-2">
          <XeivoraGlyph size={20} />
          <span className="text-[12px] font-medium tracking-[0.12em] text-[var(--xv-chat-text)]">XEIVORA DESKTOP</span>
        </div>

        <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-[var(--xv-chat-text)]">Welcome to Xeivora</h2>
        <p className="mt-3 max-w-[44ch] text-[15px] leading-7 text-[var(--xv-chat-muted)]">
          Your workspace is ready. Sign in, open a project folder when you want desktop context, and continue project work without losing context.
        </p>

        <div className="mt-6 space-y-3 rounded-[20px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-5">
          {[
            "1. Sign in to your Xeivora account",
            "2. Open a project folder (optional)",
            "3. Start chatting"
          ].map((step) => (
            <div className="flex items-start gap-3 text-[14px] text-[var(--xv-chat-text)]" key={step}>
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--xv-chat-accent)]" />
              <span>{step}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[13px] leading-6 text-[var(--xv-chat-muted)]">
          Xeivora accesses files only in folders you explicitly open. Your code stays private to this desktop session.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--xv-chat-accent)] px-5 text-[14px] font-medium text-white transition hover:brightness-95"
            onClick={onComplete}
            type="button"
          >
            <span>Get started</span>
            <ArrowUp className="h-4 w-4 -rotate-45" />
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--xv-chat-border-strong)] px-5 text-[14px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
            onClick={onOpenFolder}
            type="button"
          >
            <FolderOpen className="h-4 w-4 text-[var(--xv-chat-accent)]" />
            <span>Open project folder</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function DesktopToolBar({
  activeFilePath,
  folderOpen,
  onListFiles,
  onOpenFolder,
  onReadActiveFile,
  onRunCommand
}: {
  activeFilePath: string | null;
  folderOpen: boolean;
  onListFiles: () => void;
  onOpenFolder: () => void;
  onReadActiveFile: () => void;
  onRunCommand: () => void;
}) {
  const activeFileLabel = activeFilePath?.split(/[\\/]/).pop() || "No file open";

  return (
    <div className="rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">
          Desktop xvr tools
        </p>
        <span className="truncate text-[11px] text-[var(--xv-chat-muted)]">
          {folderOpen ? activeFileLabel : "Open a folder to enable local tools"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <DesktopToolButton icon={FolderOpen} label={folderOpen ? "Change folder" : "Open folder"} onClick={onOpenFolder} />
        <DesktopToolButton disabled={!folderOpen} icon={Search} label="xvr_list_files" onClick={onListFiles} />
        <DesktopToolButton disabled={!activeFilePath} icon={FileText} label="xvr_read_file" onClick={onReadActiveFile} />
        <DesktopToolButton disabled={!folderOpen} icon={Code2} label="xvr_run_command" onClick={onRunCommand} />
      </div>
    </div>
  );
}

function DesktopToolButton({
  disabled = false,
  icon: Icon,
  label,
  onClick
}: {
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-sidebar)] px-3 font-mono text-[11px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)] disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--xv-chat-accent)]" />
      <span>{label}</span>
    </button>
  );
}

function DesktopCommandModal({
  command,
  onChange,
  onClose,
  onRun,
  onSendToChat,
  result,
  running
}: {
  command: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onRun: () => void;
  onSendToChat: () => void;
  result: DesktopCommandResult | null;
  running: boolean;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(14,11,8,0.76)] px-6 backdrop-blur-sm">
      <div className="w-full max-w-[760px] rounded-[24px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-sidebar)] p-5 shadow-[var(--xv-chat-shadow)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">xvr_run_command</p>
            <h3 className="mt-1 text-[20px] font-medium text-[var(--xv-chat-text)]">Run a local command safely</h3>
          </div>
          <button
            aria-label="Close command runner"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-3">
          <input
            className="h-11 flex-1 rounded-[14px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-4 text-[14px] text-[var(--xv-chat-text)] outline-none placeholder:text-[var(--xv-chat-muted)] focus:border-[var(--xv-chat-accent)]"
            onChange={(event) => onChange(event.target.value)}
            placeholder="npm run lint"
            value={command}
          />
          <button
            className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--xv-chat-accent)] px-4 text-[14px] font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!command.trim() || running}
            onClick={onRun}
            type="button"
          >
            {running ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Code2 className="h-4 w-4" />}
            <span>{running ? "Running..." : "Run command"}</span>
          </button>
        </div>

        {result ? (
          <div className="mt-4 rounded-[18px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-mono text-[12px] text-[var(--xv-chat-text)]">{result.command}</div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                  result.success
                    ? "border-[var(--xv-chat-border-strong)] text-[var(--xv-chat-accent)]"
                    : "border-[rgba(239,68,68,0.28)] text-[#ef4444]"
                )}
              >
                {result.success ? "Completed" : "Failed"}
              </span>
            </div>
            <pre className="max-h-[320px] overflow-auto rounded-[14px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-code-bg)] p-4 font-mono text-[12px] leading-6 text-[var(--xv-chat-code-text)]">
{formatDesktopCommandOutput(result)}
            </pre>
            <div className="mt-4 flex justify-end">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-[var(--xv-chat-border-strong)] px-4 text-[13px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                onClick={onSendToChat}
                type="button"
              >
                <MessageSquareText className="h-4 w-4 text-[var(--xv-chat-accent)]" />
                <span>Send output to Xeivora</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DesktopApplyDiffModal({
  draft,
  onApply,
  onClose,
  saveState
}: {
  draft: DesktopApplyDraft;
  onApply: () => void;
  onClose: () => void;
  saveState: DesktopSaveState;
}) {
  const targetName = draft.targetPath.split(/[\\/]/).pop() || draft.targetPath;
  const diffLines = buildSimpleDiffLines(draft.currentContent, draft.nextContent);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(14,11,8,0.76)] px-6 backdrop-blur-sm">
      <div className="w-full max-w-[920px] rounded-[24px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-sidebar)] p-5 shadow-[var(--xv-chat-shadow)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">xvr_write_file</p>
            <h3 className="mt-1 text-[20px] font-medium text-[var(--xv-chat-text)]">Xeivora wants to modify {targetName}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[var(--xv-chat-muted)]">
              Review the proposed diff below, then apply the change only if it looks right.
            </p>
          </div>
          <button
            aria-label="Close apply diff"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-code-bg)]">
          <div className="border-b border-[var(--xv-chat-border)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--xv-chat-muted)]">
            Proposed diff
          </div>
          <div className="max-h-[420px] overflow-auto px-4 py-4 font-mono text-[12px] leading-6 text-[var(--xv-chat-code-text)]">
            {diffLines.map((line, index) => (
              <div
                className={cn(
                  line.startsWith("+")
                    ? "text-[#8fd17a]"
                    : line.startsWith("-")
                      ? "text-[#f4a3a3]"
                      : "text-[var(--xv-chat-code-text)]"
                )}
                key={`${index}-${line}`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-[var(--xv-chat-border-strong)] px-4 text-[14px] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[var(--xv-chat-accent)] px-4 text-[14px] font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
            disabled={saveState === "saving"}
            onClick={onApply}
            type="button"
          >
            {saveState === "saving" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{saveState === "saving" ? "Applying..." : "Apply changes"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatTopbar({
  connectedProviders,
  continuityStatus,
  currentModelSummary,
  fallbackSummary,
  model,
  modelPulseActive,
  modelMenuOpen,
  modelOptions,
  onShare,
  onSelectModel,
  onToggleStatus,
  onToggleModelMenu,
  orchestrationSteps,
  routeLabel,
  selectedModelPreset,
  shareFeedback,
  shareReady,
  statusOpen,
  systemIndicatorLive,
  title,
  workflowMode
}: {
  connectedProviders: number;
  continuityStatus: ContinuityState;
  currentModelSummary: string;
  fallbackSummary: string;
  model: ModelPillData;
  modelPulseActive: boolean;
  modelMenuOpen: boolean;
  modelOptions: readonly ModelPickerOption[];
  onShare: () => void;
  onSelectModel: (presetId: ModelPickerId) => void;
  onToggleStatus: () => void;
  onToggleModelMenu: () => void;
  orchestrationSteps: OrchestrationStep[];
  routeLabel: string;
  selectedModelPreset: ModelPickerId;
  shareFeedback: string | null;
  shareReady: boolean;
  statusOpen: boolean;
  systemIndicatorLive: boolean;
  title: string;
  workflowMode: WorkflowMode;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 border-b border-[var(--xv-chat-border)] bg-[color:var(--xv-chat-bg)]/92 backdrop-blur">
      <div className="flex h-[50px] items-center gap-3 px-4 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="max-w-[460px] overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-medium text-[var(--xv-chat-text)]">
            {title}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggleButton
            className="h-8 w-8 border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] text-[var(--xv-chat-text)] hover:bg-[var(--xv-chat-ghost-bg)]"
            compact
          />

          <div className="relative">
            <button
              className="inline-flex h-8 items-center gap-[5px] rounded-full border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-[10px] text-[12px] text-[var(--xv-chat-text)]"
              onClick={(event) => {
                event.stopPropagation();
                onToggleModelMenu();
              }}
              type="button"
            >
              <ModelPill model={model} pulse={modelPulseActive} />
            </button>

            <AnimatePresence>
              {modelMenuOpen ? (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-[calc(100%+10px)] z-30 w-[320px] rounded-[18px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-3 shadow-[var(--xv-chat-shadow)]"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  onClick={(event) => event.stopPropagation()}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <p className="px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">
                    Active Model
                  </p>
                  <div className="mt-2 space-y-1">
                    {modelOptions.map((option) => {
                      const selected = option.id === selectedModelPreset;
                      return (
                        <button
                          className={cn(
                            "flex w-full items-start gap-3 rounded-[12px] px-3 py-2 text-left transition",
                            selected ? "bg-[var(--xv-chat-inline-code-bg)]" : "hover:bg-[var(--xv-chat-ghost-bg)]"
                          )}
                          key={option.id}
                          onClick={() => onSelectModel(option.id)}
                          type="button"
                        >
                          <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.dotColor }} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--xv-chat-text)]">
                              <span>{option.label}</span>
                              <span className="text-[11px] text-[var(--xv-chat-muted)]">
                                {option.tier === "fast"
                                  ? "Fast"
                                  : option.tier === "balanced"
                                    ? "Balanced"
                                    : "Powerful"}
                              </span>
                            </span>
                            <span className="mt-1 block text-[11px] leading-5 text-[var(--xv-chat-muted)]">
                              {option.description}
                            </span>
                          </span>
                          {selected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--xv-chat-accent)]" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <button
            aria-label="Share chat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={!shareReady}
            onClick={onShare}
            title={shareFeedback || "Share"}
            type="button"
          >
            <Share2 className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              aria-label="Open workspace status"
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
              onClick={(event) => {
                event.stopPropagation();
                onToggleStatus();
              }}
              type="button"
            >
              <Ellipsis className="h-4 w-4" />
              {systemIndicatorLive ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--xv-chat-accent)]" />
              ) : null}
            </button>

            <AnimatePresence>
              {statusOpen ? (
                <motion.div
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-[calc(100%+10px)] z-30 w-[300px] rounded-[18px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-4 shadow-[var(--xv-chat-shadow)]"
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  onClick={(event) => event.stopPropagation()}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <div className="mb-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--xv-chat-muted)]">
                      Xeivora continuity
                    </p>
                    <p className="mt-1 text-sm text-[var(--xv-chat-text)]">{routeLabel}</p>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <StatusRow label="Project Memory" value={currentModelSummary} />
                    <StatusRow label="Preview state" value={fallbackSummary} />
                    <StatusRow label="Continuity" value={continuityStatus.memoryPreserved ? "Active" : "Syncing"} />
                    <StatusRow
                      label="Context"
                      value={continuityStatus.contextCompressed ? "Compressed" : "Preserved"}
                    />
                    <StatusRow label="Workflow" value={workflowModeLabel(workflowMode)} />
                    <StatusRow
                      label="Providers online"
                      value={`${connectedProviders}/${Math.max(connectedProviders, 3)}`}
                    />
                    {orchestrationSteps.length ? (
                      <StatusRow
                        label="Latest step"
                        value={orchestrationSteps[orchestrationSteps.length - 1]?.label ?? "Working"}
                      />
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function ChatHomeView({
  activeProject,
  composerRef,
  desktopRightInset = 0,
  projects,
  desktopToolBar,
  error,
  fileInputRef,
  isDesktop,
  isStreaming,
  isUploadingFiles,
  onFilesSelected,
  onPromptChange,
  onRemoveFile,
  onSend,
  onStartVoiceCapture,
  onStop,
  onStopVoiceCapture,
  connectedIntegrations,
  enabledIntegrationProviders,
  onToggleIntegration,
  prompt,
  sessionFiles,
  voiceState
}: {
  activeProject: WorkspaceProject | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  desktopRightInset?: number;
  projects: WorkspaceProject[];
  desktopToolBar?: ReactNode;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDesktop: boolean;
  isStreaming: boolean;
  isUploadingFiles: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onPromptChange: (value: string) => void;
  onRemoveFile: (fileId: string) => void;
  onSend: () => void;
  onStartVoiceCapture: () => void;
  onStop: () => void;
  onStopVoiceCapture: () => void;
  connectedIntegrations: IntegrationConnectionSummary[];
  enabledIntegrationProviders: IntegrationProvider[];
  onToggleIntegration: (provider: IntegrationProvider) => void;
  prompt: string;
  sessionFiles: UploadedFileSummary[];
  voiceState: VoiceState;
}) {
  const router = useRouter();
  const recentProject = useMemo(
    () =>
      [...projects]
        .filter(hasProjectContinuity)
        .sort(
        (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )[0] || null,
    [projects]
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-[calc(100vh-170px)] w-full max-w-[960px] flex-col items-center justify-center px-5 pb-10 pt-8">
          {activeProject ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[560px] text-center"
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--xv-chat-muted)]">
                Current project
              </div>
              <h1 className="mt-3 text-[28px] font-medium tracking-[-0.02em] text-[var(--xv-chat-text)]">
                {activeProject.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12px] text-[var(--xv-chat-muted)]">
                <span className="rounded-full border border-[var(--xv-chat-border)] px-2.5 py-1">
                  Last active {formatRelativeTime(activeProject.updatedAt)}
                </span>
                <span className="rounded-full border border-[var(--xv-chat-border)] px-2.5 py-1">
                  {activeProject.memoryCount} memory
                </span>
                <span className="rounded-full border border-[var(--xv-chat-border)] px-2.5 py-1">
                  {activeProject.fileCount} files
                </span>
                <span className="rounded-full border border-[var(--xv-chat-border)] px-2.5 py-1">
                  {activeProject.chatCount} chats
                </span>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="flex h-12 w-12 items-center justify-center"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <XeivoraGlyph size={40} />
              </motion.div>

              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-center text-[28px] font-medium tracking-[-0.02em] text-[var(--xv-chat-text)]"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.02 }}
              >
                What would you like to work on?
              </motion.h1>

              <motion.p
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 max-w-[420px] text-center text-[14px] font-light leading-[1.6] text-[var(--xv-chat-muted)]"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.04 }}
              >
                Start a project or continue an existing one.
              </motion.p>

              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex w-full max-w-[560px] flex-wrap items-center justify-center gap-2"
                initial={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
              >
                <button
                  className="inline-flex items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-2 text-[13px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  onClick={() =>
                    router.push(
                      recentProject ? `/chat?project=${encodeURIComponent(recentProject.id)}` : "/dashboard"
                    )
                  }
                  type="button"
                >
                  Continue Project
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-2 text-[13px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  onClick={() =>
                    router.push(recentProject ? `/memory?project=${encodeURIComponent(recentProject.id)}` : "/memory")
                  }
                  type="button"
                >
                  Open Memory
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-2 text-[13px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  onClick={() =>
                    router.push(recentProject ? `/timeline?project=${encodeURIComponent(recentProject.id)}` : "/timeline")
                  }
                  type="button"
                >
                  View Timeline
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-2 text-[13px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  onClick={() => router.push("/dashboard")}
                  type="button"
                >
                  Create Project
                </button>
              </motion.div>
            </>
          )}

          {error ? <ErrorBanner className="mt-6 w-full max-w-[660px]" message={error} /> : null}
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] px-4 pb-4 pt-4 md:left-[260px] md:px-6"
        style={desktopRightInset > 0 ? { right: `${desktopRightInset}px` } : undefined}
      >
        <ChatComposer
          composerRef={composerRef}
          connectedIntegrations={connectedIntegrations}
          desktopToolBar={desktopToolBar}
          enabledIntegrationProviders={enabledIntegrationProviders}
          fileInputRef={fileInputRef}
          files={sessionFiles}
          isDesktop={isDesktop}
          isStreaming={isStreaming}
          isUploadingFiles={isUploadingFiles}
          onFilesSelected={onFilesSelected}
          onPromptChange={onPromptChange}
          onRemoveFile={onRemoveFile}
          onSend={onSend}
          onStartVoiceCapture={onStartVoiceCapture}
          onStop={onStop}
          onStopVoiceCapture={onStopVoiceCapture}
          onToggleIntegration={onToggleIntegration}
          prompt={prompt}
          voiceState={voiceState}
        />
      </div>
    </div>
  );
}

function ChatThreadView({
  activeDesktopFilePath,
  composerRef,
  copiedResponseId,
  desktopRightInset = 0,
  desktopFolderOpen,
  desktopToolBar,
  error,
  feedbackByMessageId,
  fileInputRef,
  isDesktop,
  isStreaming,
  isUploadingFiles,
  lastAssistantMessage,
  messages,
  messagesRef,
  onApplyAssistantCode,
  onCopyResponse,
  onFeedback,
  onFilesSelected,
  onOpenPreview,
  onPromptChange,
  onRegenerate,
  onRegenerateImage,
  onRemoveFile,
  onRetry,
  onSend,
  onStartVoiceCapture,
  onStop,
  onStopVoiceCapture,
  prompt,
  sessionFiles,
  thinking,
  toolExecutionsByMessageId,
  voiceState
}: {
  activeDesktopFilePath: string | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  copiedResponseId: string | null;
  desktopRightInset?: number;
  desktopFolderOpen: boolean;
  desktopToolBar?: ReactNode;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isDesktop: boolean;
  isStreaming: boolean;
  isUploadingFiles: boolean;
  lastAssistantMessage: ChatMessage | null;
  messages: ChatMessage[];
  messagesRef: RefObject<HTMLDivElement | null>;
  onApplyAssistantCode: (message: ChatMessage) => void;
  onCopyResponse: (message: ChatMessage) => Promise<void>;
  onFeedback: (messageId: string, value: "good" | "bad") => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onOpenPreview: (projectId?: string | null, sessionId?: string | null) => void;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
  onRegenerateImage: (messageId: string, executionId: string, prompt: string, count?: number) => Promise<void> | void;
  onRemoveFile: (fileId: string) => void;
  onRetry: () => void;
  onSend: () => void;
  onStartVoiceCapture: () => void;
  onStop: () => void;
  onStopVoiceCapture: () => void;
  prompt: string;
  sessionFiles: UploadedFileSummary[];
  thinking: boolean;
  toolExecutionsByMessageId: Record<string, ChatToolExecution[]>;
  voiceState: VoiceState;
  feedbackByMessageId: Record<string, "good" | "bad">;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef}>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-5 px-5 pb-[140px] pt-6 sm:px-8 lg:px-10">
          {error ? <ErrorBanner message={error} /> : null}

          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const isLatestAssistant = lastAssistantMessage?.id === message.id;
              const toolExecutions = toolExecutionsByMessageId[message.id] || [];
              const showDocumentWriterLogoOnly =
                !message.content.trim() &&
                toolExecutions.length === 1 &&
                toolExecutions[0]?.name === "document_writer";
              const feedback = feedbackByMessageId[message.id];
              const canApplyAssistantCode =
                isDesktop && desktopFolderOpen && Boolean(activeDesktopFilePath) && Boolean(extractPrimaryCodeBlock(message.content));

              if (!isAssistant) {
                return (
                  <MessageErrorBoundary key={message.id}>
                    <motion.article
                      animate={{ opacity: 1, y: 0 }}
                      className="flex justify-end"
                      initial={{ opacity: 0, y: 14 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <div className="ml-auto min-w-[120px] max-w-[65%]">
                        <div className="mb-1 text-right text-[12px] font-normal text-[var(--xv-chat-muted)]">You</div>
                        <div className="rounded-[18px_18px_4px_18px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-[18px] py-3 text-[14px] font-light leading-[1.75] text-[var(--xv-chat-text)]">
                          {message.content}
                        </div>
                      </div>
                    </motion.article>
                  </MessageErrorBoundary>
                );
              }

              if (showDocumentWriterLogoOnly) {
                return (
                  <MessageErrorBoundary key={message.id}>
                    <motion.article
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                      initial={{ opacity: 0, y: 14 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          className="flex items-center justify-center"
                          transition={{ duration: 7, ease: "linear", repeat: Infinity }}
                        >
                          <XeivoraGlyph size={42} />
                        </motion.div>
                      </div>
                    </motion.article>
                  </MessageErrorBoundary>
                );
              }

              return (
                <MessageErrorBoundary key={message.id}>
                    <motion.article
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex gap-3"
                      initial={{ opacity: 0, y: 14 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                      <AvatarBubble />
                      <div className="min-w-0 max-w-[85%] flex-1">
                        <div className="mb-1 text-[13px] font-medium text-[var(--xv-chat-text)]">Xeivora</div>

                        {toolExecutions.length ? (
                          <ToolExecutionGroup
                            executions={toolExecutions}
                            messageId={message.id}
                            onOpenPreview={onOpenPreview}
                            onRegenerateImage={onRegenerateImage}
                          />
                        ) : null}

                        {message.content ? (
                          <div className="text-[14px] font-light leading-[1.75] text-[var(--xv-chat-text)]">
                            <ChatMarkdown content={toXeivoraLabel(message.content)} />
                          </div>
                        ) : toolExecutions.length ? null : (
                          <ThinkingBlock active={thinking || isStreaming} />
                        )}

                        {message.content ? (
                          <div className="mt-3 flex items-center gap-4 opacity-0 transition group-hover:opacity-100">
                            <button
                              className="text-[12px] text-[var(--xv-chat-muted)] transition hover:text-[var(--xv-chat-text)]"
                              onClick={() => void onCopyResponse(message)}
                              type="button"
                            >
                              {copiedResponseId === message.id ? "Copied" : "Copy"}
                            </button>
                            <button
                              className={cn(
                                "inline-flex items-center gap-1 text-[12px] transition",
                                feedback === "good"
                                  ? "text-[var(--xv-chat-accent)]"
                                  : "text-[var(--xv-chat-muted)] hover:text-[var(--xv-chat-text)]"
                              )}
                              onClick={() => onFeedback(message.id, "good")}
                              type="button"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span>Good</span>
                            </button>
                            <button
                              className={cn(
                                "inline-flex items-center gap-1 text-[12px] transition",
                                feedback === "bad"
                                  ? "text-[#ef4444]"
                                  : "text-[var(--xv-chat-muted)] hover:text-[var(--xv-chat-text)]"
                              )}
                              onClick={() => onFeedback(message.id, "bad")}
                              type="button"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                              <span>Bad</span>
                            </button>
                            {isLatestAssistant ? (
                              <>
                                <button
                                  className="text-[12px] text-[var(--xv-chat-muted)] transition hover:text-[var(--xv-chat-text)]"
                                  onClick={onRegenerate}
                                  type="button"
                                >
                                  Regenerate
                                </button>
                                <button
                                  className="text-[12px] text-[var(--xv-chat-muted)] transition hover:text-[var(--xv-chat-text)]"
                                  onClick={onRetry}
                                  type="button"
                                >
                                  Retry
                                </button>
                              </>
                            ) : null}
                            {canApplyAssistantCode ? (
                              <button
                                className="text-[12px] text-[var(--xv-chat-accent)] transition hover:text-[var(--xv-chat-text)]"
                                onClick={() => onApplyAssistantCode(message)}
                                type="button"
                              >
                                Apply to open file
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                  </motion.article>
                </MessageErrorBoundary>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] px-4 pb-4 pt-4 md:left-[260px] md:px-6"
        style={desktopRightInset > 0 ? { right: `${desktopRightInset}px` } : undefined}
      >
        <ChatComposer
          composerRef={composerRef}
          desktopToolBar={desktopToolBar}
          fileInputRef={fileInputRef}
          files={sessionFiles}
          isDesktop={isDesktop}
          isStreaming={isStreaming}
          isUploadingFiles={isUploadingFiles}
          onFilesSelected={onFilesSelected}
          onPromptChange={onPromptChange}
          onRemoveFile={onRemoveFile}
          onSend={onSend}
          onStartVoiceCapture={onStartVoiceCapture}
          onStop={onStop}
          onStopVoiceCapture={onStopVoiceCapture}
          prompt={prompt}
          voiceState={voiceState}
        />
      </div>
    </div>
  );
}

type ChatComposerProps = {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  connectedIntegrations?: IntegrationConnectionSummary[];
  desktopToolBar?: ReactNode;
  enabledIntegrationProviders?: IntegrationProvider[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: UploadedFileSummary[];
  isDesktop: boolean;
  isStreaming: boolean;
  isUploadingFiles: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onPromptChange: (value: string) => void;
  onRemoveFile: (fileId: string) => void;
  onSend: () => void;
  onStartVoiceCapture: () => void;
  onStop: () => void;
  onStopVoiceCapture: () => void;
  onToggleIntegration?: (provider: IntegrationProvider) => void;
  prompt: string;
  voiceState: VoiceState;
};

function ChatComposer({
  composerRef,
  connectedIntegrations = [],
  desktopToolBar,
  enabledIntegrationProviders = [],
  fileInputRef,
  files,
  isDesktop,
  isStreaming,
  isUploadingFiles,
  onFilesSelected,
  onPromptChange,
  onRemoveFile,
  onSend,
  onStartVoiceCapture,
  onStop,
  onStopVoiceCapture,
  onToggleIntegration,
  prompt,
  voiceState
}: ChatComposerProps) {
  return (
    <div className="mx-auto w-full max-w-[760px] pl-0 md:pl-10">
      {connectedIntegrations.length > 0 && onToggleIntegration ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-2">
          {connectedIntegrations.map((integration) => {
            const enabled = enabledIntegrationProviders.includes(integration.provider);

            return (
              <button
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                  enabled
                    ? "border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-inline-code-bg)] text-[var(--xv-chat-text)]"
                    : "border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] text-[var(--xv-chat-muted)] hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                )}
                key={integration.provider}
                onClick={() => onToggleIntegration(integration.provider)}
                type="button"
              >
                {integration.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {isDesktop && desktopToolBar ? <div className="mb-3">{desktopToolBar}</div> : null}
      <form
        className="rounded-[18px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-[10px] py-2 shadow-[var(--xv-chat-shadow)] focus-within:border-[var(--xv-chat-accent)]"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input
          className="hidden"
          multiple
          onChange={(event) => {
            if (event.target.files?.length) {
              onFilesSelected(event.target.files);
            }
          }}
          ref={fileInputRef}
          type="file"
        />

        {(files.length > 0 || isUploadingFiles) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
            {files.map((file) => (
              <div
                className="inline-flex items-center gap-2 rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-3 py-1 text-[12px] text-[var(--xv-chat-text)]"
                key={file.id}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  aria-label={`Remove ${file.name}`}
                  className="text-[var(--xv-chat-muted)] transition hover:text-[var(--xv-chat-text)]"
                  onClick={(event) => {
                    event.preventDefault();
                    onRemoveFile(file.id);
                  }}
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {isUploadingFiles ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-3 py-1 text-[12px] text-[var(--xv-chat-text)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing file...</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            aria-label="Attach file"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            className="min-h-[22px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] font-light leading-[1.5] text-[var(--xv-chat-text)] outline-none placeholder:text-[var(--xv-chat-muted)]"
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Continue your work with full context..."
            ref={composerRef}
            rows={1}
            value={prompt}
          />

          <div className="flex shrink-0 items-center gap-1">
            <button
              aria-label="Voice input"
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
              onMouseDown={() => void onStartVoiceCapture()}
              onMouseLeave={onStopVoiceCapture}
              onMouseUp={onStopVoiceCapture}
              onTouchEnd={onStopVoiceCapture}
              onTouchStart={() => void onStartVoiceCapture()}
              type="button"
            >
              {voiceState === "idle" ? (
                <Mic className="h-4 w-4" />
              ) : voiceState === "listening" ? (
                <AudioLines className="h-4 w-4 animate-pulse text-[var(--xv-chat-accent)]" />
              ) : (
                <LoaderCircle className="h-4 w-4 animate-spin text-[var(--xv-chat-accent)]" />
              )}
            </button>

            {isStreaming ? (
              <button
                aria-label="Stop generating"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--xv-chat-accent)] text-white transition hover:brightness-95"
                onClick={onStop}
                type="button"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                aria-label="Send message"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--xv-chat-accent)] text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--xv-chat-surface-soft)] disabled:text-[var(--xv-chat-muted)]"
                disabled={!prompt.trim() && !files.length}
                type="submit"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {voiceState !== "idle" ? (
          <div className="mt-2 flex items-center justify-between px-2 text-[12px] text-[var(--xv-chat-muted)]">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5" />
              <span>{voiceState === "listening" ? "Listening… release to transcribe" : "Transcribing…"}</span>
            </div>
            {voiceState === "listening" ? <Square className="h-3.5 w-3.5 text-[var(--xv-chat-accent)]" /> : null}
          </div>
        ) : null}
      </form>

      <p className="mt-3 text-center text-[12px] font-light text-[var(--xv-chat-muted)]">
        Xeivora remembers conversations, files, decisions, and progress automatically.
      </p>
    </div>
  );
}

function ToolExecutionGroup({
  executions,
  messageId,
  onOpenPreview,
  onRegenerateImage
}: {
  executions: ChatToolExecution[];
  messageId: string;
  onOpenPreview: (projectId?: string | null, sessionId?: string | null) => void;
  onRegenerateImage: (messageId: string, executionId: string, prompt: string, count?: number) => Promise<void> | void;
}) {
  const [expandedImage, setExpandedImage] = useState<ExecutionImage | null>(null);
  const [editingExecutionId, setEditingExecutionId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState("");

  return (
    <>
      <div className="mb-3 space-y-2">
      {executions.map((execution) => {
        const previewImages = getExecutionImages(execution);
        const isImageExecution = execution.name === "image_generation";
        const isLoading = execution.status === "running" || execution.payload?.loading === true;

        if (isImageExecution) {
          const modelLabel = getExecutionModelLabel(execution);
          const promptValue =
            typeof execution.payload?.prompt === "string" && execution.payload.prompt
              ? execution.payload.prompt
              : "Generated image";
          const imageCount = getExecutionImageCount(execution);
          const isEditing = editingExecutionId === execution.id;

          return (
            <div
              className="max-w-[480px] overflow-hidden rounded-[20px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] shadow-[var(--xv-chat-shadow)]"
              key={execution.id}
            >
              {isLoading ? (
                <div className="px-4 pb-4 pt-4">
                  <div className="flex aspect-square items-center justify-center rounded-[16px] border border-[var(--xv-chat-border)] bg-[linear-gradient(135deg,rgba(201,100,66,0.08),rgba(201,100,66,0.18),rgba(201,100,66,0.08))] bg-[length:200%_200%] animate-pulse">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <LoaderCircle className="h-6 w-6 animate-spin text-[var(--xv-chat-accent)]" />
                      <p className="text-[13px] font-medium text-[var(--xv-chat-text)]">Generating your image...</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-[var(--xv-chat-inline-code-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--xv-chat-accent)]">
                      Generated by {modelLabel}
                    </span>
                    <span className="text-[11px] text-[var(--xv-chat-muted)]">Creating {imageCount > 1 ? `${imageCount} variations` : "1 image"}</span>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 pt-4">
                  <div className={cn("grid gap-3", previewImages.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                    {previewImages.map((image) => (
                      <div
                        className="overflow-hidden rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)]"
                        key={image.id}
                      >
                        <button
                          className="block w-full"
                          onClick={() => setExpandedImage(image)}
                          type="button"
                        >
                          <Image
                            alt={image.revisedPrompt || promptValue}
                            className="aspect-square w-full object-cover transition hover:scale-[1.01]"
                            height={1024}
                            src={image.url}
                            unoptimized
                            width={1024}
                          />
                        </button>
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0 text-[11px] text-[var(--xv-chat-muted)]">
                            <div className="truncate">{image.revisedPrompt || promptValue}</div>
                          </div>
                          <a
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                            download={`${image.id}.png`}
                            href={image.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[var(--xv-chat-inline-code-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--xv-chat-accent)]">
                      Generated by {modelLabel}
                    </span>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                      onClick={() => void onRegenerateImage(messageId, execution.id, promptValue, imageCount)}
                      type="button"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      <span>Regenerate</span>
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                      onClick={() => {
                        setEditingExecutionId(execution.id);
                        setEditingPrompt(promptValue);
                      }}
                      type="button"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Edit prompt</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <form
                      className="mt-3 rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)] p-3"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const nextPrompt = editingPrompt.trim();
                        if (!nextPrompt) {
                          return;
                        }

                        setEditingExecutionId(null);
                        await onRegenerateImage(messageId, execution.id, nextPrompt, imageCount);
                      }}
                    >
                      <input
                        className="w-full rounded-[12px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-3 py-2 text-[13px] text-[var(--xv-chat-text)] outline-none placeholder:text-[var(--xv-chat-muted)] focus:border-[var(--xv-chat-accent)]"
                        onChange={(event) => setEditingPrompt(event.target.value)}
                        placeholder="Describe the image you want"
                        value={editingPrompt}
                      />
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          className="rounded-full border border-[var(--xv-chat-border)] px-3 py-1 text-[11px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
                          onClick={() => {
                            setEditingExecutionId(null);
                            setEditingPrompt("");
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-full bg-[var(--xv-chat-accent)] px-3 py-1 text-[11px] font-medium text-white transition hover:brightness-95"
                          type="submit"
                        >
                          Update image
                        </button>
                      </div>
                    </form>
                  ) : null}

                  {execution.summary && execution.connected ? (
                    <p className="mt-3 text-[12px] text-[var(--xv-chat-muted)]">{execution.summary}</p>
                  ) : null}
                </div>
              )}

              {!execution.connected && !isLoading ? (
                <div className="border-t border-[var(--xv-chat-border)] px-4 py-3 text-[12px] text-[#ef4444]">
                  {execution.summary}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div
            className={cn(
              "rounded-[14px] border px-3 py-2.5",
              execution.status === "error"
                ? "border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)]"
                : execution.connected
                  ? "border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-inline-code-bg)]"
                  : "border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface-soft)]"
            )}
            key={execution.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[var(--xv-chat-text)]">{execution.uiLabel}</div>
                <div className="mt-0.5 text-[12px] text-[var(--xv-chat-muted)]">{execution.summary}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em]",
                  execution.status === "error"
                    ? "border-[rgba(239,68,68,0.28)] text-[#ef4444]"
                    : execution.connected
                      ? "border-[var(--xv-chat-border-strong)] text-[var(--xv-chat-accent)]"
                      : "border-[var(--xv-chat-border)] text-[var(--xv-chat-muted)]"
                )}
              >
                {formatToolStatus(execution)}
              </span>
            </div>

            {execution.name === "code_assistant" && typeof execution.payload?.previewHref === "string" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                  onClick={() => {
                    const previewVersion = getExecutionPreviewVersion(execution);
                    onOpenPreview(previewVersion?.projectId || null, previewVersion?.sessionId || null);
                  }}
                  type="button"
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Open in workspace</span>
                </button>
                {typeof execution.payload?.routePath === "string" ? (
                  <a
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1 text-[11px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                    href={execution.payload.routePath}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open external</span>
                  </a>
                ) : null}
                {typeof execution.payload?.previewVersion === "object" && execution.payload.previewVersion ? (
                  <span className="inline-flex items-center rounded-full bg-[var(--xv-chat-inline-code-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--xv-chat-accent)]">
                    Version {(execution.payload.previewVersion as { versionNumber?: number }).versionNumber || 1}
                  </span>
                ) : null}
              </div>
            ) : null}

            {previewImages.length ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {previewImages.map((image) => (
                  <div
                    className="overflow-hidden rounded-[14px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)]"
                    key={image.id}
                  >
                    <Image
                      alt={image.revisedPrompt || "Generated Xeivora image"}
                      className="aspect-square w-full bg-[var(--xv-chat-surface-soft)] object-cover"
                      height={768}
                      src={image.url}
                      unoptimized
                      width={768}
                    />
                    <div className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0 text-[11px] text-[var(--xv-chat-muted)]">
                        <div className="truncate">{image.revisedPrompt || "Generated image"}</div>
                      </div>
                      <a
                        className="shrink-0 text-[11px] font-medium text-[var(--xv-chat-accent)] transition hover:opacity-80"
                        download={`${image.id}.png`}
                        href={image.url}
                        target="_blank"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      </div>

      {expandedImage ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[24px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <button
              aria-label="Close image preview"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
              onClick={() => setExpandedImage(null)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <Image
              alt={expandedImage.revisedPrompt || "Generated Xeivora image"}
              className="max-h-[78vh] w-full rounded-[18px] object-contain"
              height={1400}
              src={expandedImage.url}
              unoptimized
              width={1400}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] text-[var(--xv-chat-muted)]">
                {expandedImage.revisedPrompt || "Generated image"}
              </p>
              <a
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--xv-chat-border)] px-3 py-1.5 text-[12px] font-medium text-[var(--xv-chat-text)] transition hover:bg-[var(--xv-chat-ghost-bg)]"
                download={`${expandedImage.id}.png`}
                href={expandedImage.url}
                rel="noreferrer"
                target="_blank"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModelPill({ model, pulse = false }: { model: ModelPillData; pulse?: boolean }) {
  return (
    <>
      <span className="relative inline-flex h-2.5 w-2.5">
        {pulse ? (
          <motion.span
            animate={{ opacity: [0.45, 0, 0], scale: [1, 1.9, 2.2] }}
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: coralAccent }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        ) : null}
        <span className="relative h-2.5 w-2.5 rounded-full" style={{ backgroundColor: coralAccent }} />
      </span>
      <span>{model.label}</span>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--xv-chat-muted)]" />
    </>
  );
}

function AvatarBubble({ accent = false, label }: { accent?: boolean; label?: string }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
        accent
          ? "border-transparent bg-[var(--xv-chat-accent)] text-white"
          : "text-[var(--xv-chat-accent)]"
      )}
    >
      {accent ? label : <XeivoraGlyph size={22} />}
    </div>
  );
}

function ThinkingBlock({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 py-2">
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={active ? { opacity: [0.22, 1, 0.22] } : { opacity: 0.35 }}
          className="h-2 w-2 rounded-full bg-[var(--xv-chat-accent)]"
          key={index}
          transition={{ duration: 1, delay: index * 0.14, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function ErrorBanner({ className, message }: { className?: string; message: string }) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-inline-code-bg)] px-4 py-3 text-[13px] leading-6 text-[var(--xv-chat-text)]",
        className
      )}
    >
      {message}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[var(--xv-chat-muted)]">{label}</span>
      <span className="max-w-[160px] text-right text-[var(--xv-chat-text)]">{value}</span>
    </div>
  );
}

function ProfileMenuButton({
  destructive = false,
  icon: Icon,
  label,
  onClick
}: {
  destructive?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] transition",
        destructive
          ? "text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)]"
          : "text-[var(--xv-chat-text)] hover:bg-[var(--xv-chat-ghost-bg)]"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["⌘ K", "Search chats"],
    ["⌘ N", "New continuity thread"],
    ["⌘ ,", "Settings"],
    ["⌘ /", "Show shortcuts"],
    ["Esc", "Close / cancel"],
    ["Enter", "Send message"],
    ["Shift+Enter", "New line"]
  ];

  return (
    <ModalShell onClose={onClose} title="Keyboard shortcuts">
      <div className="space-y-2">
        {shortcuts.map(([keys, label]) => (
          <div className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-3" key={keys}>
            <span className="text-[14px] text-[var(--xv-chat-text)]">{label}</span>
            <span className="rounded-[8px] border border-[var(--xv-chat-border-strong)] px-2 py-1 font-mono text-[12px] text-[var(--xv-chat-muted)]">
              {keys}
            </span>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function SearchCommandModal({
  onClose,
  onOpenSession,
  query,
  results,
  setQuery
}: {
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
  query: string;
  results: ChatSessionSummary[];
  setQuery: (value: string) => void;
}) {
  return (
    <ModalShell onClose={onClose} title="Search chats">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-[14px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-surface)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--xv-chat-muted)]" />
          <input
            autoFocus
            className="w-full bg-transparent text-[14px] text-[var(--xv-chat-text)] outline-none placeholder:text-[var(--xv-chat-muted)]"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            value={query}
          />
        </div>

        <div className="max-h-[420px] space-y-1 overflow-y-auto">
          {results.length ? (
            results.map((session) => (
              <button
                className="flex w-full items-start gap-3 rounded-[12px] border border-transparent px-3 py-3 text-left transition hover:border-[var(--xv-chat-border)] hover:bg-[var(--xv-chat-ghost-bg)]"
                key={session.id}
                onClick={() => onOpenSession(session.id)}
                type="button"
              >
                <Command className="mt-0.5 h-4 w-4 shrink-0 text-[var(--xv-chat-accent)]" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--xv-chat-text)]">{session.title}</p>
                  <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--xv-chat-muted)]">
                    {session.preview || "Open this conversation"}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[12px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] px-4 py-4 text-[13px] text-[var(--xv-chat-muted)]">
              No matching chats.
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  children,
  onClose,
  title
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(14,11,8,0.72)] px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-[22px] border border-[var(--xv-chat-border-strong)] bg-[var(--xv-chat-sidebar)] p-5 shadow-[var(--xv-chat-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-[18px] font-medium text-[var(--xv-chat-text)]">{title}</h3>
          <button
            aria-label={`Close ${title}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[var(--xv-chat-ghost-bg)] hover:text-[var(--xv-chat-text)]"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function groupSessions(sessions: ChatSessionSummary[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const previous7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const previous30Days = startOfToday - 30 * 24 * 60 * 60 * 1000;
  const groups: Record<string, ChatSessionSummary[]> = {
    Pinned: [],
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    "Previous 30 Days": [],
    Older: []
  };

  for (const session of sessions) {
    if (session.pinned && !session.archived) {
      groups.Pinned.push(session);
      continue;
    }

    const updatedAt = new Date(session.updatedAt).getTime();
    if (updatedAt >= startOfToday) {
      groups.Today.push(session);
    } else if (updatedAt >= startOfYesterday) {
      groups.Yesterday.push(session);
    } else if (updatedAt >= previous7Days) {
      groups["Previous 7 Days"].push(session);
    } else if (updatedAt >= previous30Days) {
      groups["Previous 30 Days"].push(session);
    } else {
      groups.Older.push(session);
    }
  }

  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

function looksLikeCodeContinuationPrompt(prompt = "") {
  const lower = `${prompt}`.toLowerCase();
  const codingKeywords =
    /\b(code|debug|bug|fix|refactor|implement|function|component|frontend|backend|api|database|schema|sql|next\.?js|react|typescript|javascript|python|tailwind|css|html|cli|terminal|script|readme|markdown|documentation|pdf|slide|slides|ppt|image|video)\b/;
  const projectSurfaceKeywords =
    /\b(login|sign in|signup|sign up|auth|authentication|dashboard|sidebar|composer|message|conversation|page|screen|layout|header|footer|form|modal|preview|timeline|memory)\b/;
  const actionKeywords = /\b(build|create|add|update|change|continue|resume|fix|debug|refactor|implement|ship)\b/;

  return (
    codingKeywords.test(lower) ||
    (projectSurfaceKeywords.test(lower) && actionKeywords.test(lower)) ||
    /\b(write|draft|generate|prepare)\b.*\b(readme|markdown|documentation)\b/.test(lower)
  );
}

function normalizePreviewPayloadInput(value: unknown): WorkspacePreviewPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<WorkspacePreviewPayload>;
  const rawRenderMode =
    typeof (value as { renderMode?: unknown }).renderMode === "string"
      ? ((value as { renderMode?: string }).renderMode ?? null)
      : null;
  const renderMode =
    rawRenderMode === "html"
      ? "browser"
      : rawRenderMode === "unsupported"
        ? "code"
        : rawRenderMode;
  if (
    renderMode !== "browser" &&
    renderMode !== "react" &&
    renderMode !== "terminal" &&
    renderMode !== "api" &&
    renderMode !== "database" &&
    renderMode !== "markdown" &&
    renderMode !== "pdf" &&
    renderMode !== "slides" &&
    renderMode !== "image" &&
    renderMode !== "video" &&
    renderMode !== "code"
  ) {
    return null;
  }

  const normalizedEndpoints = Array.isArray(payload.endpoints)
    ? payload.endpoints.reduce<Array<{ method: string; path: string; description?: string | null }>>((acc, endpoint) => {
        if (!endpoint || typeof endpoint !== "object" || !endpoint.method || !endpoint.path) {
          return acc;
        }

        acc.push({
          method: `${endpoint.method}`.toUpperCase(),
          path: `${endpoint.path}`,
          description: typeof endpoint.description === "string" ? endpoint.description : null
        });
        return acc;
      }, [])
    : null;

  const normalizedTables = Array.isArray(payload.tables)
    ? payload.tables.reduce<
        Array<{
          name: string;
          columns: Array<{ name: string; type: string }>;
          rows?: Array<Record<string, string | number | null>>;
        }>
      >((acc, table) => {
        if (!table || typeof table !== "object" || !table.name || !Array.isArray(table.columns)) {
          return acc;
        }

        const columns = table.columns.reduce<Array<{ name: string; type: string }>>((columnAcc, column) => {
          if (!column || typeof column !== "object" || !column.name || !column.type) {
            return columnAcc;
          }

          columnAcc.push({ name: `${column.name}`, type: `${column.type}` });
          return columnAcc;
        }, []);

        acc.push({
          name: `${table.name}`,
          columns,
          rows: Array.isArray(table.rows)
            ? (table.rows.filter((row) => row && typeof row === "object") as Array<Record<string, string | number | null>>)
            : []
        });
        return acc;
      }, [])
    : null;

  return {
    renderMode,
    srcDoc: typeof payload.srcDoc === "string" ? payload.srcDoc : null,
    sourceCode: typeof payload.sourceCode === "string" ? payload.sourceCode : null,
    language: typeof payload.language === "string" ? payload.language : null,
    reason: typeof payload.reason === "string" ? payload.reason : null,
    entryLabel: typeof payload.entryLabel === "string" ? payload.entryLabel : null,
    command: typeof payload.command === "string" ? payload.command : null,
    stdout: typeof payload.stdout === "string" ? payload.stdout : null,
    stderr: typeof payload.stderr === "string" ? payload.stderr : null,
    exitCode: typeof payload.exitCode === "number" ? payload.exitCode : null,
    endpoints: normalizedEndpoints,
    sampleRequest: typeof payload.sampleRequest === "string" ? payload.sampleRequest : null,
    sampleResponse: typeof payload.sampleResponse === "string" ? payload.sampleResponse : null,
    tables: normalizedTables,
    query: typeof payload.query === "string" ? payload.query : null,
    markdown: typeof payload.markdown === "string" ? payload.markdown : null,
    mediaType:
      payload.mediaType === "image" ||
      payload.mediaType === "video" ||
      payload.mediaType === "pdf" ||
      payload.mediaType === "slides"
        ? payload.mediaType
        : null,
    mediaUrl: typeof payload.mediaUrl === "string" ? payload.mediaUrl : null
  };
}

type PreviewCodeBlock = {
  code: string;
  language: string;
};

type PreviewDetectionMode = WorkspacePreviewPayload["renderMode"];

type PreviewSqlTable = NonNullable<WorkspacePreviewPayload["tables"]>[number];

function extractPreviewCodeBlocks(content: string): PreviewCodeBlock[] {
  const blocks: PreviewCodeBlock[] = [];
  const pattern = /```([\w.+-]*)[ \t]*\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    blocks.push({
      language: (match[1] || "text").toLowerCase(),
      code: (match[2] || "").trim()
    });
  }

  return blocks.filter((block) => block.code);
}

function buildPreviewSrcDoc({
  html,
  css,
  javascript
}: {
  html: string;
  css?: string;
  javascript?: string;
}) {
  const styleTag = css ? `<style>${css}</style>` : "";
  const scriptTag = javascript ? `<script>${javascript}<\/script>` : "";

  if (/<html[\s>]/i.test(html) || /<!doctype/i.test(html)) {
    return html
      .replace("</head>", `${styleTag}</head>`)
      .replace("</body>", `${scriptTag}</body>`);
  }

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    styleTag,
    "</head>",
    "<body>",
    html,
    scriptTag,
    "</body>",
    "</html>"
  ].join("");
}

function getPreviewSourceCode(blocks: PreviewCodeBlock[]) {
  return (
    blocks
      .map((block) => `\`\`\`${block.language}\n${block.code}\n\`\`\``)
      .join("\n\n") || null
  );
}

function inferPreviewEntryLabel(language: string, fallback = "preview") {
  const map: Record<string, string> = {
    html: "index.html",
    css: "styles.css",
    javascript: "preview.js",
    js: "preview.js",
    jsx: "component.jsx",
    react: "component.jsx",
    ts: "preview.ts",
    tsx: "component.tsx",
    typescript: "component.tsx",
    python: "main.py",
    py: "main.py",
    sql: "schema.sql",
    markdown: "README.md",
    md: "README.md",
    bash: "script.sh",
    shell: "script.sh",
    sh: "script.sh",
    json: "response.json"
  };

  return map[language] || fallback;
}

function inferTerminalCommand(language: string, prompt = "") {
  const lower = prompt.toLowerCase();
  if (language === "python" || language === "py") {
    return "python main.py";
  }
  if (language === "bash" || language === "shell" || language === "sh") {
    return "bash script.sh";
  }
  if (language === "typescript" || language === "ts") {
    return lower.includes("node") ? "tsx main.ts" : "ts-node main.ts";
  }
  return "node index.js";
}

function inferTerminalOutput(code: string, prompt = "", language = "text") {
  const lowerPrompt = prompt.toLowerCase();
  const printMatches = [...code.matchAll(/(?:print|console\.log)\((["'`])([\s\S]*?)\1\)/g)]
    .map((match) => match[2]?.trim())
    .filter(Boolean);

  if (printMatches.length) {
    return printMatches.join("\n");
  }

  if (/\bcalculator\b/.test(lowerPrompt)) {
    return [
      "Calculator script ready.",
      language.startsWith("python") ? "Example run: python main.py" : `Example run: ${inferTerminalCommand(language, prompt)}`,
      "12 + 7 = 19"
    ].join("\n");
  }

  if (/\b(todo|task)\b/.test(lowerPrompt)) {
    return "Script ready.\nSample output: 3 tasks loaded.\n- Buy milk\n- Ship preview\n- Review timeline";
  }

  return "Execution preview prepared.\nRun locally to continue with interactive input.";
}

function inferApiEndpoints(code: string, prompt = "") {
  const endpoints: Array<{ method: string; path: string; description?: string | null }> = [];
  const pattern = /\b(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(code)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      description: null
    });
  }

  const decoratorPattern = /@(get|post|put|patch|delete)\(\s*["']([^"']+)["']/gi;
  while ((match = decoratorPattern.exec(code)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      description: null
    });
  }

  if (!endpoints.length && /\btodo\b/.test(prompt.toLowerCase())) {
    return [
      { method: "GET", path: "/api/todos", description: "List todos" },
      { method: "POST", path: "/api/todos", description: "Create todo" },
      { method: "PATCH", path: "/api/todos/:id", description: "Update todo state" }
    ];
  }

  return endpoints.slice(0, 8);
}

function inferApiSampleRequest(prompt = "", endpoints: Array<{ method: string; path: string }>) {
  const endpoint = endpoints[1] || endpoints[0];
  if (!endpoint) {
    return null;
  }

  if (endpoint.method === "POST") {
    if (/\btodo\b/.test(prompt.toLowerCase())) {
      return JSON.stringify({ title: "Ship preview panel", completed: false }, null, 2);
    }

    return JSON.stringify({ name: "Example payload" }, null, 2);
  }

  return null;
}

function inferApiSampleResponse(prompt = "", endpoints: Array<{ method: string; path: string }>) {
  if (/\btodo\b/.test(prompt.toLowerCase())) {
    return JSON.stringify(
      {
        data: [
          { id: "todo_1", title: "Ship preview panel", completed: false },
          { id: "todo_2", title: "Persist project memory", completed: true }
        ]
      },
      null,
      2
    );
  }

  const endpoint = endpoints[0];
  if (!endpoint) {
    return JSON.stringify({ status: "ok" }, null, 2);
  }

  return JSON.stringify({ status: "ok", endpoint: endpoint.path }, null, 2);
}

function buildSampleRows(columns: PreviewSqlTable["columns"]) {
  const row: Record<string, string | number | null> = {};
  columns.slice(0, 6).forEach((column, index) => {
    const typeLower = column.type.toLowerCase();
    if (/int|numeric|decimal|float|double/.test(typeLower)) {
      row[column.name] = index + 1;
    } else if (/bool/.test(typeLower)) {
      row[column.name] = index % 2 === 0 ? "true" : "false";
    } else if (/date|time/.test(typeLower)) {
      row[column.name] = "2026-06-05";
    } else if (/uuid|id/.test(typeLower)) {
      row[column.name] = `${column.name}_${index + 1}`;
    } else {
      row[column.name] = `${column.name} value`;
    }
  });

  return [row];
}

function parseSqlTables(sql: string): PreviewSqlTable[] {
  const tables: PreviewSqlTable[] = [];
  const tablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?("?[\w-]+"?)\s*\(([\s\S]*?)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = tablePattern.exec(sql)) !== null) {
    const tableName = match[1].replace(/"/g, "");
    const body = match[2] || "";
    const columns = body
      .split(",")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cleaned = line.replace(/\s+/g, " ");
        const tokens = cleaned.split(" ");
        const name = tokens[0]?.replace(/"/g, "");
        const type = tokens[1];
        if (!name || !type || /^(primary|foreign|unique|constraint)$/i.test(name)) {
          return null;
        }

        return { name, type };
      })
      .filter(Boolean) as PreviewSqlTable["columns"];

    tables.push({
      name: tableName,
      columns,
      rows: buildSampleRows(columns)
    });
  }

  return tables.slice(0, 6);
}

function looksLikeMarkdownDocument(text: string) {
  return /^#\s/m.test(text) || /(?:^- |\n- |\n\d+\.)/.test(text);
}

function detectPreviewMode({
  codeBlocks,
  normalized,
  userPrompt
}: {
  codeBlocks: PreviewCodeBlock[];
  normalized: string;
  userPrompt: string;
}): PreviewDetectionMode | null {
  const promptLower = userPrompt.toLowerCase();
  const htmlBlock = codeBlocks.find((block) => ["html", "htm"].includes(block.language));
  const jsBlock = codeBlocks.find((block) => ["javascript", "js"].includes(block.language));
  const reactBlock = codeBlocks.find((block) =>
    ["jsx", "tsx", "react", "typescript", "ts"].includes(block.language) ||
    /(?:export\s+default|return\s*\(|useState|useEffect|className=|from\s+["']react["'])/.test(block.code)
  );
  const terminalBlock = codeBlocks.find((block) =>
    ["python", "py", "bash", "shell", "sh", "javascript", "js", "typescript", "ts"].includes(block.language)
  );
  const sqlBlock = codeBlocks.find((block) => block.language === "sql" || /\bcreate\s+table\b/i.test(block.code));
  const markdownBlock = codeBlocks.find((block) => ["markdown", "md"].includes(block.language));

  if (/\b(pdf|reportlab|pdfkit|jspdf)\b/.test(promptLower)) {
    return "pdf";
  }

  if (/\b(slide|slides|ppt|pptx|powerpoint)\b/.test(promptLower)) {
    return "slides";
  }

  if (/\b(video|ffmpeg|moviepy|mp4)\b/.test(promptLower)) {
    return "video";
  }

  if (/\b(image|poster|illustration|logo|artwork)\b/.test(promptLower)) {
    return "image";
  }

  if (markdownBlock || (/\b(readme|markdown|documentation)\b/.test(promptLower) && looksLikeMarkdownDocument(normalized))) {
    return "markdown";
  }

  if (sqlBlock || /\b(database|sql|schema|migration|table)\b/.test(promptLower)) {
    return "database";
  }

  if (/\b(api|backend|server|endpoint|rest)\b/.test(promptLower) || /(?:app|router)\.(get|post|put|patch|delete)\(/i.test(normalized)) {
    return "api";
  }

  if (htmlBlock) {
    return "browser";
  }

  if (!htmlBlock && jsBlock && /document\.|window\.|createElement|innerHTML|querySelector|appendChild/.test(jsBlock.code)) {
    return "browser";
  }

  if (!codeBlocks.length && /<(main|section|div|article|html|body|style|script)[\s>]/i.test(normalized)) {
    return "browser";
  }

  if (reactBlock) {
    return "react";
  }

  if (terminalBlock || /\b(cli|terminal|script|python|node)\b/.test(promptLower)) {
    return "terminal";
  }

  if (codeBlocks.length) {
    return "code";
  }

  if (looksLikeMarkdownDocument(normalized)) {
    return "markdown";
  }

  return null;
}

function extractPreviewPayloadFromContent(content: string, userPrompt = ""): WorkspacePreviewPayload | null {
  const normalized = `${content || ""}`.trim();
  if (!normalized) {
    return null;
  }

  const codeBlocks = extractPreviewCodeBlocks(normalized);
  const htmlBlock = codeBlocks.find((block) => ["html", "htm"].includes(block.language));
  const cssBlock = codeBlocks.find((block) => block.language === "css");
  const jsBlock = codeBlocks.find((block) => ["javascript", "js"].includes(block.language));
  const mode = detectPreviewMode({
    codeBlocks,
    normalized,
    userPrompt
  });

  if (!mode) {
    return null;
  }

  if (mode === "browser") {
    const sourceCode = [htmlBlock, cssBlock, jsBlock]
      .filter(Boolean)
      .map((block) => `\`\`\`${block?.language}\n${block?.code}\n\`\`\``)
      .join("\n\n");

    if (htmlBlock) {
      return {
        renderMode: "browser",
        entryLabel: "index.html",
        language: "html",
        sourceCode,
        srcDoc: buildPreviewSrcDoc({
          html: htmlBlock.code,
          css: cssBlock?.code,
          javascript: jsBlock?.code
        })
      };
    }

    if (jsBlock) {
      return {
        renderMode: "browser",
        entryLabel: "preview.js",
        language: "javascript",
        sourceCode: `\`\`\`javascript\n${jsBlock.code}\n\`\`\``,
        srcDoc: buildPreviewSrcDoc({
          html: '<div id="app"></div>',
          css: cssBlock?.code,
          javascript: jsBlock.code
        })
      };
    }

    return {
      renderMode: "browser",
      entryLabel: "index.html",
      language: "html",
      sourceCode: normalized,
      srcDoc: buildPreviewSrcDoc({ html: normalized })
    };
  }

  if (mode === "react") {
    const block = codeBlocks.find((entry) => ["jsx", "tsx", "react", "typescript", "ts"].includes(entry.language)) || codeBlocks[0];
    return {
      renderMode: "react",
      entryLabel: inferPreviewEntryLabel(block?.language || "tsx", "component.tsx"),
      language: block?.language || "tsx",
      sourceCode: getPreviewSourceCode(block ? [block] : codeBlocks) || normalized,
      reason: "React preview shell loaded. Full runtime compilation is the next upgrade."
    };
  }

  if (mode === "terminal") {
    const block =
      codeBlocks.find((entry) => ["python", "py", "bash", "shell", "sh", "javascript", "js", "typescript", "ts"].includes(entry.language)) ||
      codeBlocks[0];
    const language = block?.language || "text";
    const code = block?.code || normalized;

    return {
      renderMode: "terminal",
      entryLabel: inferPreviewEntryLabel(language, "terminal"),
      language,
      sourceCode: getPreviewSourceCode(block ? [block] : codeBlocks) || normalized,
      command: inferTerminalCommand(language, userPrompt),
      stdout: inferTerminalOutput(code, userPrompt, language),
      stderr: null,
      exitCode: 0
    };
  }

  if (mode === "api") {
    const sourceCode = getPreviewSourceCode(codeBlocks) || normalized;
    const endpoints = inferApiEndpoints(sourceCode, userPrompt);
    return {
      renderMode: "api",
      entryLabel: inferPreviewEntryLabel(codeBlocks[0]?.language || "ts", "api.ts"),
      language: codeBlocks[0]?.language || "typescript",
      sourceCode,
      endpoints,
      sampleRequest: inferApiSampleRequest(userPrompt, endpoints),
      sampleResponse: inferApiSampleResponse(userPrompt, endpoints),
      reason: endpoints.length ? null : "Xeivora inferred an API preview from the request."
    };
  }

  if (mode === "database") {
    const sqlBlock = codeBlocks.find((block) => block.language === "sql") || codeBlocks[0];
    const sql = sqlBlock?.code || normalized;
    const tables = parseSqlTables(sql);
    return {
      renderMode: "database",
      entryLabel: inferPreviewEntryLabel(sqlBlock?.language || "sql", "schema.sql"),
      language: sqlBlock?.language || "sql",
      sourceCode: getPreviewSourceCode(sqlBlock ? [sqlBlock] : codeBlocks) || normalized,
      query: sql,
      tables,
      reason: tables.length ? null : "Xeivora saved the SQL and generated a schema preview."
    };
  }

  if (mode === "markdown") {
    const markdownBlock = codeBlocks.find((block) => ["markdown", "md"].includes(block.language));
    const markdown = markdownBlock?.code || normalized;
    return {
      renderMode: "markdown",
      entryLabel: inferPreviewEntryLabel(markdownBlock?.language || "md", "README.md"),
      language: markdownBlock?.language || "markdown",
      sourceCode: markdownBlock ? `\`\`\`${markdownBlock.language}\n${markdownBlock.code}\n\`\`\`` : markdown,
      markdown
    };
  }

  if (mode === "pdf" || mode === "slides" || mode === "image" || mode === "video") {
    return {
      renderMode: mode,
      entryLabel: inferPreviewEntryLabel(codeBlocks[0]?.language || "txt", mode),
      language: codeBlocks[0]?.language || "text",
      sourceCode: getPreviewSourceCode(codeBlocks) || normalized,
      reason: `Xeivora saved this ${mode} workflow and will show the generated asset here when it becomes available.`,
      mediaType: mode === "slides" ? "slides" : mode === "pdf" ? "pdf" : mode,
      mediaUrl: null
    };
  }

  return {
    renderMode: "code",
    entryLabel: inferPreviewEntryLabel(codeBlocks[0]?.language || "text", "preview"),
    language: codeBlocks[0]?.language || "text",
    sourceCode: getPreviewSourceCode(codeBlocks) || normalized,
    reason: "Preview mode is not available yet for this language, but the code is saved to the project files."
  };
}

function getExecutionPreviewVersion(execution: ChatToolExecution): WorkspacePreviewVersion | null {
  const raw = execution.payload?.previewVersion;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const preview = raw as Partial<WorkspacePreviewVersion>;
  if (!preview.id || typeof preview.routePath !== "string") {
    return null;
  }

  return {
    approvedAt: preview.approvedAt || null,
    changedFiles: Array.isArray(preview.changedFiles) ? preview.changedFiles : [],
    createdAt: typeof preview.createdAt === "string" ? preview.createdAt : new Date().toISOString(),
    deployedAt: preview.deployedAt || null,
    id: preview.id,
    notes: preview.notes || null,
    previewPayload: normalizePreviewPayloadInput(preview.previewPayload),
    projectId: preview.projectId || null,
    routePath: preview.routePath,
    sessionId: preview.sessionId || null,
    status:
      preview.status === "approved" || preview.status === "deploy_ready" ? preview.status : "live",
    summary: typeof preview.summary === "string" ? preview.summary : "Live preview checkpoint",
    title: typeof preview.title === "string" ? preview.title : "Preview checkpoint",
    updatedAt: typeof preview.updatedAt === "string" ? preview.updatedAt : new Date().toISOString(),
    versionNumber: Number(preview.versionNumber || 1)
  };
}

function mergePreviewVersions(
  current: WorkspacePreviewVersion[],
  incoming: WorkspacePreviewVersion[]
) {
  const map = new Map<string, WorkspacePreviewVersion>();

  [...incoming, ...current].forEach((preview) => {
    map.set(preview.id, preview);
  });

  return [...map.values()].sort((left, right) => {
    const updatedDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (updatedDelta !== 0) {
      return updatedDelta;
    }
    return right.versionNumber - left.versionNumber;
  });
}

function formatPreviewStatusLabel(status: WorkspacePreviewVersion["status"]) {
  if (status === "deploy_ready") {
    return "Deploy-ready";
  }

  if (status === "approved") {
    return "Approved";
  }

  return "Live";
}


function getLastUserPrompt(session: ChatSession | null) {
  return session?.messages.filter((message) => message.role === "user").slice(-1)[0]?.content ?? "";
}

function getInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "X"
  );
}

function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) {
    return `${Math.max(1, Math.round(diff / minute))} minutes ago`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.round(diff / hour))} hours ago`;
  }

  return `${Math.max(1, Math.round(diff / day))} days ago`;
}

type ModelPillData = {
  dotColor: string;
  label: string;
};

function getTopbarModelMeta(
  presetId: ModelPickerId,
  modelKey: ModelKey,
  _resolvedModel?: string | null
): ModelPillData {
  const preset = modelPickerOptions.find((option) => option.id === presetId);
  if (preset && preset.id !== "auto") {
    return { dotColor: preset.dotColor, label: "Xeivora" };
  }

  const map: Record<ModelKey, ModelPillData> = {
    claude: { dotColor: coralAccent, label: "Xeivora" },
    "gpt-4o": { dotColor: "#16a34a", label: "Xeivora" },
    gemini: { dotColor: "#2563eb", label: "Xeivora" },
    "orbit-auto": { dotColor: coralAccent, label: "Xeivora" }
  };

  return map[modelKey];
}

function modelKeyToPresetId(modelKey: ModelKey): ModelPickerId {
  if (modelKey === "claude") {
    return "claude-sonnet";
  }

  if (modelKey === "gpt-4o") {
    return "gpt-4o";
  }

  if (modelKey === "gemini") {
    return "gemini-2.5-pro";
  }

  return "auto";
}

function providerToModelKey(provider: ProviderKey): ModelKey {
  if (provider === "anthropic") {
    return "claude";
  }

  if (provider === "openai") {
    return "gpt-4o";
  }

  if (provider === "google" || provider === "gemini") {
    return "gemini";
  }

  return "orbit-auto";
}

function workflowModeLabel(mode: WorkflowMode) {
  const labels: Record<WorkflowMode, string> = {
    simple_chat: "Conversation",
    continuity: "Continuity",
    coding_continuity: "Coding continuity"
  };

  return labels[mode];
}

function formatToolStatus(execution: ChatToolExecution) {
  if (execution.status === "running") {
    return "Generating";
  }

  if (execution.status === "error") {
    return "Error";
  }

  if (!execution.connected || execution.status === "not_connected") {
    return "Standby";
  }

  return execution.source === "mcp" ? "MCP" : "Ready";
}

function getExecutionImages(execution: ChatToolExecution): ExecutionImage[] {
  const rawImages = execution.payload?.images;
  if (!Array.isArray(rawImages)) {
    return [];
  }

  return rawImages
    .map((image, index) => {
      if (!image || typeof image !== "object") {
        return null;
      }

      const candidate = image as { id?: unknown; url?: unknown; revisedPrompt?: unknown };
      if (typeof candidate.url !== "string" || !candidate.url) {
        return null;
      }

      return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : `generated-image-${index + 1}`,
        url: candidate.url,
        revisedPrompt: typeof candidate.revisedPrompt === "string" ? candidate.revisedPrompt : ""
      };
    })
    .filter(Boolean) as ExecutionImage[];
}

function getExecutionImageCount(execution: ChatToolExecution) {
  const rawCount = execution.payload?.count;
  const parsed = Number.parseInt(`${rawCount || 1}`, 10);
  return Math.min(4, Math.max(1, parsed || Math.max(1, getExecutionImages(execution).length)));
}

function getExecutionModelLabel(execution: ChatToolExecution) {
  if (typeof execution.payload?.modelLabel === "string" && execution.payload.modelLabel) {
    return execution.payload.modelLabel;
  }

  if (typeof execution.payload?.model === "string" && execution.payload.model) {
    return execution.payload.model;
  }

  return "DALL-E 3";
}

const clientImageTriggerPrefixPattern =
  /^(?:\/image\b|(?:please\s+)?(?:generate|create|make|show|draw|illustrate|visual(?:ise|ize)))(?:\s+me)?(?:\s+(?:an?|the|some))?(?:\s+\d+)?(?:\s+(?:different|multiple))?(?:\s+(?:images?|pictures?|photos?|posters?|illustrations?|graphics?|art(?:work)?|visuals?)\b)?(?:\s+(?:of|for|showing))?\s*/i;

const clientImageTriggerPatterns = [
  clientImageTriggerPrefixPattern,
  /\bdraw me\b/i,
  /\billustrate\b/i,
  /\bvisual(?:ise|ize)\b/i,
  /^\/image\b/i
];

const clientComboPattern =
  /\s*(?:,?\s*and\s+)(tell me about|tell me|explain|describe|write about|write me|give me|also tell me about|also explain|and then explain)\s+(.+)$/i;

function parseClientImageIntent(prompt = ""): ImageIntent {
  const normalized = `${prompt}`.replace(/\s+/g, " ").trim();
  const isImageRequest = normalized ? clientImageTriggerPatterns.some((pattern) => pattern.test(normalized)) : false;
  const count =
    normalized.match(/\b([2-4])\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/i)?.[1] !== undefined
      ? Number.parseInt(normalized.match(/\b([2-4])\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/i)?.[1] || "1", 10)
      : /\b(two|three|four)\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/i.test(normalized)
        ? { two: 2, three: 3, four: 4 }[
            normalized.match(/\b(two|three|four)\s+(?:different\s+|multiple\s+)?(?:images?|pictures?|versions?)\b/i)?.[1]?.toLowerCase() ||
              "two"
          ] || 1
        : /\b(different versions|different images|multiple versions|variations|variants)\b/i.test(normalized)
          ? 4
          : 1;
  const comboMatch = normalized.match(clientComboPattern);
  const imageClause = comboMatch ? normalized.slice(0, comboMatch.index).trim() : normalized;
  const imagePrompt = isImageRequest
    ? imageClause
        .replace(
          clientImageTriggerPrefixPattern,
          ""
        )
        .replace(/\b(images?|pictures?|photos?|posters?|illustrations?|graphics?|art(?:work)?|visuals?)\b/gi, "")
        .replace(/\b(?:of|for|showing)\b/gi, " ")
        .replace(/\s+/g, " ")
        .replace(/^[,:-]+\s*/, "")
        .replace(/[.?!]+$/g, "")
        .trim()
    : "";
  const followupDetail = comboMatch?.[2]?.trim().replace(/[.?!]+$/g, "") || null;
  const lead = comboMatch?.[1]?.toLowerCase() || "";
  const textPrompt =
    !followupDetail
      ? null
      : lead.includes("tell")
        ? `Tell me about ${followupDetail}`
        : lead.includes("explain")
          ? `Explain ${followupDetail}`
          : lead.includes("describe")
            ? `Describe ${followupDetail}`
            : lead.includes("write")
              ? `Write about ${followupDetail}`
              : lead.includes("give")
                ? `Give me ${followupDetail}`
                : followupDetail;

  return {
    isImageRequest,
    imagePrompt,
    textPrompt,
    count: Math.min(4, Math.max(1, count)),
    isImageOnly: Boolean(isImageRequest && imagePrompt && !textPrompt),
    isImageAndText: Boolean(isImageRequest && imagePrompt && textPrompt)
  };
}

function buildPendingImageExecution(prompt: string): ChatToolExecution | null {
  const imageIntent = parseClientImageIntent(prompt);

  if (!imageIntent.isImageRequest || !imageIntent.imagePrompt) {
    return null;
  }

  return {
    id: `image-exec-${Date.now()}`,
    name: "image_generation",
    uiLabel: "Image generation",
    status: "running",
    connected: true,
    source: "workspace",
    summary: "Generating your image...",
    payload: {
      prompt: imageIntent.imagePrompt,
      count: imageIntent.count,
      textPrompt: imageIntent.textPrompt,
      isImageOnly: imageIntent.isImageOnly,
      isImageAndText: imageIntent.isImageAndText,
      images: [],
      loading: true,
      modelLabel: "DALL-E 3"
    }
  };
}

function truncateSidebarSessionTitle(title: string) {
  const words = `${title}`.trim().split(/\s+/).filter(Boolean);

  if (words.length <= 3) {
    return title;
  }

  return `${words.slice(0, 3).join(" ")}...`;
}

function desktopSaveLabel(state: DesktopSaveState) {
  if (state === "saving") {
    return "Saving...";
  }

  if (state === "saved") {
    return "Saved";
  }

  if (state === "error") {
    return "Retry save";
  }

  return "Save";
}

function formatDesktopCommandOutput(result: DesktopCommandResult) {
  return [
    result.stdout ? `$ stdout\n${result.stdout.trimEnd()}` : null,
    result.stderr ? `$ stderr\n${result.stderr.trimEnd()}` : null,
    `exit code: ${result.exitCode ?? 0}`
  ]
    .filter(Boolean)
    .join("\n\n");
}

function flattenDesktopFiles(nodes: DesktopFileNode[]): DesktopFileNode[] {
  return nodes.flatMap((node) => [node, ...(node.children?.length ? flattenDesktopFiles(node.children) : [])]);
}

function summarizeDesktopFileTree(nodes: DesktopFileNode[]) {
  const files = flattenDesktopFiles(nodes)
    .filter((node) => !node.isDirectory)
    .slice(0, 18)
    .map((node) => node.path);

  if (!files.length) {
    return "Opened folder summary: no visible files indexed yet.";
  }

  return `Opened folder summary:\n${files.map((file) => `- ${file}`).join("\n")}`;
}

async function findMentionedDesktopFile({
  activeFileContent,
  activeFilePath,
  fileTree,
  prompt,
  readFileForAI
}: {
  activeFileContent: string;
  activeFilePath: string | null;
  fileTree: DesktopFileNode[];
  prompt: string;
  readFileForAI: (filePath: string) => Promise<string | null>;
}) {
  const normalizedPrompt = prompt.toLowerCase();
  const allFiles = flattenDesktopFiles(fileTree).filter((node) => !node.isDirectory);
  const matched = allFiles.find((node) => normalizedPrompt.includes(node.name.toLowerCase()));

  if (!matched && activeFilePath) {
    return {
      path: activeFilePath,
      content: activeFileContent,
      matchedByPrompt: false
    };
  }

  if (!matched) {
    return null;
  }

  const content = matched.path === activeFilePath ? activeFileContent : await readFileForAI(matched.path);
  return {
    path: matched.path,
    content: content || "",
    matchedByPrompt: true
  };
}

function formatDesktopContext({
  activeFileContent,
  activeFilePath,
  matchedFile,
  openFolderPath
}: {
  activeFileContent: string;
  activeFilePath: string | null;
  matchedFile: { content: string; matchedByPrompt: boolean; path: string } | null;
  openFolderPath: string;
}) {
  const segments = [
    "The user is chatting from the Xeivora desktop app.",
    `Open folder: ${openFolderPath}`,
    "Treat the file context below as real local workspace context.",
    "Do not claim you changed local files or ran local commands unless the user explicitly confirms that action.",
    "Desktop action candidates available to the user include reading files, saving edits, creating files, listing files, and running commands inside the opened folder."
  ];

  const effectivePath = matchedFile?.path || activeFilePath;
  const effectiveContent = matchedFile?.content || activeFileContent;

  if (effectivePath && effectiveContent) {
    segments.push(
      matchedFile?.matchedByPrompt
        ? `The user mentioned this file directly: ${effectivePath}`
        : `The user currently has this file open: ${effectivePath}`,
      `File content:\n${effectiveContent.slice(0, 12000)}`
    );
  }

  return segments.join("\n\n");
}

function extractPrimaryCodeBlock(content: string) {
  const match = content.match(/```([\w.+-]*)\n([\s\S]*?)```/);
  if (!match) {
    return null;
  }

  return {
    language: match[1] || "text",
    code: match[2]
  };
}

function normalizeCodeForApply(code: string) {
  return `${code}`.replace(/\n$/, "");
}

function buildSimpleDiffLines(previousContent: string, nextContent: string) {
  const previousLines = previousContent.split("\n");
  const nextLines = nextContent.split("\n");
  const length = Math.max(previousLines.length, nextLines.length);
  const diff: string[] = [
    "--- current",
    "+++ proposed"
  ];

  for (let index = 0; index < length; index += 1) {
    const previousLine = previousLines[index];
    const nextLine = nextLines[index];

    if (previousLine === nextLine) {
      if (previousLine !== undefined) {
        diff.push(`  ${previousLine}`);
      }
      continue;
    }

    if (previousLine !== undefined) {
      diff.push(`- ${previousLine}`);
    }

    if (nextLine !== undefined) {
      diff.push(`+ ${nextLine}`);
    }
  }

  return diff;
}

async function consumeEventStream(
  response: Response,
  onEvent: (event: StreamEvent) => Promise<void> | void
) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming reader is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() || "";

    for (const block of blocks) {
      const lines = block.split("\n");
      let eventName = "";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (!eventName || !dataLines.length) {
        continue;
      }

      await onEvent({
        type: eventName as StreamEvent["type"],
        payload: JSON.parse(dataLines.join("\n"))
      } as StreamEvent);
    }
  }
}

function toFriendlyError(value: string) {
  const normalized = toXeivoraLabel(value);
  if (/quota|429|timeout|provider|api key|authentication|unavailable|rate limit/i.test(normalized)) {
    return "Xeivora switched providers automatically to protect continuity. Try again and it will keep going cleanly.";
  }

  return normalized;
}

function toXeivoraLabel(value: string) {
  return value
    .replaceAll("OrbitAI Copilot", "Xeivora")
    .replaceAll("OrbitAI", "Xeivora")
    .replaceAll("Orbit Auto", "Xeivora Auto")
    .replaceAll("Orbit", "Xeivora");
}
