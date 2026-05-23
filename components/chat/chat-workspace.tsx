"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  AudioLines,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  FileStack,
  FolderKanban,
  ImagePlus,
  LayoutGrid,
  Mic,
  PanelLeft,
  Paperclip,
  PlugZap,
  Plus,
  RefreshCcw,
  Search,
  SendHorizontal,
  Settings2,
  Sparkles,
  Workflow,
  Wrench
} from "lucide-react";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { OrbitLogo } from "@/components/orbit-logo";
import { Badge } from "@/components/ui/badge";
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
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";
import { modelOptions } from "@/lib/workspace";

const workspaceName = "Xeivora";
const workspaceUserName = "Luxshan";

const quickActions: QuickAction[] = [
  {
    label: "Create an image",
    icon: ImagePlus,
    prompt: "Create a cinematic image concept for Xeivora's next product launch."
  },
  {
    label: "Write or edit",
    icon: Sparkles,
    prompt: "Help me write and refine a polished update for Xeivora customers."
  },
  {
    label: "Research",
    icon: Search,
    prompt: "Research this topic and give me a crisp executive summary with sources."
  },
  {
    label: "Code",
    icon: Code2,
    prompt: "Build a production-ready Next.js feature for Xeivora."
  },
  {
    label: "Analyze files",
    icon: FileStack,
    prompt: "Analyze the files in this workspace and tell me what matters most."
  },
  {
    label: "Build workflow",
    icon: Workflow,
    prompt: "Design a multi-step AI workflow with memory, routing, and fallback handling."
  }
];

const sidebarItems: SidebarItem[] = [
  {
    label: "Projects",
    detail: "Planning and launches",
    icon: FolderKanban,
    href: "/dashboard"
  },
  {
    label: "Memory",
    detail: "Persistent context",
    icon: BrainCircuit,
    href: "/memory"
  },
  {
    label: "Workflows",
    detail: "Execution layer",
    icon: Workflow,
    href: "/workflows"
  },
  {
    label: "Agents",
    detail: "Specialist systems",
    icon: Bot,
    href: "/agents"
  },
  {
    label: "Files",
    detail: "Document analysis",
    icon: FileStack,
    prompt: "Show me how Xeivora can analyze and reason over my files."
  },
  {
    label: "Integrations",
    detail: "Connected tools",
    icon: PlugZap,
    prompt: "Show me the current integrations and suggest what to connect next."
  },
  {
    label: "Settings",
    detail: "Workspace controls",
    icon: Settings2,
    href: "/settings"
  }
];

type QuickAction = {
  icon: LucideIcon;
  label: string;
  prompt: string;
};

