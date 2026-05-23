const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const {
  createMemoryCards,
  getLightweightMemorySnapshot
} = require("./lightweight-memory");
const {
  getPool,
  query,
  withClient,
  withTransaction
} = require("./db");

const storeFile = path.join(process.cwd(), "data", "orbit-chat-store.json");
const DEFAULT_STORE = {
  sessions: []
};

const pool = getPool();

let schemaReadyPromise;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStoreFile() {
  if (!fs.existsSync(storeFile)) {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function loadStore() {
  ensureStoreFile();
  return JSON.parse(fs.readFileSync(storeFile, "utf8"));
}

const chatState = pool ? null : loadStore();

function persistStore() {
  if (chatState) {
    fs.writeFileSync(storeFile, JSON.stringify(chatState, null, 2));
  }
}

function sanitizePreview(content = "") {
  return content.replace(/\s+/g, " ").trim().slice(0, 92);
}

function generateTitle(content) {
  const trimmed = content.replace(/\s+/g, " ").trim();
  return trimmed.length > 42 ? `${trimmed.slice(0, 42).trimEnd()}...` : trimmed;
}

function touchSession(session) {
  session.updatedAt = new Date().toISOString();
}

async function getMemoryCards(session) {
  const workspaceMemoryCards = createMemoryCards(
    await getLightweightMemorySnapshot({
      sessionId: session.id
    })
  );
  const recentUserMessages = session.messages.filter((message) => message.role === "user").slice(-2);
  const recentAssistantMessages = session.messages
    .filter((message) => message.role === "assistant")
    .slice(-1);

  const cards = [...workspaceMemoryCards];

  recentUserMessages.forEach((message, index) => {
    cards.push({
      id: `intent-${message.id}`,
      label: index === recentUserMessages.length - 1 ? "Current objective" : "Prior objective",
      detail: sanitizePreview(message.content),
      accent: index === recentUserMessages.length - 1 ? "cyan" : "violet"
    });
  });

  recentAssistantMessages.forEach((message) => {
    cards.push({
      id: `insight-${message.id}`,
      label: "Latest insight",
      detail: sanitizePreview(message.content),
      accent: "emerald"
    });
  });

  if (!cards.length) {
    cards.push({
      id: "empty-memory",
      label: "Memory lane ready",
      detail: "Xeivora will remember the conversation, your preferences, and the current workspace context.",
      accent: "cyan"
    });
  }

  return cards;
}

function toSessionSummary(session) {
  const lastMessage = session.messages?.[session.messages.length - 1];

  return {
    id: session.id,
    title: session.title,
    preview: session.preview || sanitizePreview(lastMessage?.content || "New Xeivora conversation"),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messageCount: session.messageCount ?? session.messages?.length ?? 0,
    modelPreference: session.modelPreference,
    lastProvider: session.lastProvider,
    routeLabel: session.routeLabel
  };
}

async function toSessionDetail(session) {
  const summary = toSessionSummary(session);

  return {
    ...summary,
    messages: deepClone(session.messages || []),
    memoryCards: await getMemoryCards({
      ...session,
      messages: session.messages || []
    })
  };
}

function mapSessionRow(row, messages = []) {
  return {
    id: row.id,
    title: row.title,
    preview: row.preview,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    messageCount: Number(row.message_count || messages.length || 0),
    modelPreference: row.model_preference,
    lastProvider: row.last_provider,
    routeLabel: row.route_label,
    messages
  };
}

function mapMessageRow(row) {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    modelKey: row.model_key || undefined,
    provider: row.provider || undefined
  };
}

async function ensurePostgresSchema() {
  if (!pool) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS xeivora_chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      preview TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model_preference TEXT NOT NULL DEFAULT 'orbit-auto',
      last_provider TEXT NOT NULL DEFAULT 'simulation',
      route_label TEXT NOT NULL DEFAULT 'Awaiting model selection'
    );

    CREATE TABLE IF NOT EXISTS xeivora_chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES xeivora_chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      model_key TEXT,
      provider TEXT,
      position INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS xeivora_chat_messages_session_position_idx
      ON xeivora_chat_messages (session_id, position);

    CREATE INDEX IF NOT EXISTS xeivora_chat_sessions_updated_at_idx
      ON xeivora_chat_sessions (updated_at DESC);

    CREATE TABLE IF NOT EXISTS xeivora_memories (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES xeivora_chat_sessions(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      detail TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS xeivora_workflow_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES xeivora_chat_sessions(id) ON DELETE SET NULL,
      workflow_key TEXT NOT NULL,
      status TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await schemaReadyPromise;
}

function notFoundError() {
  const error = new Error("Chat session not found.");
  error.statusCode = 404;
  return error;
}

async function getPostgresSession(client, sessionId) {
  const sessionResult = await client.query("SELECT * FROM xeivora_chat_sessions WHERE id = $1", [sessionId]);

  if (!sessionResult.rowCount) {
    return null;
  }

  const messagesResult = await client.query(
    `SELECT *
     FROM xeivora_chat_messages
     WHERE session_id = $1
     ORDER BY position ASC, created_at ASC`,
    [sessionId]
  );

  return mapSessionRow(sessionResult.rows[0], messagesResult.rows.map(mapMessageRow));
}

function getProviderStatus() {
  return {
    openai: {
      available: Boolean(process.env.OPENAI_API_KEY),
      defaultModel: process.env.OPENAI_MODEL || "gpt-4o",
      envVar: "OPENAI_API_KEY",
      label: "OpenAI",
      note: "Enables live GPT-4o streaming responses."
    },
    anthropic: {
      available: Boolean(process.env.ANTHROPIC_API_KEY),
      defaultModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      envVar: "ANTHROPIC_API_KEY",
      label: "Anthropic",
      note: "Enables live Claude reasoning responses."
    },
    google: {
      available: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      defaultModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      envVar: "GEMINI_API_KEY",
      label: "Google",
      note: "Enables live Gemini multimodal responses."
    },
    persistence: {
      available: Boolean(pool),
      defaultModel: pool ? "postgresql" : "json",
      envVar: "DATABASE_URL",
      label: pool ? "PostgreSQL" : "Local JSON",
      note: pool
        ? "Chat history is stored in PostgreSQL."
        : "Set DATABASE_URL to store Xeivora chat history in PostgreSQL."
    }
  };
}

async function listSessions() {
  if (!pool) {
    return chatState.sessions
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .map(toSessionSummary);
  }

  await ensurePostgresSchema();
  const result = await query(`
    SELECT
      s.*,
      COUNT(m.id)::integer AS message_count
    FROM xeivora_chat_sessions s
    LEFT JOIN xeivora_chat_messages m ON m.session_id = s.id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `);

  return result.rows.map((row) => toSessionSummary(mapSessionRow(row)));
}

async function createSession({ modelPreference = "orbit-auto" } = {}) {
  const now = new Date().toISOString();
  const session = {
    id: randomUUID(),
    title: "New Xeivora chat",
    preview: "Start a new Xeivora conversation.",
    createdAt: now,
    updatedAt: now,
    modelPreference,
    lastProvider: "simulation",
    routeLabel: "Awaiting model selection",
    messages: []
  };

  if (!pool) {
    chatState.sessions.unshift(session);
    persistStore();
    return await toSessionDetail(session);
  }

  await ensurePostgresSchema();
  await query(
    `INSERT INTO xeivora_chat_sessions
      (id, title, preview, created_at, updated_at, model_preference, last_provider, route_label)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      session.id,
      session.title,
      session.preview,
      session.createdAt,
      session.updatedAt,
      session.modelPreference,
      session.lastProvider,
      session.routeLabel
    ]
  );

  return await toSessionDetail(session);
}

async function getSession(sessionId) {
  if (!pool) {
    const session = chatState.sessions.find((candidate) => candidate.id === sessionId);
    return session ? await toSessionDetail(session) : null;
  }

  await ensurePostgresSchema();
  return withClient(async (client) => {
    const session = await getPostgresSession(client, sessionId);
    return session ? await toSessionDetail(session) : null;
  });
}

async function deleteSession(sessionId) {
  if (!pool) {
    const previousLength = chatState.sessions.length;
    chatState.sessions = chatState.sessions.filter((session) => session.id !== sessionId);
    persistStore();
    return chatState.sessions.length !== previousLength;
  }

  await ensurePostgresSchema();
  const result = await query("DELETE FROM xeivora_chat_sessions WHERE id = $1", [sessionId]);
  return result.rowCount > 0;
}

function requireJsonSession(sessionId) {
  const session = chatState.sessions.find((candidate) => candidate.id === sessionId);

  if (!session) {
    throw notFoundError();
  }

  return session;
}

async function addUserMessage(sessionId, content, modelPreference) {
  const now = new Date().toISOString();
  const userMessage = {
    id: randomUUID(),
    role: "user",
    content,
    createdAt: now,
    modelKey: modelPreference
  };

  if (!pool) {
    const session = requireJsonSession(sessionId);
    session.messages.push(userMessage);
    session.modelPreference = modelPreference;

    if (session.title === "New OrbitAI thread" || session.title === "New Xeivora chat") {
      session.title = generateTitle(content) || "Xeivora conversation";
    }

    session.preview = sanitizePreview(content);
    touchSession(session);
    persistStore();

    return {
      session: await toSessionDetail(session),
      userMessage: deepClone(userMessage)
    };
  }

  return withTransaction(async (client) => {
    const session = await getPostgresSession(client, sessionId);

    if (!session) {
      throw notFoundError();
    }

    const nextTitle =
      session.title === "New OrbitAI thread" || session.title === "New Xeivora chat"
        ? generateTitle(content) || "Xeivora conversation"
        : session.title;
    const positionResult = await client.query(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM xeivora_chat_messages WHERE session_id = $1",
      [sessionId]
    );
    const nextPosition = Number(positionResult.rows[0].next_position);

    await client.query(
      `INSERT INTO xeivora_chat_messages
        (id, session_id, role, content, created_at, model_key, provider, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userMessage.id,
        sessionId,
        userMessage.role,
        userMessage.content,
        userMessage.createdAt,
        userMessage.modelKey,
        null,
        nextPosition
      ]
    );

    await client.query(
      `UPDATE xeivora_chat_sessions
       SET title = $2,
           preview = $3,
           updated_at = $4,
           model_preference = $5
       WHERE id = $1`,
      [sessionId, nextTitle, sanitizePreview(content), now, modelPreference]
    );

    return {
      session: await toSessionDetail(await getPostgresSession(client, sessionId)),
      userMessage
    };
  });
}

