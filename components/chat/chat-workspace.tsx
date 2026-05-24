"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Ellipsis,
  FolderKanban,
  Globe,
  ImagePlus,
  LayoutGrid,
  Mic,
  PanelLeft,
  Paperclip,
  Plus,
  RefreshCcw,
  Search,
  SendHorizontal,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Workflow
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { OrbitLogo } from "@/components/orbit-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type {
  ChatBootstrap,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ModelKey,
  OrchestrationStep,
  ProviderKey,
  ProviderStatus,
  StreamContinuityPayload,
  StreamEvent
} from "@/lib/chat-types";
import { cn } from "@/lib/utils";
import { modelOptions } from "@/lib/workspace";

const workspaceName = "Xeivora";
const workspaceUserName = "Luxshan";

const quickActions: QuickAction[] = [
  {
    label: "Create an image",
    icon: ImagePlus,
    prompt: "Create an image concept for Xeivora's next launch."
  },
  {
    label: "Write or edit",
    icon: Sparkles,
    prompt: "Help me write or edit this clearly and professionally."
  },
  {
    label: "Look something up",
    icon: Globe,
    prompt: "Look something up for me and summarize it clearly."
  }
];

const primaryNav: SidebarItem[] = [
  {
    label: "Projects",
    icon: FolderKanban,
    href: "/dashboard"
  },
  {
    label: "Memory",
    icon: BrainCircuit,
    href: "/memory"
  },
  {
    label: "Apps",
    icon: LayoutGrid,
    prompt: "Show me the current Xeivora integrations and suggest the next connection."
  },
  {
    label: "Workflows",
    icon: Workflow,
    href: "/workflows"
  },
  {
    label: "More",
    icon: Ellipsis,
    href: "/settings"
  }
];

type QuickAction = {
  icon: LucideIcon;
  label: string;
  prompt: string;
};

type SidebarItem = {
  href?: string;
  icon: LucideIcon;
  label: string;
  prompt?: string;
};

type ContinuityState = StreamContinuityPayload;

