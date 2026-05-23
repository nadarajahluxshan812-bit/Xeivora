"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import type {
  ChatBootstrap,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ModelKey,
  OrchestrationStep,
  ProviderStatus,
  StreamContinuityPayload,
  StreamEvent
} from "@/lib/chat-types";
import { formatClock } from "@/lib/format";
import { modelOptions } from "@/lib/workspace";

const profileFirstName = "Luxshan";
const profileFullName = "Nadarajah Luxshan";

const suggestionChips = [
  {
    label: "Create an image",
    icon: "image",
    prompt: "Create an image concept for Xeivora's brand launch."
  },
  {
    label: "Write or edit",
    icon: "edit",
    prompt: "Help me write and polish a Xeivora launch announcement."
  },
  {
    label: "Look something up",
    icon: "globe",
    prompt: "Look something up for me and summarize it clearly."
  }
] as const;

const utilityLinks = [
  {
    label: "Projects",
    href: "/dashboard",
    icon: "projects"
  },
  {
    label: "Library",
    href: "/agents",
    icon: "library"
  },
  {
    label: "Apps",
    href: "/workflows",
    icon: "apps"
  },
  {
    label: "Codex",
    href: "/chat",
    icon: "codex"
  },
  {
    label: "More",
    href: "/settings",
    icon: "more"
  }
] as const;

const agentShelf = [
  {
    label: "Xeivora Strategist",
    prompt: "Act like a strategy copilot and help me plan Xeivora's next move."
  },
  {
    label: "Math Solver",
    prompt: "Solve this step by step:"
  },
  {
    label: "Explore Agents",
    prompt: "Show me the best Xeivora agents for this task."
  }
] as const;

type ContinuityState = StreamContinuityPayload;