async function removeLastAssistantMessage(sessionId) {
  if (!pool) {
    const session = requireJsonSession(sessionId);
    const lastMessage = session.messages[session.messages.length - 1];

    if (!lastMessage || lastMessage.role !== "assistant") {
      const error = new Error("No assistant response is available to regenerate.");
      error.statusCode = 400;
      throw error;
    }

    session.messages.pop();
    touchSession(session);
    persistStore();

    return await toSessionDetail(session);
  }

  return withTransaction(async (client) => {
    const lastMessageResult = await client.query(
      `SELECT *
       FROM xeivora_chat_messages
       WHERE session_id = $1
       ORDER BY position DESC, created_at DESC
       LIMIT 1`,
      [sessionId]
    );
    const lastMessage = lastMessageResult.rows[0];

    if (!lastMessage) {
      throw notFoundError();
    }

    if (lastMessage.role !== "assistant") {
      const error = new Error("No assistant response is available to regenerate.");
      error.statusCode = 400;
      throw error;
    }

    await client.query("DELETE FROM xeivora_chat_messages WHERE id = $1", [lastMessage.id]);
    await client.query("UPDATE xeivora_chat_sessions SET updated_at = NOW() WHERE id = $1", [sessionId]);

    return await toSessionDetail(await getPostgresSession(client, sessionId));
  });
}