export function ChatWorkspace() {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelKey>("orbit-auto");
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedResponseId, setCopiedResponseId] = useState<string | null>(null);
  const [orchestrationSteps, setOrchestrationSteps] = useState<OrchestrationStep[]>([]);
  const [routeLabel, setRouteLabel] = useState("Xeivora is ready");
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("simulation");
  const [thinking, setThinking] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [showContinuityPanel, setShowContinuityPanel] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<"simple_chat" | "continuity" | "coding_continuity">(
    "simple_chat"
  );
  const [continuityStatus, setContinuityStatus] = useState<ContinuityState>({
    currentProvider: "simulation",
    currentModel: null,
    fallbackProvider: null,
    fallbackModel: null,
    providerChain: ["gemini", "openai", "anthropic", "ollama", "simulation"],
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

  const messages = activeSession?.messages ?? [];
  const hasMessages = messages.length > 0;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        `${session.title} ${session.preview}`.toLowerCase().includes(deferredSearchQuery.toLowerCase())
      ),
    [deferredSearchQuery, sessions]
  );
  const groupedSessions = useMemo(() => groupSessions(filteredSessions), [filteredSessions]);
  const lastAssistantMessage = useMemo(
    () => messages.filter((message) => message.role === "assistant").slice(-1)[0] || null,
    [messages]
  );
  const selectedModelLabel = modelOptions.find((option) => option.key === selectedModel)?.label ?? "Instant";
  const composerModelLabel = getComposerModelLabel(selectedModel);
  const continuityChain =
    continuityStatus.finalProviderChain.length > 0
      ? continuityStatus.finalProviderChain
      : continuityStatus.providerChain;
  const currentModelSummary = formatModelSummary(
    continuityStatus.currentProvider,
    continuityStatus.currentModel,
    selectedModelLabel
  );
  const fallbackSummary = formatFallbackSummary(
    continuityStatus.fallbackProvider,
    continuityStatus.fallbackModel,
    continuityChain
  );
  const systemIndicatorLive =
    showContinuityPanel || workflowMode !== "simple_chat" || continuityStatus.checkpointSaved || isStreaming;

  useEffect(() => {
    void bootstrapWorkspace().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Xeivora.");
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1100) {
      setSidebarCollapsed(true);
    }
  }, []);

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
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 180)}px`;
  }, [prompt]);

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
      setSelectedModel(session.modelPreference);
      setRouteLabel(toXeivoraLabel(session.routeLabel));
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setError(null);
      setMobileSidebarOpen(false);
    });
  }

  async function createSession() {
    const response = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelPreference: selectedModel })
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
      setRouteLabel("New conversation");
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setMobileSidebarOpen(false);
    });

    composerRef.current?.focus();
    return payload.session;
  }

  async function handleNewChat() {
    try {
      setError(null);
      const session = await createSession();
      setPrompt("");
      setSelectedModel(session.modelPreference);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create a new chat.");
    }
  }

  function stopGenerating() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setThinking(false);
    setRouteLabel("Generation stopped");
  }

  async function handleSend(regenerate = false) {
    if (isStreaming) {
      return;
    }

    const input = regenerate ? getLastUserPrompt(activeSession) : prompt.trim();
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
          setOrchestrationSteps(typedEvent.payload.steps);
        }

        if (typedEvent.type === "continuity") {
          setActiveProvider(typedEvent.payload.currentProvider);
          setContinuityStatus(typedEvent.payload);
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
    <div className="dark min-h-screen bg-black text-white">
      <div className="flex min-h-screen bg-black">
        <motion.aside
          animate={{ width: sidebarCollapsed ? 72 : 260 }}
          className="hidden min-h-screen shrink-0 border-r border-white/[0.08] bg-[#050505] md:flex"
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <SidebarContent
            activeSessionId={activeSession?.id ?? null}
            collapsed={sidebarCollapsed}
            onNewChat={() => void handleNewChat()}
            onPromptPick={(value) => {
              setPrompt(value);
              composerRef.current?.focus();
            }}
            onSearchChange={setSearchQuery}
            onSelectSession={(sessionId) => void loadSession(sessionId)}
            onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
            pathname={pathname}
            searchQuery={searchQuery}
            sessionGroups={groupedSessions}
          />
        </motion.aside>

        <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
          <SheetContent className="bg-[#050505] p-0" side="left">
            <SidebarContent
              activeSessionId={activeSession?.id ?? null}
              collapsed={false}
              mobile
              onDismiss={() => setMobileSidebarOpen(false)}
              onNewChat={() => void handleNewChat()}
              onPromptPick={(value) => {
                setPrompt(value);
                composerRef.current?.focus();
              }}
              onSearchChange={setSearchQuery}
              onSelectSession={(sessionId) => void loadSession(sessionId)}
              onToggleCollapse={() => setMobileSidebarOpen(false)}
              pathname={pathname}
              searchQuery={searchQuery}
              sessionGroups={groupedSessions}
            />
          </SheetContent>
        </Sheet>

        <main className="relative flex min-w-0 flex-1 bg-black">
          <button
            aria-label="Open sidebar"
            className="absolute left-4 top-4 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#111111] text-white/72 transition hover:bg-[#1f1f1f] md:hidden"
            onClick={() => setMobileSidebarOpen(true)}
            type="button"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          <div className="absolute right-4 top-4 z-30">
            <button
              aria-label={statusOpen ? "Close continuity status" : "Open continuity status"}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#111111] text-white/70 transition hover:bg-[#1f1f1f] hover:text-white"
              onClick={() => setStatusOpen((value) => !value)}
              type="button"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {systemIndicatorLive ? (
                <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.42)]" />
              ) : null}
            </button>

            <AnimatePresence>
              {statusOpen ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 w-[280px] rounded-[20px] border border-white/[0.08] bg-[#111111] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
                  initial={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <div className="mb-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/34">Continuity</p>
                    <p className="mt-1 text-sm text-white/86">{routeLabel}</p>
                  </div>

                  <div className="space-y-2.5 text-sm text-white/72">
                    <StatusRow label="Current model" value={currentModelSummary} />
                    <StatusRow label="Next fallback" value={fallbackSummary} />
                    <StatusRow label="Memory" value={continuityStatus.memoryPreserved ? "Active" : "Syncing"} />
                    <StatusRow
                      label="Context"
                      value={continuityStatus.contextCompressed ? "Compressed" : "Preserved"}
                    />
                    <StatusRow label="Provider chain" value={continuityChain.map(formatProviderLabel).join(" → ")} />
                    <StatusRow label="Workflow" value={workflowModeLabel(workflowMode)} />
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

          {hasMessages ? (
            <ChatThreadView
              composerRef={composerRef}
              copiedResponseId={copiedResponseId}
              error={error}
              isStreaming={isStreaming}
              lastAssistantMessage={lastAssistantMessage}
              messages={messages}
              messagesRef={messagesRef}
              onCopyResponse={async (message) => {
                await navigator.clipboard.writeText(message.content);
                setCopiedResponseId(message.id);
                setTimeout(() => setCopiedResponseId(null), 1200);
              }}
              onEditPrompt={setPrompt}
              onModelChange={setSelectedModel}
              onPromptChange={setPrompt}
              onRegenerate={() => void handleSend(true)}
              onSend={() => void handleSend(false)}
              onStop={stopGenerating}
              prompt={prompt}
              selectedModel={selectedModel}
              thinking={thinking}
            />
          ) : (
            <ChatHomeView
              composerRef={composerRef}
              error={error}
              isStreaming={isStreaming}
              onModelChange={setSelectedModel}
              onPromptChange={setPrompt}
              onQuickAction={(value) => {
                setPrompt(value);
                composerRef.current?.focus();
              }}
              onSend={() => void handleSend(false)}
              onStop={stopGenerating}
              prompt={prompt}
              selectedModel={selectedModel}
            />
          )}
        </main>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  activeSessionId: string | null;
  collapsed: boolean;
  mobile?: boolean;
  onDismiss?: () => void;
  onNewChat: () => void;
  onPromptPick: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggleCollapse: () => void;
  pathname: string;
  searchQuery: string;
  sessionGroups: Array<[string, ChatSessionSummary[]]>;
};

function SidebarContent({
  activeSessionId,
  collapsed,
  mobile = false,
  onDismiss,
  onNewChat,
  onPromptPick,
  onSearchChange,
  onSelectSession,
  onToggleCollapse,
  pathname,
  searchQuery,
  sessionGroups
}: SidebarContentProps) {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden px-3 py-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-[10px] px-2 py-1.5 text-left transition hover:bg-[#1f1f1f]",
            collapsed && !mobile && "justify-center px-0"
          )}
          onClick={onNewChat}
          type="button"
        >
          <OrbitLogo compact className="scale-[0.82]" />
          {!collapsed || mobile ? <span className="text-[15px] font-medium text-white">Xeivora</span> : null}
        </button>

        <Button onClick={onToggleCollapse} size="icon" type="button" variant="ghost">
          {mobile ? <ChevronLeft className="h-4 w-4" /> : collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarButton collapsed={collapsed} icon={Plus} label="New chat" onClick={onNewChat} primary />

      {!collapsed || mobile ? (
        <>
          <label className="mt-1 flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm text-white/68 transition hover:bg-[#1f1f1f]">
            <Search className="h-4 w-4 shrink-0 text-white/42" />
            <Input
              className="h-auto border-0 bg-transparent px-0 py-0 text-sm text-white shadow-none placeholder:text-white/34 focus-visible:ring-0"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search chats"
              value={searchQuery}
            />
          </label>

          <nav className="mt-2 grid gap-1" aria-label="Workspace">
            {primaryNav.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.label}
                onDismiss={onDismiss}
                onPromptPick={onPromptPick}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <p className="px-3 pb-2 text-xs font-medium text-white/36">Recents</p>
            <ScrollArea className="h-full">
              <div className="space-y-3 pb-4">
                {sessionGroups.length ? (
                  sessionGroups.map(([group, items]) => (
                    <div className="space-y-1" key={group}>
                      <h3 className="px-3 pb-1 text-[11px] uppercase tracking-[0.18em] text-white/22">{group}</h3>
                      {items.map((session) => (
                        <button
                          className={cn(
                            "flex h-10 w-full items-center rounded-[10px] px-3 text-left text-sm transition",
                            activeSessionId === session.id
                              ? "bg-[#2b2b2b] text-white"
                              : "text-white/68 hover:bg-[#1f1f1f] hover:text-white"
                          )}
                          key={session.id}
                          onClick={() => {
                            onSelectSession(session.id);
                            onDismiss?.();
                          }}
                          type="button"
                        >
                          <span className="truncate">{session.title}</span>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-3 text-sm text-white/32">No recent chats yet.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="mt-auto border-t border-white/[0.06] px-2 pt-3">
            <div className="flex items-center gap-3 rounded-[12px] px-2 py-2 transition hover:bg-[#1f1f1f]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-medium text-white">
                XL
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{workspaceUserName}</p>
                <p className="text-xs text-white/34">Plus</p>
              </div>
              <Link className="text-white/46 transition hover:text-white" href="/settings" onClick={() => onDismiss?.()}>
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 grid gap-1">
            {primaryNav.map((item) => (
              <CollapsedSidebarButton item={item} key={item.label} onPromptPick={onPromptPick} pathname={pathname} />
            ))}
          </div>
          <div className="flex-1" />
          <button
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-xs font-medium text-white"
            type="button"
          >
            XL
          </button>
        </>
      )}
    </div>
  );
}

function SidebarButton({
  collapsed,
  icon: Icon,
  label,
  onClick,
  primary = false
}: {
  collapsed: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={cn(
        "mt-1 flex h-10 items-center rounded-[10px] px-3 text-sm transition",
        primary ? "bg-[#1f1f1f] text-white hover:bg-[#2b2b2b]" : "text-white/68 hover:bg-[#1f1f1f] hover:text-white",
        collapsed ? "justify-center px-0" : "gap-3"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>{label}</span> : null}
    </button>
  );
}

function SidebarNavItem({
  item,
  onDismiss,
  onPromptPick,
  pathname
}: {
  item: SidebarItem;
  onDismiss?: () => void;
  onPromptPick: (value: string) => void;
  pathname: string;
}) {
  const baseClassName =
    "flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition";
  const isActive = item.href ? pathname === item.href : false;

  if (item.href) {
    return (
      <Link
        className={cn(
          baseClassName,
          isActive ? "bg-[#2b2b2b] text-white" : "text-white/68 hover:bg-[#1f1f1f] hover:text-white"
        )}
        href={item.href}
        onClick={() => onDismiss?.()}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <button
      className={cn(baseClassName, "text-white/68 hover:bg-[#1f1f1f] hover:text-white")}
      onClick={() => {
        if (item.prompt) {
          onPromptPick(item.prompt);
        }
        onDismiss?.();
      }}
      type="button"
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </button>
  );
}

function CollapsedSidebarButton({
  item,
  onPromptPick,
  pathname
}: {
  item: SidebarItem;
  onPromptPick: (value: string) => void;
  pathname: string;
}) {
  const sharedClassName =
    "flex h-10 w-10 items-center justify-center rounded-[10px] transition";
  const isActive = item.href ? pathname === item.href : false;

  if (item.href) {
    return (
      <Link
        className={cn(
          sharedClassName,
          isActive ? "bg-[#2b2b2b] text-white" : "text-white/56 hover:bg-[#1f1f1f] hover:text-white"
        )}
        href={item.href}
        title={item.label}
      >
        <item.icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button
      className={cn(sharedClassName, "text-white/56 hover:bg-[#1f1f1f] hover:text-white")}
      onClick={() => item.prompt && onPromptPick(item.prompt)}
      title={item.label}
      type="button"
    >
      <item.icon className="h-4 w-4" />
    </button>
  );
}

function ChatHomeView({
  composerRef,
  error,
  isStreaming,
  onModelChange,
  onPromptChange,
  onQuickAction,
  onSend,
  onStop,
  prompt,
  selectedModel
}: {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  error: string | null;
  isStreaming: boolean;
  onModelChange: (model: ModelKey) => void;
  onPromptChange: (value: string) => void;
  onQuickAction: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  prompt: string;
  selectedModel: ModelKey;
}) {
  return (
    <div className="flex min-h-screen w-full justify-center px-4 sm:px-6">
      <div className="flex w-full max-w-[980px] flex-col">
        <div className="flex flex-1 flex-col items-center pt-[22vh]">
          <motion.h1
            animate={{ opacity: 1, y: 0 }}
            className="text-[28px] font-normal tracking-tight text-white sm:text-[30px]"
            initial={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            Good to see you, {workspaceUserName}.
          </motion.h1>

          {error ? <ErrorBanner className="mt-6 w-full max-w-[800px]" message={error} /> : null}

          <div className="mt-8 w-full">
            <ChatComposer
              composerRef={composerRef}
              isStreaming={isStreaming}
              onModelChange={onModelChange}
              onPromptChange={onPromptChange}
              onSend={onSend}
              onStop={onStop}
              prompt={prompt}
              selectedModel={selectedModel}
            />
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {quickActions.map((action) => (
              <motion.button
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.08] bg-transparent px-4 text-sm text-white/72 transition hover:bg-[#1f1f1f] hover:text-white"
                key={action.label}
                onClick={() => onQuickAction(action.prompt)}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                <action.icon className="h-4 w-4" />
                <span>{action.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatThreadView({
  composerRef,
  copiedResponseId,
  error,
  isStreaming,
  lastAssistantMessage,
  messages,
  messagesRef,
  onCopyResponse,
  onEditPrompt,
  onModelChange,
  onPromptChange,
  onRegenerate,
  onSend,
  onStop,
  prompt,
  selectedModel,
  thinking
}: {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  copiedResponseId: string | null;
  error: string | null;
  isStreaming: boolean;
  lastAssistantMessage: ChatMessage | null;
  messages: ChatMessage[];
  messagesRef: RefObject<HTMLDivElement | null>;
  onCopyResponse: (message: ChatMessage) => Promise<void>;
  onEditPrompt: (value: string) => void;
  onModelChange: (model: ModelKey) => void;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
  onSend: () => void;
  onStop: () => void;
  prompt: string;
  selectedModel: ModelKey;
  thinking: boolean;
}) {
  return (
    <div className="flex min-h-screen w-full justify-center px-4 sm:px-6">
      <div className="flex w-full max-w-[980px] flex-col">
        <div
          className="min-h-0 flex-1 overflow-y-auto pt-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={messagesRef}
        >
          <div className="mx-auto flex w-full max-w-[768px] flex-col gap-10 pb-36">
            <AnimatePresence initial={false}>
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                const isLatestAssistant = lastAssistantMessage?.id === message.id;

                if (!isAssistant) {
                  return (
                    <motion.article
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex justify-end"
                      initial={{ opacity: 0, y: 12 }}
                      key={message.id}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                    >
                      <div className="max-w-[75%]">
                        <div className="rounded-[1.6rem] bg-[#2b2b2b] px-4 py-3 text-[15px] leading-6 text-white">
                          {message.content}
                        </div>
                        <div className="mt-2 flex justify-end opacity-0 transition group-hover:opacity-100">
                          <button
                            className="text-xs text-white/40 transition hover:text-white/72"
                            onClick={() => onEditPrompt(message.content)}
                            type="button"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                }

                return (
                  <motion.article
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                    initial={{ opacity: 0, y: 12 }}
                    key={message.id}
                    transition={{ duration: 0.14, ease: "easeOut" }}
                  >
                    {message.content ? (
                      <div className="text-[15px] leading-7 text-white/92">
                        <ChatMarkdown content={toXeivoraLabel(message.content)} />
                      </div>
                    ) : (
                      <ThinkingBlock active={thinking || isStreaming} />
                    )}

                    {message.content ? (
                      <div className="mt-3 flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
                        <button
                          className="text-xs text-white/40 transition hover:text-white/72"
                          onClick={() => void onCopyResponse(message)}
                          type="button"
                        >
                          {copiedResponseId === message.id ? "Copied" : "Copy"}
                        </button>
                        {isLatestAssistant ? (
                          <button
                            className="text-xs text-white/40 transition hover:text-white/72"
                            onClick={onRegenerate}
                            type="button"
                          >
                            Regenerate
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-black via-black pt-4">
          {error ? <ErrorBanner className="mx-auto max-w-[800px]" message={error} /> : null}
          <div className="pb-6">
            <ChatComposer
              composerRef={composerRef}
              isStreaming={isStreaming}
              onModelChange={onModelChange}
              onPromptChange={onPromptChange}
              onSend={onSend}
              onStop={onStop}
              prompt={prompt}
              selectedModel={selectedModel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ChatComposerProps = {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  isStreaming: boolean;
  onModelChange: (model: ModelKey) => void;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  prompt: string;
  selectedModel: ModelKey;
};

function ChatComposer({
  composerRef,
  isStreaming,
  onModelChange,
  onPromptChange,
  onSend,
  onStop,
  prompt,
  selectedModel
}: ChatComposerProps) {
  const modelLabel = getComposerModelLabel(selectedModel);

  return (
    <form
      className="mx-auto w-full max-w-[800px] rounded-[28px] border border-white/[0.08] bg-[#2b2b2b] px-3 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.36)]"
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <div className="flex items-center gap-2">
        <button
          aria-label="Attach file"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:bg-[#303030] hover:text-white"
          type="button"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          className="min-h-[24px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-white outline-none placeholder:text-white/40"
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
          <label className="relative hidden items-center gap-1 rounded-full px-3 py-2 text-sm text-white/72 transition hover:bg-[#303030] sm:inline-flex">
            <span>{modelLabel}</span>
            <select
              aria-label="Choose model"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => onModelChange(event.target.value as ModelKey)}
              value={selectedModel}
            >
              {modelOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {getComposerModelLabel(option.key)}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-white/40" />
          </label>

          <button
            aria-label="Voice input"
            className="hidden h-9 w-9 items-center justify-center rounded-full text-white/55 transition hover:bg-[#303030] hover:text-white sm:inline-flex"
            type="button"
          >
            <Mic className="h-4 w-4" />
          </button>

          {isStreaming ? (
            <button
              aria-label="Stop generating"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90"
              onClick={onStop}
              type="button"
            >
              <AudioLines className="h-4 w-4" />
            </button>
          ) : (
            <button
              aria-label="Send message"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/30"
              disabled={!prompt.trim()}
              type="submit"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function ThinkingBlock({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={active ? { opacity: [0.24, 1, 0.24] } : { opacity: 0.35 }}
          className="h-2 w-2 rounded-full bg-white/72"
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
        "mb-4 rounded-2xl border border-white/[0.08] bg-[#111111] px-4 py-3 text-sm leading-6 text-white/64",
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
      <span className="text-white/42">{label}</span>
      <span className="max-w-[150px] text-right text-white/86">{value}</span>
    </div>
  );
}

function groupSessions(sessions: ChatSessionSummary[]) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const groups: Record<string, ChatSessionSummary[]> = {
    Today: [],
    Yesterday: [],
    Earlier: []
  };

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (updatedAt >= startOfToday) {
      groups.Today.push(session);
    } else if (updatedAt >= startOfYesterday) {
      groups.Yesterday.push(session);
    } else {
      groups.Earlier.push(session);
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
    openai: "OpenAI",
    anthropic: "Claude",
    google: "Gemini",
    gemini: "Gemini",
    ollama: "Ollama",
    simulation: "Simulation"
  };

  return labels[provider] ?? provider;
}

function getComposerModelLabel(modelKey: ModelKey) {
  const labels: Record<ModelKey, string> = {
    "orbit-auto": "Instant",
    "gpt-4o": "GPT-4o",
    claude: "Claude",
    gemini: "Gemini"
  };

  return labels[modelKey];
}

function formatModelSummary(provider: ProviderKey | null, model: string | null | undefined, fallbackLabel: string) {
  if (provider && model) {
    return `${formatProviderLabel(provider)} ${model}`;
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
    return `${formatProviderLabel(fallbackProvider)} ${fallbackModel}`;
  }

  if (fallbackProvider) {
    return formatProviderLabel(fallbackProvider);
  }

  const nextProvider = continuityChain.find((provider) => provider !== "simulation");
  return nextProvider ? formatProviderLabel(nextProvider) : "Standby";
}

function workflowModeLabel(mode: "simple_chat" | "continuity" | "coding_continuity") {
  const labels: Record<typeof mode, string> = {
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
    return "Xeivora hit a provider interruption and kept continuity intact. Try again and it will continue cleanly.";
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
