"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  ArchiveRestore,
  ArrowUp,
  AudioLines,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  Code2,
  Ellipsis,
  FileText,
  FolderKanban,
  GraduationCap,
  Heart,
  LoaderCircle,
  MessageSquareText,
  Mic,
  PanelLeft,
  Paperclip,
  Pencil,
  Pin,
  Plane,
  Plus,
  Search,
  Settings2,
  Share2,
  Square,
  Trash2,
  Volume2,
  Workflow,
  X
} from "lucide-react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, RefObject } from "react";

import AutoSwitchBanner from "@/components/AutoSwitchBanner";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { AuthUser } from "@/lib/auth-types";
import type {
  ChatBootstrap,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
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
const coralAccent = "#c96442";

const navItems: SidebarItem[] = [
  { label: "Chats", icon: MessageSquareText, href: "/chat" },
  { label: "Projects", icon: FolderKanban, href: "/dashboard" },
  { label: "Memory", icon: BrainCircuit, href: "/memory" },
  { label: "Workflows", icon: Workflow, href: "/workflows" },
  { label: "Agents", icon: Bot, href: "/agents" },
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

type ContinuityState = StreamContinuityPayload;
type VoiceState = "idle" | "listening" | "processing";
type WorkflowMode = "simple_chat" | "continuity" | "coding_continuity";

const chatTheme = {
  "--xeivora-coral": coralAccent,
  "--xv-chat-bg": "#0e0b08",
  "--xv-chat-surface": "#1a1410",
  "--xv-chat-surface-soft": "rgba(201,100,66,0.08)",
  "--xv-chat-sidebar": "#120e0a",
  "--xv-chat-border": "rgba(201,100,66,0.12)",
  "--xv-chat-border-strong": "rgba(201,100,66,0.2)",
  "--xv-chat-text": "#f0ead8",
  "--xv-chat-muted": "rgba(240,234,216,0.7)",
  "--xv-chat-accent": coralAccent,
  "--xv-chat-code-bg": "#1a1410",
  "--xv-chat-code-header-bg": "rgba(201,100,66,0.08)",
  "--xv-chat-code-border": "rgba(201,100,66,0.15)",
  "--xv-chat-code-text": "#f0ead8",
  "--xv-chat-inline-code-bg": "rgba(201,100,66,0.16)",
  "--xv-chat-inline-code-text": "#f0ead8",
  "--xv-chat-ghost-bg": "rgba(201,100,66,0.08)",
  "--xv-chat-ghost-bg-hover": "rgba(201,100,66,0.12)",
  "--xv-chat-ghost-text": "rgba(240,234,216,0.7)",
  "--xv-chat-shadow": "0 12px 30px rgba(0, 0, 0, 0.28)"
} as CSSProperties;

export function ChatWorkspace({ viewer = null }: { viewer?: AuthUser | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("simple_chat");
  const [autoSwitchNotice, setAutoSwitchNotice] = useState<ModelSwitch | null>(null);
  const [modelPulseActive, setModelPulseActive] = useState(false);
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
  const filteredSessions = useMemo(() => sessions, [sessions]);
  const groupedSessions = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);
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
    continuityStatus.currentProvider === "simulation" ? selectedModel : providerToModelKey(continuityStatus.currentProvider),
    continuityStatus.currentModel
  );
  const topbarTitle =
    activeSession?.title && activeSession.title.trim() !== "New Xeivora chat"
      ? activeSession.title
      : "New chat";

  useEffect(() => {
    setModelPulseActive(true);
    const timeout = window.setTimeout(() => setModelPulseActive(false), 900);
    return () => window.clearTimeout(timeout);
  }, [topbarModel.label, topbarModel.dotColor]);

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
    if (!sessionMenuOpenId && !statusOpen) {
      return;
    }

    function handleClose() {
      setSessionMenuOpenId(null);
      setStatusOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSessionMenuOpenId(null);
        setStatusOpen(false);
      }
    }

    window.addEventListener("click", handleClose);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [sessionMenuOpenId, statusOpen]);

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
      setProjects(bootstrap.projects);
    });
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
      setSelectedProjectId(session.projectId ?? null);
      setRouteLabel(toXeivoraLabel(session.routeLabel));
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setAutoSwitchNotice(null);
      setError(null);
      setMobileSidebarOpen(false);
      setSessionMenuOpenId(null);
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
      setSelectedProjectId(payload.session.projectId ?? null);
      setRouteLabel("Xeivora is ready");
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setAutoSwitchNotice(null);
      setMobileSidebarOpen(false);
      setSessionMenuOpenId(null);
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
    setShareFeedback(null);
    composerRef.current?.focus();
  }

  async function handleRenameSession(sessionId: string) {
    const session = sessions.find((candidate) => candidate.id === sessionId);
    const nextTitle = window.prompt("Rename chat", session?.title || "");

    if (!nextTitle || nextTitle.trim() === session?.title) {
      setSessionMenuOpenId(null);
      return;
    }

    try {
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
      setSessionMenuOpenId(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to rename this chat.");
    }
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

  async function handleArchiveSession(sessionId: string, archived: boolean) {
    try {
      await handleUpdateSessionMetadata(sessionId, { archived });
      if (activeSession?.id === sessionId && archived) {
        setActiveSession(null);
        setSessionFiles([]);
      }
      setSessionMenuOpenId(null);
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
        body: JSON.stringify({ input, modelKey: selectedModel, regenerate }),
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
      <div className="flex min-h-screen bg-[var(--xv-chat-bg)]">
        <aside className="hidden min-h-screen w-[232px] shrink-0 border-r border-[rgba(201,100,66,0.1)] bg-[var(--xv-chat-sidebar)] md:flex">
          <SidebarContent
            activeSessionId={activeSession?.id ?? null}
            collapsed={false}
            onArchiveSession={(sessionId, archived) => void handleArchiveSession(sessionId, archived)}
            onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
            onDismiss={() => setMobileSidebarOpen(false)}
            onNewChat={() => void handleNewChat()}
            onPinSession={(sessionId, pinned) => void handlePinSession(sessionId, pinned)}
            onRenameSession={(sessionId) => void handleRenameSession(sessionId)}
            onSelectSession={(sessionId) => void loadSession(sessionId)}
            onToggleCollapse={() => setMobileSidebarOpen(false)}
            onToggleSessionMenu={setSessionMenuOpenId}
            openSessionMenuId={sessionMenuOpenId}
            pathname={pathname}
            sessionGroups={groupedSessions}
            viewer={viewer}
          />
        </aside>

        <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
          <SheetContent className="bg-[var(--xv-chat-sidebar)] p-0" side="left">
            <SidebarContent
              activeSessionId={activeSession?.id ?? null}
              collapsed={false}
              mobile
              onArchiveSession={(sessionId, archived) => void handleArchiveSession(sessionId, archived)}
              onDeleteSession={(sessionId) => void handleDeleteSession(sessionId)}
              onDismiss={() => setMobileSidebarOpen(false)}
              onNewChat={() => void handleNewChat()}
              onPinSession={(sessionId, pinned) => void handlePinSession(sessionId, pinned)}
              onRenameSession={(sessionId) => void handleRenameSession(sessionId)}
              onSelectSession={(sessionId) => void loadSession(sessionId)}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              onToggleSessionMenu={setSessionMenuOpenId}
              openSessionMenuId={sessionMenuOpenId}
              pathname={pathname}
              sessionGroups={groupedSessions}
              viewer={viewer}
            />
          </SheetContent>
        </Sheet>

        <main className="relative flex min-w-0 flex-1 flex-col bg-[var(--xv-chat-bg)]">
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
            onShare={() => void handleShareSession()}
            onToggleStatus={() => setStatusOpen((value) => !value)}
            orchestrationSteps={orchestrationSteps}
            routeLabel={routeLabel}
            shareFeedback={shareFeedback}
            shareReady={Boolean(activeSession)}
            statusOpen={statusOpen}
            systemIndicatorLive={systemIndicatorLive}
            title={topbarTitle}
            continuityStatus={continuityStatus}
            workflowMode={workflowMode}
          />

          <div className="min-h-0 flex-1 pt-[50px]">
            {hasMessages ? (
              <ChatThreadView
                autoSwitchNotice={autoSwitchNotice}
                composerRef={composerRef}
                copiedResponseId={copiedResponseId}
                error={error}
                fileInputRef={fileInputRef}
                isStreaming={isStreaming}
                isUploadingFiles={isUploadingFiles}
                lastAssistantMessage={lastAssistantMessage}
                messages={messages}
                messagesRef={messagesRef}
                onCopyResponse={async (message) => {
                  await navigator.clipboard.writeText(message.content);
                  setCopiedResponseId(message.id);
                  setTimeout(() => setCopiedResponseId(null), 1200);
                }}
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
                voiceState={voiceState}
              />
            ) : (
              <ChatHomeView
                composerRef={composerRef}
                error={error}
                fileInputRef={fileInputRef}
                isStreaming={isStreaming}
                isUploadingFiles={isUploadingFiles}
                onFilesSelected={(files) => void handleUploadFiles(files)}
                onPromptChange={setPrompt}
                onRemoveFile={(fileId) => void handleRemoveFile(fileId)}
                onSend={() => void handleSend(false)}
                onStartVoiceCapture={() => void startVoiceCapture()}
                onStop={stopGenerating}
                onStopVoiceCapture={stopVoiceCapture}
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
        </main>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  activeSessionId: string | null;
  collapsed: boolean;
  mobile?: boolean;
  onArchiveSession: (sessionId: string, archived: boolean) => void;
  onDeleteSession: (sessionId: string) => void;
  onDismiss?: () => void;
  onNewChat: () => void;
  onPinSession: (sessionId: string, pinned: boolean) => void;
  onRenameSession: (sessionId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggleCollapse: () => void;
  onToggleSessionMenu: (sessionId: string | null) => void;
  openSessionMenuId: string | null;
  pathname: string;
  sessionGroups: Array<[string, ChatSessionSummary[]]>;
  viewer?: AuthUser | null;
};

function SidebarContent({
  activeSessionId,
  collapsed,
  mobile = false,
  onArchiveSession,
  onDeleteSession,
  onDismiss,
  onNewChat,
  onPinSession,
  onRenameSession,
  onSelectSession,
  onToggleCollapse,
  onToggleSessionMenu,
  openSessionMenuId,
  pathname,
  sessionGroups,
  viewer = null
}: SidebarContentProps) {
  const profileName = viewer?.name || workspaceName;
  const profilePlan = viewer?.plan || "Pro";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden px-[10px] py-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1.5">
        <Link
          className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left transition hover:bg-[rgba(201,100,66,0.08)]"
          href="/"
          onClick={() => onDismiss?.()}
        >
          <div className="text-[15px] font-medium tracking-[-0.01em] text-[#f0ead8]">
            Xei<span className="text-[var(--xv-chat-accent)]">vora</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            aria-label="Start new chat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
            onClick={onNewChat}
            type="button"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {mobile ? (
            <button
              aria-label="Close sidebar"
              className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
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
          "mb-2 flex h-10 items-center rounded-[10px] border border-[rgba(201,100,66,0.15)] bg-[var(--xv-chat-surface)] px-3 text-[13px] font-normal text-[var(--xv-chat-muted)] shadow-sm transition hover:border-[var(--xv-chat-border-strong)] hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]",
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
          <nav className="grid gap-[1px] border-b border-[rgba(201,100,66,0.1)] pb-2" aria-label="Workspace navigation">
            {navItems.map((item) => (
              <SidebarNavItem item={item} key={item.label} onDismiss={onDismiss} pathname={pathname} />
            ))}
          </nav>

          <div className="mt-2 min-h-0 flex-1 overflow-hidden">
            <div className="mb-1 flex items-center justify-between px-2">
              <p className="text-[11px] font-normal tracking-[0.01em] text-[rgba(240,234,216,0.35)]">
                Recents
              </p>
            </div>

            <ScrollArea className="h-full pr-1">
              <div className="space-y-3 pb-4">
                {sessionGroups.length ? (
                  sessionGroups.map(([group, items]) => (
                    <div className="space-y-1" key={group}>
                      <h3 className="px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[rgba(240,234,216,0.35)]">
                        {group}
                      </h3>
                      {items.map((session) => (
                        <RecentSessionRow
                          active={activeSessionId === session.id}
                          key={session.id}
                          menuOpen={openSessionMenuId === session.id}
                          onArchive={() => onArchiveSession(session.id, !session.archived)}
                          onDelete={() => onDeleteSession(session.id)}
                          onOpenChange={(nextOpen) => onToggleSessionMenu(nextOpen ? session.id : null)}
                          onPin={() => onPinSession(session.id, !session.pinned)}
                          onRename={() => onRenameSession(session.id)}
                          onSelect={() => {
                            onSelectSession(session.id);
                            onDismiss?.();
                          }}
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

          <div className="mt-auto border-t border-[rgba(201,100,66,0.1)] px-1 pt-2">
            <div className="flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 transition hover:bg-[rgba(201,100,66,0.08)]">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-[10px] font-medium text-white">
                {getInitials(profileName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-[var(--xv-chat-text)]">{profileName}</p>
                <p className="text-[10.5px] text-[var(--xv-chat-muted)]">{profilePlan}</p>
              </div>
              <button
                aria-label="Profile options"
                className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
                type="button"
              >
                <Ellipsis className="h-4 w-4" />
              </button>
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
          ? "bg-[#1a1410] font-medium text-[#f0ead8]"
          : "text-[var(--xv-chat-muted)] hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
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
  menuOpen,
  onArchive,
  onDelete,
  onOpenChange,
  onPin,
  onRename,
  onSelect,
  session
}: {
  active: boolean;
  menuOpen: boolean;
  onArchive: () => void;
  onDelete: () => void;
  onOpenChange: (nextOpen: boolean) => void;
  onPin: () => void;
  onRename: () => void;
  onSelect: () => void;
  session: ChatSessionSummary;
}) {
  return (
    <div className="group relative">
      <button
        className={cn(
        "flex h-9 w-full items-center gap-2 rounded-[10px] px-2.5 pr-9 text-left text-[12px] font-normal transition",
        active
            ? "bg-[#1a1410] text-[#f0ead8]"
            : "text-[var(--xv-chat-muted)] hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
        )}
        onClick={onSelect}
        type="button"
      >
        {session.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--xv-chat-accent)]" /> : null}
        <span className="truncate">{session.title}</span>
      </button>

      <button
        aria-label={`Open options for ${session.title}`}
        className={cn(
          "absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]",
          menuOpen || active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenChange(!menuOpen);
        }}
        type="button"
      >
        <Ellipsis className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-0 top-[calc(100%+8px)] z-40 w-[220px] rounded-[8px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.14, ease: "easeOut" }}
          >
            <SessionMenuButton icon={Pin} label={session.pinned ? "Unpin conversation" : "Pin conversation"} onClick={onPin} />
            <SessionMenuButton icon={Pencil} label="Rename" onClick={onRename} />
            <SessionMenuButton
              icon={session.archived ? ArchiveRestore : Archive}
              label={session.archived ? "Restore conversation" : "Archive"}
              onClick={onArchive}
            />
            <SessionMenuButton destructive icon={Trash2} label="Delete" onClick={onDelete} />
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
        "flex h-9 w-full items-center gap-3 rounded-[8px] px-3 text-left text-[13px] transition",
        destructive
          ? "text-[#f07f67] hover:bg-[rgba(201,100,66,0.1)]"
          : "text-[#f0ead8] hover:bg-[rgba(201,100,66,0.1)]"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </button>
  );
}

function ChatTopbar({
  connectedProviders,
  continuityStatus,
  currentModelSummary,
  fallbackSummary,
  model,
  modelPulseActive,
  onShare,
  onToggleStatus,
  orchestrationSteps,
  routeLabel,
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
  onShare: () => void;
  onToggleStatus: () => void;
  orchestrationSteps: OrchestrationStep[];
  routeLabel: string;
  shareFeedback: string | null;
  shareReady: boolean;
  statusOpen: boolean;
  systemIndicatorLive: boolean;
  title: string;
  workflowMode: WorkflowMode;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-20 border-b border-[rgba(201,100,66,0.12)] bg-[#0e0b08]/92 backdrop-blur">
      <div className="flex h-[50px] items-center gap-3 px-4 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-[var(--xv-chat-text)]">{title}</p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ModelPill model={model} pulse={modelPulseActive} />

          <button
            aria-label="Share chat"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)] disabled:cursor-not-allowed disabled:opacity-55"
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
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
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
                  className="absolute right-0 top-[calc(100%+10px)] z-30 w-[300px] rounded-[18px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] p-4 shadow-[var(--xv-chat-shadow)]"
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
  error,
  fileInputRef,
  isStreaming,
  isUploadingFiles,
  onFilesSelected,
  onPromptChange,
  onRemoveFile,
  onSend,
  onStartVoiceCapture,
  onStop,
  onStopVoiceCapture,
  onSuggestion,
  prompt,
  sessionFiles,
  voiceState
}: {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isStreaming: boolean;
  isUploadingFiles: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onPromptChange: (value: string) => void;
  onRemoveFile: (fileId: string) => void;
  onSend: () => void;
  onStartVoiceCapture: () => void;
  onStop: () => void;
  onStopVoiceCapture: () => void;
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
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--xv-chat-accent)] text-[20px] font-medium text-white"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            X
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
            className="mt-2 max-w-[400px] text-center text-[14px] font-light leading-[1.6] text-[rgba(240,234,216,0.7)]"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut", delay: 0.04 }}
          >
            One workspace. Every model. Your work never stops — context preserved across Claude, GPT-4o,
            Gemini and more.
          </motion.p>

          {error ? <ErrorBanner className="mt-6 w-full max-w-[660px]" message={error} /> : null}

          <div className="mt-6 grid w-full max-w-[520px] grid-cols-2 gap-2">
            {welcomeSuggestions.map((suggestion) => (
              <button
                className="group rounded-[16px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410] p-[14px] text-left transition hover:border-[var(--xv-chat-border-strong)] hover:bg-[rgba(201,100,66,0.08)]"
                key={suggestion.label}
                onClick={() => onSuggestion(suggestion.prompt)}
                type="button"
              >
                <div className="text-[rgba(201,100,66,0.7)]">
                  <suggestion.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-2 text-[13px] font-medium text-[var(--xv-chat-text)]">{suggestion.label}</h3>
                <p className="mt-1 text-[12px] font-light leading-[1.4] text-[rgba(240,234,216,0.8)]">
                  {suggestion.detail}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[rgba(201,100,66,0.1)] bg-[var(--xv-chat-bg)] px-4 pb-[14px] pt-3">
        <ChatComposer
          composerRef={composerRef}
          fileInputRef={fileInputRef}
          files={sessionFiles}
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

function ChatThreadView({
  autoSwitchNotice,
  composerRef,
  copiedResponseId,
  error,
  fileInputRef,
  isStreaming,
  isUploadingFiles,
  lastAssistantMessage,
  messages,
  messagesRef,
  onCopyResponse,
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
  voiceState
}: {
  autoSwitchNotice: ModelSwitch | null;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  copiedResponseId: string | null;
  error: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isStreaming: boolean;
  isUploadingFiles: boolean;
  lastAssistantMessage: ChatMessage | null;
  messages: ChatMessage[];
  messagesRef: RefObject<HTMLDivElement | null>;
  onCopyResponse: (message: ChatMessage) => Promise<void>;
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
  voiceState: VoiceState;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto" ref={messagesRef}>
        <div className="mx-auto flex w-full max-w-[700px] flex-col gap-4 px-5 pb-28 pt-5">
          {error ? <ErrorBanner message={error} /> : null}
          {autoSwitchNotice ? <AutoSwitchBanner switchData={autoSwitchNotice} /> : null}

          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const isLatestAssistant = lastAssistantMessage?.id === message.id;
              const assistantModelLabel = getAssistantModelLabel(message.modelKey, message.provider);

              if (!isAssistant) {
                return (
                  <motion.article
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-end"
                    initial={{ opacity: 0, y: 14 }}
                    key={message.id}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="max-w-[70%] min-w-0">
                      <div className="mb-1 text-right text-[13px] font-medium text-[var(--xv-chat-text)]">You</div>
                      <div className="rounded-[18px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-4 py-3 text-[14px] font-light leading-[1.75] text-[#f0ead8]">
                        {message.content}
                      </div>
                    </div>
                  </motion.article>
                );
              }

              return (
                <motion.article
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex gap-3"
                  initial={{ opacity: 0, y: 14 }}
                  key={message.id}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <AvatarBubble label="X" />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[13px] font-medium text-[var(--xv-chat-text)]">
                        <span className="text-[var(--xv-chat-text)]">Xeivora</span>
                        <span className="text-[var(--xv-chat-muted)]">·</span>
                        <span className="text-[var(--xv-chat-muted)]">{assistantModelLabel}</span>
                      </div>

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
                        </div>
                      ) : null}
                    </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[rgba(201,100,66,0.1)] bg-[var(--xv-chat-bg)] px-4 pb-[14px] pt-3">
        <ChatComposer
          composerRef={composerRef}
          fileInputRef={fileInputRef}
          files={sessionFiles}
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
  fileInputRef: RefObject<HTMLInputElement | null>;
  files: UploadedFileSummary[];
  isStreaming: boolean;
  isUploadingFiles: boolean;
  onFilesSelected: (files: FileList | File[]) => void;
  onPromptChange: (value: string) => void;
  onRemoveFile: (fileId: string) => void;
  onSend: () => void;
  onStartVoiceCapture: () => void;
  onStop: () => void;
  onStopVoiceCapture: () => void;
  prompt: string;
  voiceState: VoiceState;
};

function ChatComposer({
  composerRef,
  fileInputRef,
  files,
  isStreaming,
  isUploadingFiles,
  onFilesSelected,
  onPromptChange,
  onRemoveFile,
  onSend,
  onStartVoiceCapture,
  onStop,
  onStopVoiceCapture,
  prompt,
  voiceState
}: ChatComposerProps) {
  return (
    <div className="mx-auto w-full max-w-[660px]">
      <form
        className="rounded-[18px] border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-[10px] py-2 shadow-[var(--xv-chat-shadow)] focus-within:border-[#c96442]"
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
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,100,66,0.15)] bg-[#1a1410] px-3 py-1 text-[12px] text-[rgba(240,234,216,0.8)]"
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
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(201,100,66,0.15)] bg-[#1a1410] px-3 py-1 text-[12px] text-[rgba(240,234,216,0.8)]">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing file...</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            aria-label="Attach file"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            className="min-h-[22px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] font-light leading-[1.5] text-[#f0ead8] outline-none placeholder:text-[rgba(240,234,216,0.35)]"
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--xv-chat-muted)] transition hover:bg-[rgba(201,100,66,0.08)] hover:text-[var(--xv-chat-text)]"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#c96442] text-white transition hover:bg-[#b85a3b]"
                onClick={onStop}
                type="button"
              >
                <Square className="h-4 w-4" />
              </button>
            ) : (
              <button
                aria-label="Send message"
                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#c96442] text-white transition hover:bg-[#b85a3b] disabled:cursor-not-allowed disabled:bg-[#46362c] disabled:text-[rgba(240,234,216,0.4)]"
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

function ModelPill({ model, pulse = false }: { model: ModelPillData; pulse?: boolean }) {
  return (
    <div className="inline-flex h-8 items-center gap-[5px] rounded-full border border-[rgba(201,100,66,0.2)] bg-[#1a1410] px-[10px] text-[12px] text-[#f0ead8]">
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
      <ChevronDown className="h-3.5 w-3.5 text-[rgba(240,234,216,0.7)]" />
    </div>
  );
}

function AvatarBubble({ accent = false, label }: { accent?: boolean; label: string }) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
        accent
          ? "border-transparent bg-[var(--xv-chat-accent)] text-white"
          : "border border-[var(--xv-chat-border)] bg-[var(--xv-chat-surface)] text-[var(--xv-chat-accent)]"
      )}
    >
      {label}
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
        "rounded-[20px] border border-[rgba(201,100,66,0.18)] bg-[rgba(201,100,66,0.08)] px-4 py-3 text-[13px] leading-6 text-[#f4c0b4]",
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

function getTopbarModelMeta(modelKey: ModelKey, resolvedModel?: string | null): ModelPillData {
  const map: Record<ModelKey, ModelPillData> = {
    claude: { dotColor: coralAccent, label: resolvedModel || "Claude" },
    "gpt-4o": { dotColor: "#16a34a", label: resolvedModel || "GPT-4o" },
    gemini: { dotColor: "#2563eb", label: resolvedModel || "Gemini" },
    "orbit-auto": { dotColor: coralAccent, label: resolvedModel || "Xeivora" }
  };

  return map[modelKey];
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