type SidebarItem = {
  detail: string;
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
  const [continuityCollapsed, setContinuityCollapsed] = useState(false);
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
  const selectedModelLabel = modelOptions.find((option) => option.key === selectedModel)?.label ?? "Xeivora Auto";
  const composerModelLabel = getComposerModelLabel(selectedModel);
  const availableProviderCount = countAvailableProviders(providerStatus);
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
  const runtimeTone = getRuntimeTone(workflowMode, routeLabel);
  const systemPanelActive =
    showContinuityPanel || workflowMode !== "simple_chat" || continuityStatus.checkpointSaved || isStreaming;

  useEffect(() => {
    void bootstrapWorkspace().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Xeivora.");
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setSidebarCollapsed(true);
      setContinuityCollapsed(true);
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
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 220)}px`;
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
      setRouteLabel("Routing request...");

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
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      <div className="flex min-h-screen">
        <motion.aside
          animate={{ width: sidebarCollapsed ? 92 : 292 }}
          className="hidden min-h-screen shrink-0 border-r border-white/[0.08] bg-[#111111] md:flex"
          transition={{ duration: 0.22, ease: "easeOut" }}
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
            providerStatus={providerStatus}
            searchQuery={searchQuery}
            sessionGroups={groupedSessions}
            workspaceName={workspaceName}
          />
        </motion.aside>

        <Sheet onOpenChange={setMobileSidebarOpen} open={mobileSidebarOpen}>
          <SheetContent className="p-0" side="left">
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
              providerStatus={providerStatus}
              searchQuery={searchQuery}
              sessionGroups={groupedSessions}
              workspaceName={workspaceName}
            />
          </SheetContent>
        </Sheet>

        <main className="flex min-w-0 flex-1">
          <section className="flex min-w-0 flex-1 justify-center">
            <div className="flex min-h-screen w-full max-w-[980px] flex-1 flex-col px-4 pb-5 pt-4 sm:px-6 lg:px-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <Button
                  className="md:hidden"
                  onClick={() => setMobileSidebarOpen(true)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>

                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/80 shadow-[0_18px_54px_rgba(0,0,0,0.28)]"
                  initial={{ opacity: 0, y: -8 }}
                >
                  <OrbitLogo compact />
                  <span className="font-medium tracking-tight">{workspaceName}</span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      systemPanelActive ? "bg-white shadow-[0_0_16px_rgba(255,255,255,0.45)]" : "bg-white/35"
                    )}
                  />
                </motion.div>

                <div className="flex min-w-[40px] justify-end xl:hidden">
                  <Badge className="tracking-[0.14em]">
                    {formatProviderLabel(activeProvider)}
                  </Badge>
                </div>
              </div>

              {hasMessages ? (
                <>
                  <div className="flex items-center justify-between gap-3 px-1 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/36">Conversation</p>
                      <h1 className="mt-1 text-xl font-medium tracking-tight text-white">
                        {activeSession?.title ?? "Xeivora conversation"}
                      </h1>
                    </div>
                    <Badge>{runtimeTone}</Badge>
                  </div>

                  <div
                    className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    ref={messagesRef}
                  >
                    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-8 pb-10 pt-3">
                      <AnimatePresence initial={false}>
                        {messages.map((message) => {
                          const isAssistant = message.role === "assistant";
                          const isLatestAssistant = lastAssistantMessage?.id === message.id;

                          return (
                            <motion.article
                              animate={{ opacity: 1, y: 0 }}
                              className={cn("flex w-full", isAssistant ? "justify-start" : "justify-end")}
                              initial={{ opacity: 0, y: 18 }}
                              key={message.id}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                              <div className={cn("w-full max-w-[82%] space-y-3", !isAssistant && "items-end")}>
                                <div
                                  className={cn(
                                    "flex items-center gap-2 text-xs text-white/36",
                                    !isAssistant && "justify-end"
                                  )}
                                >
                                  <span>{isAssistant ? workspaceName : "You"}</span>
                                  <span className="h-1 w-1 rounded-full bg-white/18" />
                                  <time>{formatClock(message.createdAt)}</time>
                                </div>

                                <div
                                  className={cn(
                                    "rounded-[2rem] border px-5 py-4 shadow-[0_30px_80px_rgba(0,0,0,0.28)]",
                                    isAssistant
                                      ? "border-white/[0.08] bg-[#111111]"
                                      : "border-white/[0.1] bg-[#171717]"
                                  )}
                                >
                                  {isAssistant ? (
                                    message.content ? (
                                      <ChatMarkdown content={toXeivoraLabel(message.content)} />
                                    ) : (
                                      <ThinkingBlock active={thinking || isStreaming} />
                                    )
                                  ) : (
                                    <div className="whitespace-pre-wrap text-[15px] leading-7 text-white/90">
                                      {message.content}
                                    </div>
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    "flex items-center gap-2 text-white/46",
                                    !isAssistant && "justify-end"
                                  )}
                                >
                                  {isAssistant && message.content ? (
                                    <>
                                      <Button
                                        onClick={async () => {
                                          await navigator.clipboard.writeText(message.content);
                                          setCopiedResponseId(message.id);
                                          setTimeout(() => setCopiedResponseId(null), 1200);
                                        }}
                                        size="sm"
                                        type="button"
                                        variant="ghost"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                        {copiedResponseId === message.id ? "Copied" : "Copy"}
                                      </Button>
                                      {isLatestAssistant ? (
                                        <Button onClick={() => void handleSend(true)} size="sm" type="button" variant="ghost">
                                          <RefreshCcw className="h-3.5 w-3.5" />
                                          Regenerate
                                        </Button>
                                      ) : null}
                                    </>
                                  ) : null}

                                  {!isAssistant ? (
                                    <Button onClick={() => setPrompt(message.content)} size="sm" type="button" variant="ghost">
                                      <Sparkles className="h-3.5 w-3.5" />
                                      Reuse prompt
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </motion.article>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    {error ? <ErrorBanner message={error} /> : null}
                    <ChatComposer
                      composerRef={composerRef}
                      isStreaming={isStreaming}
                      modelLabel={composerModelLabel}
                      onModelChange={setSelectedModel}
                      onPromptChange={setPrompt}
                      onSend={() => void handleSend(false)}
                      onStop={stopGenerating}
                      prompt={prompt}
                      selectedModel={selectedModel}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <motion.section
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-[860px] pb-14 text-center"
                    initial={{ opacity: 0, y: 18 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <div className="mb-7 flex justify-center">
                      <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/78">
                        <OrbitLogo compact />
                        <span className="font-medium">{workspaceName}</span>
                        <span className="h-2 w-2 rounded-full bg-white/75 shadow-[0_0_18px_rgba(255,255,255,0.34)]" />
                      </div>
                    </div>

                    <h1 className="text-[clamp(2.6rem,5vw,4.35rem)] font-medium tracking-[-0.04em] text-white">
                      Good to see you, {workspaceUserName}.
                    </h1>
                    <p className="mx-auto mt-4 max-w-[640px] text-[15px] leading-7 text-white/46 sm:text-base">
                      Xeivora feels like one continuous intelligence layer, preserving memory, context, routing, and
                      execution without breaking the conversation.
                    </p>

                    {error ? <ErrorBanner className="mx-auto mt-6 max-w-[760px]" message={error} /> : null}

                    <div className="mt-10">
                      <ChatComposer
                        composerRef={composerRef}
                        isHome
                        isStreaming={isStreaming}
                        modelLabel={composerModelLabel}
                        onModelChange={setSelectedModel}
                        onPromptChange={setPrompt}
                        onSend={() => void handleSend(false)}
                        onStop={stopGenerating}
                        prompt={prompt}
                        selectedModel={selectedModel}
                      />
                    </div>

                    <div className="mt-7 flex flex-wrap justify-center gap-3">
                      {quickActions.map((action) => (
                        <motion.button
                          className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2.5 text-sm text-white/76 transition hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
                          key={action.label}
                          onClick={() => {
                            setPrompt(action.prompt);
                            composerRef.current?.focus();
                          }}
                          type="button"
                          whileHover={{ y: -1, scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <action.icon className="h-4 w-4" />
                          <span>{action.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.section>
                </div>
              )}
            </div>
          </section>

          <motion.aside
            animate={{ width: continuityCollapsed ? 92 : 318 }}
            className="hidden min-h-screen shrink-0 border-l border-white/[0.08] bg-[#0d0d0d] xl:flex"
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex h-full w-full flex-col px-4 py-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                {continuityCollapsed ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    <Wrench className="h-4 w-4 text-white/74" />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-white/36">Continuity</p>
                    <h2 className="mt-1 text-lg font-medium tracking-tight text-white">Xeivora runtime</h2>
                  </div>
                )}

                <Button
                  onClick={() => setContinuityCollapsed((value) => !value)}
                  size="icon"
                  type="button"
                  variant="secondary"
                >
                  {continuityCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>

              {continuityCollapsed ? (
                <div className="flex flex-1 flex-col items-center gap-4 pt-3">
                  <RuntimePill label="Model" value={getCompactModelLabel(currentModelSummary)} />
                  <RuntimePill label="Fallback" value={getCompactModelLabel(fallbackSummary)} />
                  <RuntimePill label="Memory" value={continuityStatus.memoryPreserved ? "On" : "Wait"} />
                  <RuntimePill label="Context" value={continuityStatus.contextCompressed ? "Smart" : "Hold"} />
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="rounded-[1.75rem] border border-white/[0.08] bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Status</p>
                        <p className="mt-1 text-sm text-white/82">{runtimeTone}</p>
                      </div>
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          systemPanelActive ? "bg-white shadow-[0_0_18px_rgba(255,255,255,0.32)]" : "bg-white/30"
                        )}
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-1">
                    <RuntimeRow label="Current Model" value={currentModelSummary} />
                    <RuntimeRow label="Next Fallback" value={fallbackSummary} />
                    <RuntimeRow label="Memory" value={continuityStatus.memoryPreserved ? "Active" : "Syncing"} />
                    <RuntimeRow
                      label="Context"
                      value={continuityStatus.contextCompressed ? "Compressed + preserved" : "Preserved"}
                    />
                    <RuntimeRow label="Checkpoint" value={continuityStatus.checkpointSaved ? "Saved" : "Ready"} />
                    <RuntimeRow
                      label="Provider Chain"
                      value={continuityChain.map(formatProviderLabel).join(" → ")}
                    />
                    <RuntimeRow label="Workflow State" value={workflowModeLabel(workflowMode)} />
                  </div>

                  <div className="mt-6 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Workspace</p>
                    <div className="mt-3 grid gap-3 text-sm text-white/74">
                      <div className="flex items-center justify-between gap-3">
                        <span>Current provider</span>
                        <span className="text-white">{formatProviderLabel(activeProvider)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Connected providers</span>
                        <span className="text-white">{availableProviderCount}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Route</span>
                        <span className="max-w-[140px] text-right text-white/82">{routeLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white/[0.02]">
                    <div className="border-b border-white/[0.06] px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">Live workflow</p>
                    </div>
                    <ScrollArea className="h-full max-h-[260px]">
                      <div className="space-y-3 p-4">
                        {orchestrationSteps.length ? (
                          orchestrationSteps.map((step) => (
                            <div
                              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                              key={step.id}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <strong className="text-sm font-medium text-white">{step.label}</strong>
                                <Badge className="border-white/[0.06] bg-white/[0.03] text-white/58">
                                  {step.state}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-white/52">{step.detail}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-5 text-sm leading-6 text-white/42">
                            Xeivora is keeping continuity warm in the background. As soon as a request requires
                            orchestration, the execution chain will appear here.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
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
  providerStatus: ProviderStatus | null;
  searchQuery: string;
  sessionGroups: Array<[string, ChatSessionSummary[]]>;
  workspaceName: string;
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
  providerStatus,
  searchQuery,
  sessionGroups,
  workspaceName
}: SidebarContentProps) {
  const liveWorkspace =
    providerStatus?.openai.available || providerStatus?.anthropic.available || providerStatus?.google.available;

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className={cn(
            "flex items-center gap-3 rounded-2xl px-2 py-1.5 text-left transition hover:bg-white/[0.04]",
            collapsed && !mobile && "justify-center px-0"
          )}
          onClick={onNewChat}
          type="button"
        >
          <OrbitLogo compact />
          {!collapsed || mobile ? <span className="text-[17px] font-medium tracking-tight text-white">{workspaceName}</span> : null}
        </button>

        <Button onClick={onToggleCollapse} size="icon" type="button" variant="secondary">
          {mobile ? <ChevronLeft className="h-4 w-4" /> : collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Button className={cn("w-full justify-start", collapsed && !mobile && "justify-center px-0")} onClick={onNewChat} type="button" variant="subtle">
        <Plus className="h-4 w-4" />
        {!collapsed || mobile ? <span>New Chat</span> : null}
      </Button>

      {!collapsed || mobile ? (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
            <Input
              className="pl-10"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search Chats"
              value={searchQuery}
            />
          </label>

          <nav className="grid gap-1.5" aria-label="Workspace">
            {sidebarItems.map((item) => (
              <SidebarNavItem
                item={item}
                key={item.label}
                onDismiss={onDismiss}
                onPromptPick={onPromptPick}
                pathname={pathname}
              />
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-white/[0.02]">
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/36">Recent chats</p>
            </div>
            <ScrollArea className="h-full max-h-full">
              <div className="space-y-5 px-3 py-3">
                {sessionGroups.length ? (
                  sessionGroups.map(([group, items]) => (
                    <div className="space-y-2" key={group}>
                      <h3 className="px-2 text-[11px] uppercase tracking-[0.22em] text-white/32">{group}</h3>
                      {items.map((session) => (
                        <button
                          className={cn(
                            "flex w-full flex-col items-start gap-1 rounded-2xl px-3 py-3 text-left transition",
                            activeSessionId === session.id
                              ? "border border-white/[0.12] bg-white/[0.06]"
                              : "border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]"
                          )}
                          key={session.id}
                          onClick={() => {
                            onSelectSession(session.id);
                            onDismiss?.();
                          }}
                          type="button"
                        >
                          <span className="line-clamp-1 text-sm font-medium text-white">{session.title}</span>
                          <span className="line-clamp-1 text-sm text-white/40">{session.preview}</span>
                        </button>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-white/38">No recent chats yet.</div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.03] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-medium text-white">
                XL
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{workspaceUserName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className="tracking-[0.14em]">Plus</Badge>
                  <span className="text-xs text-white/36">{liveWorkspace ? "Live workspace" : "Workspace"}</span>
                </div>
              </div>
              <Button asChild size="icon" variant="ghost">
                <Link href="/settings" onClick={() => onDismiss?.()}>
                  <Settings2 className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-2">
            {sidebarItems.map((item) => (
              <CollapsedSidebarButton item={item} key={item.label} onPromptPick={onPromptPick} pathname={pathname} />
            ))}
          </div>
          <div className="flex-1" />
          <Button className="self-center" size="icon" type="button" variant="subtle">
            <span className="text-xs font-semibold">XL</span>
          </Button>
        </>
      )}
    </div>
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
  const isActive = item.href ? pathname === item.href : false;

  if (item.href) {
    return (
      <Link
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-3 transition",
          isActive
            ? "border border-white/[0.12] bg-white/[0.06] text-white"
            : "border border-transparent text-white/68 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white"
        )}
        href={item.href}
        onClick={() => onDismiss?.()}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium">{item.label}</div>
          <div className="truncate text-xs text-white/36">{item.detail}</div>
        </div>
      </Link>
    );
  }

  return (
    <button
      className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left text-white/68 transition hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-white"
      onClick={() => {
        if (item.prompt) {
          onPromptPick(item.prompt);
        }
        onDismiss?.();
      }}
      type="button"
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{item.label}</div>
        <div className="truncate text-xs text-white/36">{item.detail}</div>
      </div>
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
    "flex h-11 w-11 items-center justify-center rounded-2xl border transition";
  const isActive = item.href ? pathname === item.href : false;

  if (item.href) {
    return (
      <Link
        className={cn(
          sharedClassName,
          isActive
            ? "border-white/[0.12] bg-white/[0.06] text-white"
            : "border-white/[0.06] bg-transparent text-white/56 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white"
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
      className={cn(
        sharedClassName,
        "border-white/[0.06] bg-transparent text-white/56 hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white"
      )}
      onClick={() => item.prompt && onPromptPick(item.prompt)}
      title={item.label}
      type="button"
    >
      <item.icon className="h-4 w-4" />
    </button>
  );
}

type ChatComposerProps = {
  composerRef: RefObject<HTMLTextAreaElement | null>;
  isHome?: boolean;
  isStreaming: boolean;
  modelLabel: string;
  onModelChange: (model: ModelKey) => void;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  prompt: string;
  selectedModel: ModelKey;
};

function ChatComposer({
  composerRef,
  isHome = false,
  isStreaming,
  modelLabel,
  onModelChange,
  onPromptChange,
  onSend,
  onStop,
  prompt,
  selectedModel
}: ChatComposerProps) {
  return (
    <form
      className={cn(
        "mx-auto w-full rounded-[2rem] border border-white/[0.08] bg-[#111111]/96 p-3 shadow-[0_38px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl",
        isHome ? "max-w-[860px]" : "max-w-[860px]"
      )}
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <div className="flex gap-3">
        <Button className="shrink-0 self-start" size="icon" type="button" variant="secondary">
          <Paperclip className="h-4 w-4" />
          <span className="sr-only">Attach file</span>
        </Button>

        <div className="min-w-0 flex-1">
          <textarea
            className="min-h-[40px] w-full resize-none bg-transparent px-1 py-1 text-[16px] leading-7 text-white outline-none placeholder:text-white/34"
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Xeivora anything"
            ref={composerRef}
            rows={1}
            value={prompt}
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative inline-flex items-center overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.03] pl-4 pr-10 text-sm text-white/76">
                <span className="pointer-events-none py-2.5">{modelLabel}</span>
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
                <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-white/42" />
              </label>

              <Badge>{selectedModel === "orbit-auto" ? "Orchestration" : modelLabel}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button size="icon" type="button" variant="secondary">
                <Mic className="h-4 w-4" />
                <span className="sr-only">Voice input</span>
              </Button>

              {isStreaming ? (
                <Button onClick={onStop} size="icon" type="button" variant="default">
                  <AudioLines className="h-4 w-4" />
                  <span className="sr-only">Stop generating</span>
                </Button>
              ) : (
                <Button disabled={!prompt.trim()} size="icon" type="submit" variant="default">
                  <SendHorizontal className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function ThinkingBlock({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={active ? { opacity: [0.24, 1, 0.24], y: [0, -3, 0] } : { opacity: 0.35 }}
          className="h-2.5 w-2.5 rounded-full bg-white/72"
          key={index}
          transition={{ duration: 1, delay: index * 0.12, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function ErrorBanner({ className, message }: { className?: string; message: string }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-white/[0.08] bg-[#151515] px-4 py-3 text-sm leading-6 text-white/64",
        className
      )}
    >
      {message}
    </div>
  );
}

function RuntimeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] py-4 last:border-b-0">
      <span className="text-xs uppercase tracking-[0.22em] text-white/34">{label}</span>
      <span className="max-w-[170px] text-right text-sm leading-6 text-white/86">{value}</span>
    </div>
  );
}

function RuntimePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full flex-col items-center gap-1 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.03] px-2 py-3 text-center">
      <span className="text-[10px] uppercase tracking-[0.22em] text-white/34">{label}</span>
      <span className="text-xs font-medium text-white/84">{value}</span>
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
    "orbit-auto": "Xeivora Auto",
    "gpt-4o": "GPT-4o",
    claude: "Claude",
    gemini: "Gemini"
  };

  return labels[modelKey];
}

function countAvailableProviders(providerStatus: ProviderStatus | null) {
  if (!providerStatus) {
    return 0;
  }

  return [providerStatus.openai, providerStatus.anthropic, providerStatus.google].filter(
    (provider) => provider?.available
  ).length;
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

function getRuntimeTone(workflowMode: "simple_chat" | "continuity" | "coding_continuity", routeLabel: string) {
  if (workflowMode === "coding_continuity") {
    return "Engineering continuity";
  }

  if (workflowMode === "continuity") {
    return "Orchestration engaged";
  }

  return routeLabel === "Xeivora is ready" ? "Conversational mode" : routeLabel;
}

function workflowModeLabel(mode: "simple_chat" | "continuity" | "coding_continuity") {
  const labels: Record<typeof mode, string> = {
    simple_chat: "Conversation",
    continuity: "Continuity",
    coding_continuity: "Coding continuity"
  };

  return labels[mode];
}

function getCompactModelLabel(value: string) {
  return value.split(" ")[0] || value;
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