async function saveAssistantMessage(sessionId, assistantMessage) {
  const message = {
    ...assistantMessage,
    createdAt: assistantMessage.createdAt || new Date().toISOString()
  };

  if (!pool) {
    const session = requireJsonSession(sessionId);
    session.messages.push(message);
    session.lastProvider = message.provider || "simulation";
    session.modelPreference = message.modelKey || session.modelPreference;
    session.preview = sanitizePreview(message.content);
    touchSession(session);
    persistStore();

    return await toSessionDetail(session);
  }

  return withTransaction(async (client) => {
    const session = await getPostgresSession(client, sessionId);

    if (!session) {
      throw notFoundError();
    }

    const positionResult = await client.query(
      "SELECT COALESCE(MAX(position), -1) + 1 AS next_position FROM xeivora_chat_messages WHERE session_id = $1",
      [sessionId]
    );
    const nextPosition = Number(positionResult.rows[0].next_position);

    await client.query(
      `INSERT INTO xeivora_chat_messages
        (id, session_id, role, content, created_at, model_key, provider, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        message.id,
        sessionId,
        message.role,
        message.content,
        message.createdAt,
        message.modelKey || null,
        message.provider || null,
        nextPosition
      ]
    );

    await client.query(
      `UPDATE xeivora_chat_sessions
       SET last_provider = $2,
           model_preference = $3,
           preview = $4,
           updated_at = $5
       WHERE id = $1`,
      [
        sessionId,
        message.provider || "simulation",
        message.modelKey || session.modelPreference,
        sanitizePreview(message.content),
        message.createdAt
      ]
    );

    return await toSessionDetail(await getPostgresSession(client, sessionId));
  });
}

async function updateSessionRoute(sessionId, routeLabel, provider) {
  if (!pool) {
    const session = requireJsonSession(sessionId);
    session.routeLabel = routeLabel;
    session.lastProvider = provider;
    touchSession(session);
    persistStore();

    return await toSessionDetail(session);
  }

  return withTransaction(async (client) => {
    const session = await getPostgresSession(client, sessionId);

    if (!session) {
      throw notFoundError();
    }

    await client.query(
      `UPDATE xeivora_chat_sessions
       SET route_label = $2,
           last_provider = $3,
           updated_at = NOW()
       WHERE id = $1`,
      [sessionId, routeLabel, provider]
    );

    return await toSessionDetail(await getPostgresSession(client, sessionId));
  });
}

module.exports = {
  addUserMessage,
  createSession,
  deleteSession,
  getProviderStatus,
  getSession,
  listSessions,
  removeLastAssistantMessage,
  saveAssistantMessage,
  updateSessionRoute
};