export function ChatWorkspace() {
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
  const [activeProvider, setActiveProvider] = useState("simulation");
  const [thinking, setThinking] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const lastAssistantMessage = useMemo(
    () => messages.filter((message) => message.role === "assistant").slice(-1)[0] || null,
    [messages]
  );

  useEffect(() => {
    void bootstrapWorkspace().catch((nextError) => {
      setError(nextError instanceof Error ? nextError.message : "Unable to load Xeivora.");
    });
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 980) {
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
      setRouteLabel(session.routeLabel.replaceAll("Orbit", "Xeivora"));
      setOrchestrationSteps([]);
      setShowContinuityPanel(false);
      setWorkflowMode("simple_chat");
      setError(null);
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
          setError(typedEvent.payload.message.replaceAll("OrbitAI", "Xeivora"));
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
                    "Xeivora could not complete this stream. Check provider configuration or try Xeivora Auto again."
                }
              : message
          )
        };
      });
      setError(nextError instanceof Error ? nextError.message : "Xeivora could not respond.");
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
      setThinking(false);
    }
  }

  const selectedModelLabel = modelOptions.find((option) => option.key === selectedModel)?.label ?? "Xeivora Auto";
  const composerModelLabel = getComposerModelLabel(selectedModel);
  const systemPanelActive =
    showContinuityPanel || workflowMode !== "simple_chat" || continuityStatus.checkpointSaved || isStreaming;

  return (
    <div className="dark">
      <div className={`xei-chat-page ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
        <ChatSidebar
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
          providerStatus={providerStatus}
          searchQuery={searchQuery}
          sessions={sessions}
        />

        <main className="xei-chat-main">
          <button
            aria-label={sidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            className="xei-chat-mobile-menu"
            onClick={() => setSidebarCollapsed((value) => !value)}
            type="button"
          >
            <ShellIcon kind="panel" />
          </button>

          <button
            aria-label={statusOpen ? "Close workspace status" : "Open workspace status"}
            className={`xei-chat-status-orb ${systemPanelActive ? "is-live" : ""}`}
            onClick={() => setStatusOpen((value) => !value)}
            type="button"
          >
            <span />
          </button>

          {statusOpen ? (
            <aside className="xei-chat-status-panel">
              <div className="xei-chat-status-panel-header">
                <div>
                  <p>Xeivora runtime</p>
                  <strong>{routeLabel}</strong>
                </div>
                <span>
                  {workflowMode === "simple_chat"
                    ? `${formatProviderLabel(activeProvider)} live`
                    : "Continuity active"}
                </span>
              </div>

              <div className="xei-chat-status-grid">
                <div>
                  <p>Current model</p>
                  <strong>
                    {continuityStatus.currentModel
                      ? `${formatProviderLabel(continuityStatus.currentProvider)} · ${continuityStatus.currentModel}`
                      : selectedModelLabel}
                  </strong>
                </div>
                <div>
                  <p>Next fallback</p>
                  <strong>
                    {continuityStatus.fallbackModel
                      ? `${formatProviderLabel(continuityStatus.fallbackProvider)} · ${continuityStatus.fallbackModel}`
                      : formatProviderLabel(continuityStatus.fallbackProvider)}
                  </strong>
                </div>
                <div>
                  <p>Memory</p>
                  <strong>{continuityStatus.memoryPreserved ? "Active" : "Syncing"}</strong>
                </div>
                <div>
                  <p>Checkpoint</p>
                  <strong>{continuityStatus.checkpointSaved ? "Saved" : "Ready"}</strong>
                </div>
                <div>
                  <p>Context</p>
                  <strong>{continuityStatus.contextCompressed ? "Compressed + preserved" : "Preserved"}</strong>
                </div>
                <div>
                  <p>Route chain</p>
                  <strong>{continuityStatus.providerChain.map(formatProviderLabel).join(" -> ")}</strong>
                </div>
              </div>

              {orchestrationSteps.length ? (
                <div className="xei-chat-status-steps">
                  <p>Live workflow</p>
                  <ul>
                    {orchestrationSteps.map((step) => (
                      <li key={step.id}>
                        <strong>{step.label}</strong>
                        <span>{step.state}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </aside>
          ) : null}

          {hasMessages ? (
            <>
              <div className="xei-chat-thread-scroll" ref={messagesRef}>
                <div className="xei-chat-thread">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const isAssistant = message.role === "assistant";
                      const isLatestAssistant = lastAssistantMessage?.id === message.id;

                      return (
                        <motion.article
                          animate={{ opacity: 1, y: 0 }}
                          className={`xei-chat-thread-row ${isAssistant ? "is-assistant" : "is-user"}`}
                          initial={{ opacity: 0, y: 16 }}
                          key={message.id}
                        >
                          <div className="xei-chat-thread-meta">
                            <span>{isAssistant ? "Xeivora" : "You"}</span>
                            <time>{formatClock(message.createdAt)}</time>
                          </div>

                          <div className={`xei-chat-thread-card ${isAssistant ? "is-assistant" : "is-user"}`}>
                            {isAssistant ? (
                              message.content ? (
                                <ChatMarkdown content={toXeivoraLabel(message.content)} />
                              ) : (
                                <ThinkingBlock active={thinking || isStreaming} />
                              )
                            ) : (
                              <div className="xei-chat-thread-user-copy">{message.content}</div>
                            )}
                          </div>

                          <div className="xei-chat-thread-actions">
                            {isAssistant && message.content ? (
                              <>
                                <button
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(message.content);
                                    setCopiedResponseId(message.id);
                                    setTimeout(() => setCopiedResponseId(null), 1200);
                                  }}
                                  type="button"
                                >
                                  {copiedResponseId === message.id ? "Copied" : "Copy"}
                                </button>
                                {isLatestAssistant ? (
                                  <button onClick={() => void handleSend(true)} type="button">
                                    Regenerate
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                            {!isAssistant ? (
                              <button onClick={() => setPrompt(message.content)} type="button">
                                Edit prompt
                              </button>
                            ) : null}
                          </div>
                        </motion.article>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              <div className="xei-chat-bottom-bar">
                {error ? <div className="xei-chat-error">{error}</div> : null}
                <ChatComposerShell
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
            <div className="xei-chat-home-shell">
              <section className="xei-chat-home">
                <h1>Good to see you, {profileFirstName}.</h1>
                {error ? <div className="xei-chat-error is-home">{error}</div> : null}
                <ChatComposerShell
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
                <div className="xei-chat-chip-row">
                  {suggestionChips.map((chip) => (
                    <button
                      className="xei-chat-chip"
                      key={chip.label}
                      onClick={() => {
                        setPrompt(chip.prompt);
                        composerRef.current?.focus();
                      }}
                      type="button"
                    >
                      <ShellIcon kind={chip.icon} />
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

type ChatSidebarProps = {
  activeSessionId: string | null;
  collapsed: boolean;
  onNewChat: () => void;
  onPromptPick: (value: string) => void;
  onSearchChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
  onToggleCollapse: () => void;
  providerStatus: ProviderStatus | null;
  searchQuery: string;
  sessions: ChatSessionSummary[];
};

function ChatSidebar({
  activeSessionId,
  collapsed,
  onNewChat,
  onPromptPick,
  onSearchChange,
  onSelectSession,
  onToggleCollapse,
  providerStatus,
  searchQuery,
  sessions
}: ChatSidebarProps) {
  const filteredSessions = sessions.filter((session) =>
    `${session.title} ${session.preview}`.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const sessionGroups = groupSessions(filteredSessions);
  const liveWorkspace =
    providerStatus?.openai.available || providerStatus?.anthropic.available || providerStatus?.google.available;

  return (
    <aside className={`xei-chat-sidebar ${collapsed ? "is-collapsed" : ""}`} aria-label="Xeivora chat sidebar">
      <div className="xei-chat-sidebar-top">
        <button className="xei-chat-brand" onClick={onNewChat} type="button">
          <span className="xei-chat-brand-mark">X</span>
          {!collapsed ? <span>Xeivora</span> : null}
        </button>

        <button
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="xei-chat-sidebar-toggle"
          onClick={onToggleCollapse}
          type="button"
        >
          <ShellIcon kind={collapsed ? "panel" : "collapse"} />
        </button>
      </div>

      <button className="xei-chat-sidebar-new" onClick={onNewChat} type="button">
        <ShellIcon kind="compose" />
        {!collapsed ? <span>New chat</span> : null}
      </button>

      {collapsed ? (
        <>
          <nav className="xei-chat-sidebar-mini-nav" aria-label="Quick navigation">
            {utilityLinks.map((item) => (
              <Link className="xei-chat-sidebar-mini-link" href={item.href} key={item.label}>
                <ShellIcon kind={item.icon} />
              </Link>
            ))}
          </nav>

          <div className="xei-chat-sidebar-spacer" />

          <button className="xei-chat-account is-collapsed" type="button">
            <span className="xei-chat-account-avatar">EC</span>
          </button>
        </>
      ) : (
        <>
          <label className="xei-chat-sidebar-search">
            <ShellIcon kind="search" />
            <input
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search chats"
              value={searchQuery}
            />
          </label>

          <nav className="xei-chat-sidebar-nav" aria-label="Chat utilities">
            {utilityLinks.map((item) => (
              <Link className="xei-chat-sidebar-link" href={item.href} key={item.label}>
                <ShellIcon kind={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <section className="xei-chat-sidebar-section">
            <p>GPTs</p>
            <div className="xei-chat-sidebar-list">
              {agentShelf.map((item) => (
                <button
                  className="xei-chat-sidebar-list-item"
                  key={item.label}
                  onClick={() => onPromptPick(item.prompt)}
                  type="button"
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="xei-chat-sidebar-section is-recents">
            <p>Recents</p>
            {sessionGroups.length ? (
              sessionGroups.map(([group, items]) => (
                <div className="xei-chat-sidebar-group" key={group}>
                  <h3>{group}</h3>
                  {items.map((session) => (
                    <button
                      className={`xei-chat-sidebar-history ${activeSessionId === session.id ? "is-active" : ""}`}
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      type="button"
                    >
                      <span>{session.title}</span>
                      <ShellIcon kind="pin" />
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="xei-chat-sidebar-empty">No recent chats yet.</div>
            )}
          </section>

          <button className="xei-chat-account" type="button">
            <span className="xei-chat-account-avatar">EC</span>
            <span className="xei-chat-account-copy">
              <strong>{profileFullName}</strong>
              <small>{liveWorkspace ? "Plus · Live" : "Plus"}</small>
            </span>
            <ShellIcon kind="apps" />
          </button>
        </>
      )}
    </aside>
  );
}

type ChatComposerShellProps = {
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

function ChatComposerShell({
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
}: ChatComposerShellProps) {
  return (
    <form
      className={`xei-chat-composer ${isHome ? "is-home" : "is-thread"}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSend();
      }}
    >
      <button aria-label="Attach file" className="xei-chat-composer-plus" type="button">
        <ShellIcon kind="plus" />
      </button>

      <textarea
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

      <div className="xei-chat-composer-controls">
        <label className="xei-chat-model-switch">
          <span>{modelLabel}</span>
          <select onChange={(event) => onModelChange(event.target.value as ModelKey)} value={selectedModel}>
            {modelOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {getComposerModelLabel(option.key)}
              </option>
            ))}
          </select>
          <ShellIcon kind="chevron" />
        </label>

        <button aria-label="Voice input" className="xei-chat-mic-button" type="button">
          <ShellIcon kind="mic" />
        </button>

        {isStreaming ? (
          <button aria-label="Stop generating" className="xei-chat-send-button is-stop" onClick={onStop} type="button">
            <span className="xei-chat-stop-square" />
          </button>
        ) : (
          <button
            aria-label="Send message"
            className="xei-chat-send-button"
            disabled={!prompt.trim()}
            type="submit"
          >
            <ShellIcon kind="wave" />
          </button>
        )}
      </div>
    </form>
  );
}

