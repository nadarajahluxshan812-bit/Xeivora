"use client";

import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { OrbitLogo } from "@/components/orbit-logo";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type {
  ChatBootstrap,
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
  ModelKey,
  OrchestrationStep,
  ProviderStatus,
  StreamEvent
} from "@/lib/chat-types";
import { formatClock } from "@/lib/format";
import { modelOptions } from "@/lib/workspace";

const quickPrompts = [
  "What is Xeivora?",
  "Write a short launch checklist",
  "Build me a Next.js SaaS authentication system",
  "Explain provider continuity simply"
];

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
  const [darkMode, setDarkMode] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showContinuityPanel, setShowContinuityPanel] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<"simple_chat" | "continuity" | "coding_continuity">("simple_chat");
  const [continuityStatus, setContinuityStatus] = useState({
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

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="xei-app">
        <WorkspaceSidebar
          activeSessionId={activeSession?.id ?? null}
          collapsed={sidebarCollapsed}
          onNewChat={() => void handleNewChat()}
          onSearchChange={setSearchQuery}
          onSelectSession={(sessionId) => void loadSession(sessionId)}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          providerStatus={providerStatus}
          searchQuery={searchQuery}
          sessions={sessions}
          statusLabel="Local"
        />

        <main className="xei-main">
          <header className="xei-topbar">
            <OrbitLogo />
            <div className="xei-topbar-actions">
              <select
                aria-label="Select model"
                className="xei-model-select"
                onChange={(event) => setSelectedModel(event.target.value as ModelKey)}
                value={selectedModel}
              >
                {modelOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button className="xei-secondary-button" onClick={() => setDarkMode((value) => !value)} type="button">
                {darkMode ? "Light" : "Dark"}
              </button>
            </div>
          </header>

          <div className="xei-chat-scroll" ref={messagesRef}>
            {!hasMessages ? (
              <section className="xei-welcome">
            <div className="xei-wordmark">Xeivora</div>
                <h1>How can I help?</h1>
                <p>
                  Ask normally. If the work becomes complex, Xeivora quietly preserves context and
                  continues across providers without making you restart.
                </p>
                <div className="xei-prompt-grid">
                  {quickPrompts.map((item) => (
                    <button key={item} onClick={() => setPrompt(item)} type="button">
                      {item}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <div className="xei-message-list">
                <AnimatePresence initial={false}>
                  {messages.map((message) => {
                    const isAssistant = message.role === "assistant";
                    const isLatestAssistant = lastAssistantMessage?.id === message.id;

                    return (
                      <motion.article
                        animate={{ opacity: 1, y: 0 }}
                        className={`xei-message ${isAssistant ? "is-assistant" : "is-user"}`}
                        initial={{ opacity: 0, y: 10 }}
                        key={message.id}
                      >
                        <div className="xei-avatar">{isAssistant ? "X" : "You"}</div>
                        <div className="xei-message-body">
                          <div className="xei-message-meta">
                            <span>{isAssistant ? "Xeivora" : "You"}</span>
                            <time>{formatClock(message.createdAt)}</time>
                          </div>

                          {isAssistant ? (
                            message.content ? (
                              <ChatMarkdown content={toXeivoraLabel(message.content)} />
                            ) : (
                              <ThinkingBlock active={thinking || isStreaming} />
                            )
                          ) : (
                            <div className="xei-user-bubble">{message.content}</div>
                          )}

                          <div className="xei-message-actions">
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
                        </div>
                      </motion.article>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {showContinuityPanel ? (
          <aside className="xei-trace-dock is-open">
            <button className="xei-trace-toggle" type="button">
              <span>Continuity Engine</span>
              <strong>{workflowMode === "coding_continuity" ? "Coding workflow" : "Active"}</strong>
            </button>
              <div className="xei-trace-panel">
                <div>
                  <p>Current model</p>
                  <strong>
                    {continuityStatus.currentModel
                      ? `${formatProviderLabel(continuityStatus.currentProvider)} · ${continuityStatus.currentModel}`
                      : formatProviderLabel(continuityStatus.currentProvider)}
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
          </aside>
          ) : null}

          <div className="xei-composer-shell">
            {showContinuityPanel ? (
            <div className="xei-orchestration">
              <button onClick={() => setStatusOpen((value) => !value)} type="button">
                <span>Continuity Mode</span>
                <strong>{selectedModelLabel}</strong>
              </button>
              {statusOpen ? (
                <div className="xei-orchestration-panel">
                  <span>Selected model: {selectedModelLabel}</span>
                  <span>Routed tools/models: {formatProviderLabel(activeProvider)}</span>
                  <span>Memory active</span>
                  <span>Context preserved</span>
                  <span>Workflow continuity enabled</span>
                  <span>{routeLabel}</span>
                </div>
              ) : null}
            </div>
            ) : null}

            {error ? <div className="xei-error">{error}</div> : null}

            <form
              className="xei-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSend(false);
              }}
            >
              <div className="xei-composer-tools">
                <button aria-label="Attach file" type="button">+</button>
                <button aria-label="Voice input" type="button">Mic</button>
              </div>
              <textarea
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend(false);
                  }
                }}
                placeholder="Message Xeivora"
                ref={composerRef}
                rows={1}
                value={prompt}
              />
              {isStreaming ? (
                <button className="xei-send-button" onClick={stopGenerating} type="button">
                  Stop
                </button>
              ) : (
                <button className="xei-send-button" disabled={!prompt.trim()} type="submit">
                  Send
                </button>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

function ThinkingBlock({ active }: { active: boolean }) {
  return (
    <div className="xei-thinking">
      {[0, 1, 2].map((index) => (
        <motion.span
          animate={active ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.45 }}
          key={index}
          transition={{ duration: 1, delay: index * 0.16, repeat: Infinity }}
        />
      ))}
    </div>
  );
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
