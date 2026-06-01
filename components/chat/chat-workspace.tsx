"use client";

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
  Ellipsis,
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

import AutoSwitchBanner from "@/components/AutoSwitchBanner";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { MessageErrorBoundary } from "@/components/chat/message-error-boundary";
import { OrbitLogo, XeivoraGlyph } from "@/components/orbit-logo";
import { useXeivoraTheme } from "@/components/theme/theme-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
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
  ModelSwitch,
  ModelKey,
  OrchestrationStep,
  ProviderKey,
  ProviderStatus,
  StreamContinuityPayload,
  StreamEvent,
  UploadedFileSummary,
  WorkspaceProject
} from "@/lib/chat-types";
import { cn } from "@/lib/utils";

const workspaceName = "Xeivora";
const coralAccent = "var(--xv-chat-accent)";

const navItems: SidebarItem[] = [
  { label: "Chats", icon: MessageSquareText, href: "/chat" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard" },
  { label: "Memory", icon: BrainCircuit, href: "/memory" },
  { label: "Workflows", icon: Workflow, href: "/workflows" },
  { label: "Agents", icon: Bot, href: "/agents" },
  { label: "Simulate", icon: Target, href: "/simulate" },
  { label: "Integrations", icon: PlugZap, href: "/integrations" },
  { label: "Settings", icon: Settings2, href: "/settings" }
];

const welcomeSuggestions: SuggestionCard[] = [
  {
    label: "Write or edit",
    detail: "Emails, essays, docs, code",
    icon: Pencil,
    prompt: "Help me write or edit this clearly and professionally."
  },
  {
    label: "Travel planning",
    detail: "Visas, eSIM, itineraries",
    icon: Plane,
    prompt: "Plan a smart trip itinerary and help me compare the best options."
  },
  {
    label: "Code & build",
    detail: "Any language, any framework",
    icon: Code2,
    prompt: "Help me code and build this feature end to end."
  },
  {
    label: "Research & analyse",
    detail: "Deep dives, summaries",
    icon: Search,
    prompt: "Research this topic and analyze the best path forward."
  },
  {
    label: "Health info",
    detail: "Symptoms, medications",
    icon: Heart,
    prompt: "Help me understand this health topic clearly and carefully."
  },
  {
    label: "Learn anything",
    detail: "Tutoring, explanations",
    icon: GraduationCap,
    prompt: "Teach me this topic in a simple, structured way."
  }
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
};

type SuggestionCard = {
  detail: string;
  icon: LucideIcon;
  label: string;
  prompt: string;
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
type DesktopCommandResult = {
  command: string;
  error?: string | null;
  exitCode?: number;
  stderr?: string;
  stdout?: string;
  success: boolean;
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
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<ModelSwitch | null>(null);
  const [modelPulseActive, setModelPulseActive] = useState(false);
  const [toolExecutionsByMessageId, setToolExecutionsByMessageId] = useState<Record<string, ChatToolExecution[]>>({});
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
  const continuityChain =
    continuityStatus.finalProviderChain.length > 0
      ? continuityStatus.finalProviderChain
      : continuityStatus.providerChain;
  const currentModelSummary = formatModelSummary(
    continuityStatus.currentProvider,
    continuityStatus.currentModel,
    "Instant"
  );
  const fallbackSummary = formatFallbackSummary(
    continuityStatus.fallbackProvider,
    continuityStatus.fallbackModel,
    continuityChain
  );
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
      : "New chat";
  const showDesktopPreview = isDesktop && Boolean(activeFile);
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
    if (sessionId) {
      void loadSession(sessionId).catch(() => {
        // Ignore deep-link load failures and keep the workspace usable.
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
      setAutoSwitchNotice(null);
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
      setAutoSwitchNotice(null);
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
    setAutoSwitchNotice(null);
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
          setAutoSwitchNotice(null);
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

    try {
      const session = activeSession ?? (await createSession());
      const desktopContext = await buildDesktopContext(input);
      const assistantDraftId = `draft-${Date.now()}`;

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
          const previousProvider = activeProviderRef.current;
          setActiveProvider(typedEvent.payload.currentProvider);
          setContinuityStatus(typedEvent.payload);

          if (
            previousProvider &&
            previousProvider !== "simulation" &&
            typedEvent.payload.currentProvider !== previousProvider
          ) {
            setAutoSwitchNotice({
              fromModel: providerToSwitchModel(previousProvider),
              toModel: providerToSwitchModel(typedEvent.payload.currentProvider),
              reason: normalizeSwitchReason(typedEvent.payload.tokenRateStatus),
              contextPreserved: typedEvent.payload.memoryPreserved,
              decisionsRestored: estimateDecisionsRestored(messages.length)
            });
          }

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
      setError(
        toFriendlyError(nextError instanceof Error ? nextError.message : "Xeivora could not complete the response.")
      );
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setThinking(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[var(--xv-chat-bg)] text-[var(--xv-chat-text)]"
      style={{ ...chatTheme, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="min-h-screen bg-[var(--xv-chat-bg)]">
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

        <main className="relative flex min-h-screen min-w-0 flex-1 flex-col bg-[var(--xv-chat-bg)] md:ml-[260px]">
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

          <div className="min-h-0 flex-1 pt-[50px]">
            <div className={cn("flex h-full min-h-0", showDesktopPreview ? "xl:grid xl:grid-cols-[minmax(0,1fr)_380px]" : "")}>
              <div className="min-h-0 min-w-0 flex-1">
                {hasMessages ? (
                  <ChatThreadView
                    activeDesktopFilePath={activeFile}
                    autoSwitchNotice={autoSwitchNotice}
                    composerRef={composerRef}
                    copiedResponseId={copiedResponseId}
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
                    onPromptChange={setPrompt}
                    onRegenerate={() => void handleSend(true)}
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
                    composerRef={composerRef}
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
                    onSuggestion={(value) => {
                      setPrompt(value);
                      void handleSend(false, value);
                    }}
                    prompt={prompt}
                    sessionFiles={sessionFiles}
                    voiceState={voiceState}
                  />
                )}
              </div>

              {showDesktopPreview ? (
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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden px-[10px] py-3">
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
        onClick={onNewChat}
        type="button"
      >
        <Plus className="h-4 w-4 shrink-0" />
        {!collapsed ? <span>New chat</span> : null}
      </button>

      {!collapsed || mobile ? (
        <>
          <nav className="grid gap-[1px] border-b border-[var(--xv-chat-border)] pb-2" aria-label="Workspace navigation">
            {navItems.map((item) => (
              <SidebarNavItem item={item} key={item.label} onDismiss={onDismiss} pathname={pathname} />
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
                  Recents
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
                    <div className="px-2 pt-2 text-[13px] text-[var(--xv-chat-muted)]">No recent chats yet.</div>
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
        </>
      ) : (
        <>
          <div className="grid gap-1">
            {navItems.map((item) => (
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
            ))}
          </div>
          <div className="flex-1" />
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-sm font-semibold text-white">
            {getInitials(profileName)}
          </div>
        </>
      )}
    </div>
  );
}

function SidebarNavItem({
  item,
  onDismiss,
  pathname
}: {
  item: SidebarItem;
  onDismiss?: () => void;
  pathname: string;
}) {
  const isActive = pathname === item.href;

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
          Your AI operating system is ready. Sign in, open a project folder when you want desktop context, and keep your workflows continuous.
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
                    <StatusRow label="Current model" value={currentModelSummary} />
                    <StatusRow label="Next fallback" value={fallbackSummary} />
                    <StatusRow label="Memory" value={continuityStatus.memoryPreserved ? "Active" : "Syncing"} />
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
  composerRef,
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
  onSuggestion,
  prompt,
  sessionFiles,
  voiceState
}: {
  composerRef: RefObject<HTMLTextAreaElement | null>;
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
  onSuggestion: (value: string) => void;
  prompt: string;
  sessionFiles: UploadedFileSummary[];
  voiceState: VoiceState;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-[calc(100vh-170px)] w-full max-w-[960px] flex-col items-center justify-center px-5 pb-10 pt-8">
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
            className="mt-4 text-center text-[22px] font-medium tracking-[-0.01em] text-[var(--xv-chat-text)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.02 }}
          >
            What can I help with?
          </motion.h1>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 max-w-[400px] text-center text-[14px] font-light leading-[1.6] text-[var(--xv-chat-muted)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.04 }}
          >
            One workspace. Every model. Your work never stops — context preserved across Claude, GPT-4o,
            Gemini and more.
          </motion.p>

          {connectedIntegrations.length ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex max-w-[620px] flex-wrap items-center justify-center gap-2"
              initial={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
            >
              {connectedIntegrations.map((integration) => {
                const enabled = enabledIntegrationProviders.includes(integration.provider);

                return (
                  <button
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-medium transition",
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
            </motion.div>
          ) : null}

          {error ? <ErrorBanner className="mt-6 w-full max-w-[660px]" message={error} /> : null}

          <div className="mt-6 grid w-full max-w-[520px] grid-cols-2 gap-2">
            {welcomeSuggestions.map((suggestion) => (
              <button
                className="group rounded-[16px] border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] p-[14px] text-left transition hover:border-[var(--xv-chat-border-strong)] hover:bg-[var(--xv-chat-ghost-bg)]"
                key={suggestion.label}
                onClick={() => onSuggestion(suggestion.prompt)}
                type="button"
              >
                <div className="text-[var(--xv-chat-accent)]">
                  <suggestion.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-2 text-[13px] font-medium text-[var(--xv-chat-text)]">{suggestion.label}</h3>
                <p className="mt-1 text-[12px] font-light leading-[1.4] text-[var(--xv-chat-muted)]">
                  {suggestion.detail}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] px-4 pb-4 pt-4 md:left-[260px] md:w-[calc(100%-260px)] md:px-6">
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
  autoSwitchNotice,
  composerRef,
  copiedResponseId,
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
  onPromptChange,
  onRegenerate,
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
  autoSwitchNotice: ModelSwitch | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  copiedResponseId: string | null;
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
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
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
          {autoSwitchNotice ? <AutoSwitchBanner switchData={autoSwitchNotice} /> : null}

          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const isLatestAssistant = lastAssistantMessage?.id === message.id;
              const assistantModelLabel = getAssistantModelLabel(message.modelKey, message.provider);
              const toolExecutions = toolExecutionsByMessageId[message.id] || [];
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
                        <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-[var(--xv-chat-text)]">
                          <span className="text-[var(--xv-chat-text)]">Xeivora</span>
                          <span className="text-[var(--xv-chat-muted)]">·</span>
                          <span className="text-[var(--xv-chat-muted)]">{assistantModelLabel}</span>
                        </div>

                        {toolExecutions.length ? <ToolExecutionGroup executions={toolExecutions} /> : null}

                        {message.content ? (
                          <div className="text-[14px] font-light leading-[1.75] text-[var(--xv-chat-text)]">
                            <ChatMarkdown content={toXeivoraLabel(message.content)} />
                          </div>
                        ) : (
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
                            <span className="rounded-full border border-[var(--xv-chat-border)] px-2 py-0.5 text-[10px] text-[var(--xv-chat-muted)]">
                              {assistantModelLabel}
                            </span>
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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--xv-chat-border)] bg-[var(--xv-chat-bg)] px-4 pb-4 pt-4 md:left-[260px] md:w-[calc(100%-260px)] md:px-6">
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
            placeholder="Ask anything"
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
        Xeivora switches models automatically — your context is always preserved
      </p>
    </div>
  );
}

function ToolExecutionGroup({ executions }: { executions: ChatToolExecution[] }) {
  return (
    <div className="mb-3 space-y-2">
      {executions.map((execution) => (
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
        </div>
      ))}
    </div>
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
    ["⌘ N", "New chat"],
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


function getLastUserPrompt(session: ChatSession | null) {
  return session?.messages.filter((message) => message.role === "user").slice(-1)[0]?.content ?? "";
}

function formatProviderLabel(provider: ProviderKey | string | null) {
  if (!provider) {
    return "Standby";
  }

  const labels: Record<string, string> = {
    openai: "GPT-4o",
    anthropic: "Claude",
    google: "Gemini",
    gemini: "Gemini",
    ollama: "Ollama",
    simulation: "Xeivora Auto"
  };

  return labels[provider] ?? provider;
}

function providerToSwitchModel(provider: ProviderKey | string | null) {
  if (!provider) {
    return "claude";
  }

  const map: Record<string, string> = {
    anthropic: "claude",
    openai: "gpt-4o",
    google: "gemini",
    gemini: "gemini",
    ollama: "ollama"
  };

  return map[provider] || "claude";
}

function normalizeSwitchReason(tokenRateStatus: string) {
  if (/token/i.test(tokenRateStatus)) {
    return "Token limit reached";
  }

  if (/retrying/i.test(tokenRateStatus)) {
    return "Provider retry triggered";
  }

  if (/switching/i.test(tokenRateStatus) || /fallback/i.test(tokenRateStatus)) {
    return "Capacity limit reached";
  }

  return "Provider handoff triggered";
}

function estimateDecisionsRestored(messageCount: number) {
  return Math.max(5, Math.min(19, Math.ceil(messageCount / 2) + 4));
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

type ModelPillData = {
  dotColor: string;
  label: string;
};

function getTopbarModelMeta(
  presetId: ModelPickerId,
  modelKey: ModelKey,
  resolvedModel?: string | null
): ModelPillData {
  const preset = modelPickerOptions.find((option) => option.id === presetId);
  if (preset && preset.id !== "auto") {
    return { dotColor: preset.dotColor, label: preset.shortLabel };
  }

  const map: Record<ModelKey, ModelPillData> = {
    claude: { dotColor: coralAccent, label: resolvedModel || "Xeivora" },
    "gpt-4o": { dotColor: "#16a34a", label: resolvedModel || "Xeivora" },
    gemini: { dotColor: "#2563eb", label: resolvedModel || "Xeivora" },
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

function getAssistantModelLabel(modelKey?: ModelKey, provider?: ProviderKey) {
  if (provider === "anthropic") {
    return "Claude 3.5";
  }

  if (provider === "openai") {
    return "GPT-4o";
  }

  if (provider === "google" || provider === "gemini") {
    return "Gemini";
  }

  if (modelKey === "gpt-4o") {
    return "GPT-4o";
  }

  if (modelKey === "gemini") {
    return "Gemini";
  }

  return "Claude 3.5";
}

function formatModelSummary(provider: ProviderKey | null, model: string | null | undefined, fallbackLabel: string) {
  if (provider && model) {
    return `${formatProviderLabel(provider)} ${model}`.trim();
  }

  if (provider) {
    return formatProviderLabel(provider);
  }

  return fallbackLabel;
}

function formatFallbackSummary(
  fallbackProvider: ProviderKey | null,
  fallbackModel: string | null | undefined,
  continuityChain: ProviderKey[]
) {
  if (fallbackProvider && fallbackModel) {
    return `${formatProviderLabel(fallbackProvider)} ${fallbackModel}`.trim();
  }

  if (fallbackProvider) {
    return formatProviderLabel(fallbackProvider);
  }

  const nextProvider = continuityChain.find((provider) => provider !== "simulation");
  return nextProvider ? formatProviderLabel(nextProvider) : "Standby";
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
  if (execution.status === "error") {
    return "Error";
  }

  if (!execution.connected || execution.status === "not_connected") {
    return "Standby";
  }

  return execution.source === "mcp" ? "MCP" : "Ready";
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