function ThinkingBlock({ active }: { active: boolean }) {
  return (
    <div className="xei-chat-thinking">
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={active ? { opacity: [0.28, 1, 0.28] } : { opacity: 0.4 }}
          key={index}
          transition={{ duration: 1, delay: index * 0.14, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

function ShellIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "compose":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M4.5 19.5H8l9.25-9.25-3.5-3.5L4.5 16v3.5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="m12.75 7.25 3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "search":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "projects":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path
            d="M3.5 7.25h5l1.35 1.6H20.5v8.6a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V7.25Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="M12 12v4m-2-2h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "library":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M4.75 5.25h4v13.5h-4zm5.25 0h4v13.5h-4zm5.25 0h4v13.5h-4z" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "apps":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <rect x="4.5" y="4.5" width="5.5" height="5.5" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="4.5" width="5.5" height="5.5" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
          <rect x="4.5" y="14" width="5.5" height="5.5" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
          <rect x="14" y="14" width="5.5" height="5.5" rx="1.3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "codex":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3.75 6 6.9v6.2c0 3.7 2.5 6.8 6 7.9 3.5-1.1 6-4.2 6-7.9V6.9l-6-3.15Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
          <path d="m9.8 11.2-1.8 1.8 1.8 1.8m4.4-3.6 1.8 1.8-1.8 1.8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "more":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <circle cx="6" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="18" cy="12" r="1.5" fill="currentColor" />
        </svg>
      );
    case "image":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="9" r="1.6" stroke="currentColor" strokeWidth="1.6" />
          <path d="m7 17 3.6-3.8 2.8 2.7 2.6-3.1L19 17" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "edit":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M4.5 19.5H8l9.15-9.15-3.5-3.5L4.5 16v3.5Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="m12.65 7.35 3.5 3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "globe":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4.5 12h15M12 4.5c2.3 2.4 3.5 5 3.5 7.5S14.3 17.1 12 19.5M12 4.5c-2.3 2.4-3.5 5-3.5 7.5S9.7 17.1 12 19.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
      );
    case "panel":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <rect x="4.5" y="5" width="15" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M10 5v14" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "collapse":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M10 6 4 12l6 6M20 4v16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "pin":
      return (
        <svg className="xei-chat-icon is-pin" fill="none" viewBox="0 0 24 24">
          <path
            d="m8.5 6.5 7 7m-8 1 7-7m-3.5 7v4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      );
    case "plus":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "mic":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <rect x="9" y="4.5" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v2.5m-3.5 0h7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
      );
    case "wave":
      return (
        <svg className="xei-chat-icon" fill="none" viewBox="0 0 24 24">
          <path d="M7 9.5v5m3-8v11m4-13v15m3-10v5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.1" />
        </svg>
      );
    case "chevron":
      return (
        <svg className="xei-chat-icon is-chevron" fill="none" viewBox="0 0 24 24">
          <path d="m7 10 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
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

function formatProviderLabel(provider: string | null) {
  if (!provider) {
    return "Standby";
  }

  const labels: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Claude",
    google: "Gemini",
    gemini: "Gemini",
    ollama: "Ollama",
    simulation: "Local"
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

function toXeivoraLabel(value: string) {
  return value
    .replaceAll("OrbitAI Copilot", "Xeivora")
    .replaceAll("OrbitAI", "Xeivora")
    .replaceAll("Orbit Auto", "Xeivora Auto")
    .replaceAll("Orbit", "Xeivora");
}
