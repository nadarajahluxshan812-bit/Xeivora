const fs = require("node:fs");
const path = require("node:path");

const {
  isDatabaseConfigured,
  query,
  withClient,
  withTransaction
} = require("./db");

const DEFAULT_WORKSPACE_ID = "primary-workspace";
const memoryFile = path.join(process.cwd(), "data", "xeivora-lightweight-memory.json");

const DEFAULT_STORE = {
  workspaces: {
    [DEFAULT_WORKSPACE_ID]: {
      userName: null,
      preferences: {
        responseStyle: null,
        markdown: null
      },
      workspaceInfo: {
        currentFocus: null
      },
      sessions: {}
    }
  }
};

let schemaReadyPromise;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureMemoryFile() {
  if (!fs.existsSync(memoryFile)) {
    fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
    fs.writeFileSync(memoryFile, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function loadMemoryStore() {
  ensureMemoryFile();

  try {
    return JSON.parse(fs.readFileSync(memoryFile, "utf8"));
  } catch {
    return deepClone(DEFAULT_STORE);
  }
}

let memoryState = loadMemoryStore();

function persistMemoryStore() {
  fs.writeFileSync(memoryFile, JSON.stringify(memoryState, null, 2));
}

function sanitizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function toDisplayName(value = "") {
  return sanitizeText(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function createDefaultWorkspace() {
  return deepClone(DEFAULT_STORE.workspaces[DEFAULT_WORKSPACE_ID]);
}

function getWorkspaceFromJson(workspaceId = DEFAULT_WORKSPACE_ID) {
  memoryState.workspaces ||= {};
  memoryState.workspaces[workspaceId] ||= createDefaultWorkspace();
  return memoryState.workspaces[workspaceId];
}

function getSessionBucketFromJson(workspace, sessionId) {
  if (!sessionId) {
    return null;
  }

  workspace.sessions ||= {};
  workspace.sessions[sessionId] ||= {
    lastTopic: null,
    updatedAt: null
  };

  return workspace.sessions[sessionId];
}

function extractUserName(prompt) {
  const patterns = [
    /\bmy name is\s+([a-z][a-z '-]{0,40})$/i,
    /\bcall me\s+([a-z][a-z '-]{0,40})$/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);

    if (match?.[1]) {
      return toDisplayName(match[1]);
    }
  }

  return null;
}

function extractPreference(prompt) {
  const lower = prompt.toLowerCase();

  if (/\b(?:keep|be|prefer|make).*(?:concise|brief|short)\b/.test(lower)) {
    return {
      key: "responseStyle",
      value: "concise",
      label: "Concise answers"
    };
  }

  if (/\b(?:keep|be|prefer|make).*(?:detailed|deep|thorough)\b/.test(lower)) {
    return {
      key: "responseStyle",
      value: "detailed",
      label: "Detailed answers"
    };
  }

  if (/\b(?:use|prefer|keep).*\bmarkdown\b/.test(lower)) {
    return {
      key: "markdown",
      value: "enabled",
      label: "Markdown formatting"
    };
  }

  if (/\b(?:no|avoid|skip).*\bmarkdown\b/.test(lower)) {
    return {
      key: "markdown",
      value: "disabled",
      label: "Plain text formatting"
    };
  }

  return null;
}

function extractWorkspaceFocus(prompt) {
  const patterns = [
    /\b(?:we are|we're|i am|i'm) working on\s+(.{3,120})$/i,
    /\b(?:we are|we're|i am|i'm) building\s+(.{3,120})$/i,
    /\bthis workspace is for\s+(.{3,120})$/i,
    /\bour project is\s+(.{3,120})$/i,
    /\bour startup is\s+(.{3,120})$/i
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);

    if (match?.[1]) {
      return sanitizeText(match[1].replace(/[.?!]+$/, ""));
    }
  }

  return null;
}

async function ensureMemorySchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS xeivora_workspace_memory (
      workspace_id TEXT PRIMARY KEY,
      user_name TEXT,
      preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
      workspace_info JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS xeivora_workspace_session_memory (
      workspace_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      last_topic TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (workspace_id, session_id)
    );
  `);

  await schemaReadyPromise;
}

async function loadWorkspaceFromDb(client, workspaceId = DEFAULT_WORKSPACE_ID) {
  const workspaceResult = await client.query(
    `SELECT user_name, preferences, workspace_info
     FROM xeivora_workspace_memory
     WHERE workspace_id = $1`,
    [workspaceId]
  );

  if (!workspaceResult.rowCount) {
    return createDefaultWorkspace();
  }

  const row = workspaceResult.rows[0];
  const sessionsResult = await client.query(
    `SELECT session_id, last_topic, updated_at
     FROM xeivora_workspace_session_memory
     WHERE workspace_id = $1`,
    [workspaceId]
  );

  const sessions = {};
  for (const sessionRow of sessionsResult.rows) {
    sessions[sessionRow.session_id] = {
      lastTopic: sessionRow.last_topic || null,
      updatedAt:
        sessionRow.updated_at instanceof Date ? sessionRow.updated_at.toISOString() : sessionRow.updated_at || null
    };
  }

  return {
    userName: row.user_name || null,
    preferences: {
      responseStyle: row.preferences?.responseStyle || null,
      markdown: row.preferences?.markdown || null
    },
    workspaceInfo: {
      currentFocus: row.workspace_info?.currentFocus || null
    },
    sessions
  };
}

async function persistWorkspaceToDb(client, workspaceId, workspace) {
  await client.query(
    `INSERT INTO xeivora_workspace_memory (workspace_id, user_name, preferences, workspace_info, updated_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (workspace_id)
     DO UPDATE SET
       user_name = EXCLUDED.user_name,
       preferences = EXCLUDED.preferences,
       workspace_info = EXCLUDED.workspace_info,
       updated_at = NOW()`,
    [
      workspaceId,
      workspace.userName,
      JSON.stringify(workspace.preferences || {}),
      JSON.stringify(workspace.workspaceInfo || {})
    ]
  );

  const sessionIds = Object.keys(workspace.sessions || {});
  for (const sessionId of sessionIds) {
    const session = workspace.sessions[sessionId];
    await client.query(
      `INSERT INTO xeivora_workspace_session_memory (workspace_id, session_id, last_topic, updated_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (workspace_id, session_id)
       DO UPDATE SET
         last_topic = EXCLUDED.last_topic,
         updated_at = EXCLUDED.updated_at`,
      [workspaceId, sessionId, session.lastTopic || null, session.updatedAt || new Date().toISOString()]
    );
  }
}

async function rememberFromUserMessage({ sessionId, workspaceId = DEFAULT_WORKSPACE_ID, prompt }) {
  const trimmedPrompt = sanitizeText(prompt);

  if (!trimmedPrompt) {
    return {
      updated: false,
      userName: null,
      preferences: [],
      workspaceFocus: null
    };
  }

  const result = {
    updated: false,
    userName: null,
    preferences: [],
    workspaceFocus: null
  };

  if (!isDatabaseConfigured()) {
    const workspace = getWorkspaceFromJson(workspaceId);
    const sessionBucket = getSessionBucketFromJson(workspace, sessionId);
    const userName = extractUserName(trimmedPrompt);

    if (userName) {
      workspace.userName = userName;
      result.userName = userName;
      result.updated = true;
    }

    const preference = extractPreference(trimmedPrompt);
    if (preference) {
      workspace.preferences ||= {};
      workspace.preferences[preference.key] = preference.value;
      result.preferences.push(preference);
      result.updated = true;
    }

    const workspaceFocus = extractWorkspaceFocus(trimmedPrompt);
    if (workspaceFocus) {
      workspace.workspaceInfo ||= {};
      workspace.workspaceInfo.currentFocus = workspaceFocus;
      result.workspaceFocus = workspaceFocus;
      result.updated = true;
    }

    if (sessionBucket) {
      sessionBucket.lastTopic = trimmedPrompt.slice(0, 160);
      sessionBucket.updatedAt = new Date().toISOString();
      result.updated = true;
    }

    if (result.updated) {
      persistMemoryStore();
    }

    return result;
  }

  await ensureMemorySchema();

  return withTransaction(async (client) => {
    const workspace = await loadWorkspaceFromDb(client, workspaceId);
    workspace.sessions ||= {};

    const sessionBucket = sessionId
      ? workspace.sessions[sessionId] || {
          lastTopic: null,
          updatedAt: null
        }
      : null;
    const userName = extractUserName(trimmedPrompt);

    if (userName) {
      workspace.userName = userName;
      result.userName = userName;
      result.updated = true;
    }

    const preference = extractPreference(trimmedPrompt);
    if (preference) {
      workspace.preferences ||= {};
      workspace.preferences[preference.key] = preference.value;
      result.preferences.push(preference);
      result.updated = true;
    }

    const workspaceFocus = extractWorkspaceFocus(trimmedPrompt);
    if (workspaceFocus) {
      workspace.workspaceInfo ||= {};
      workspace.workspaceInfo.currentFocus = workspaceFocus;
      result.workspaceFocus = workspaceFocus;
      result.updated = true;
    }

    if (sessionBucket && sessionId) {
      sessionBucket.lastTopic = trimmedPrompt.slice(0, 160);
      sessionBucket.updatedAt = new Date().toISOString();
      workspace.sessions[sessionId] = sessionBucket;
      result.updated = true;
    }

    if (result.updated) {
      await persistWorkspaceToDb(client, workspaceId, workspace);
    }

    return result;
  });
}

async function getLightweightMemorySnapshot({ sessionId, workspaceId = DEFAULT_WORKSPACE_ID } = {}) {
  let workspace;

  if (!isDatabaseConfigured()) {
    workspace = getWorkspaceFromJson(workspaceId);
  } else {
    await ensureMemorySchema();
    workspace = await withClient((client) => loadWorkspaceFromDb(client, workspaceId));
  }

  const sessionBucket = sessionId ? workspace.sessions?.[sessionId] : null;
  const preferences = [];

  if (workspace.preferences?.responseStyle === "concise") {
    preferences.push({
      key: "responseStyle",
      label: "Response style",
      value: "concise"
    });
  }

  if (workspace.preferences?.responseStyle === "detailed") {
    preferences.push({
      key: "responseStyle",
      label: "Response style",
      value: "detailed"
    });
  }

  if (workspace.preferences?.markdown === "enabled") {
    preferences.push({
      key: "markdown",
      label: "Formatting",
      value: "markdown"
    });
  }

  if (workspace.preferences?.markdown === "disabled") {
    preferences.push({
      key: "markdown",
      label: "Formatting",
      value: "plain text"
    });
  }

  return {
    workspaceId,
    userName: workspace.userName || null,
    preferences,
    workspaceInfo: {
      currentFocus: workspace.workspaceInfo?.currentFocus || null
    },
    session: sessionBucket
      ? {
          lastTopic: sessionBucket.lastTopic || null,
          updatedAt: sessionBucket.updatedAt || null
        }
      : {
          lastTopic: null,
          updatedAt: null
        }
  };
}

function buildMemoryContext(memorySnapshot) {
  const parts = [];

  if (memorySnapshot?.userName) {
    parts.push(`The user's name is ${memorySnapshot.userName}.`);
  }

  const stylePreference = memorySnapshot?.preferences?.find((item) => item.key === "responseStyle");
  if (stylePreference?.value === "concise") {
    parts.push("They prefer concise answers.");
  }

  if (stylePreference?.value === "detailed") {
    parts.push("They prefer detailed answers when needed.");
  }

  const markdownPreference = memorySnapshot?.preferences?.find((item) => item.key === "markdown");
  if (markdownPreference?.value === "markdown") {
    parts.push("They like markdown formatting.");
  }

  if (markdownPreference?.value === "plain text") {
    parts.push("They prefer plain text over markdown unless structure really helps.");
  }

  if (memorySnapshot?.workspaceInfo?.currentFocus) {
    parts.push(`Current workspace focus: ${memorySnapshot.workspaceInfo.currentFocus}.`);
  }

  return parts.join(" ");
}

function createMemoryCards(snapshot) {
  const cards = [];

  if (snapshot?.userName) {
    cards.push({
      id: "memory-user-name",
      label: "Workspace memory",
      detail: `Knows you as ${snapshot.userName}.`,
      accent: "cyan"
    });
  }

  const stylePreference = snapshot?.preferences?.find((item) => item.key === "responseStyle");
  if (stylePreference?.value === "concise") {
    cards.push({
      id: "memory-style-concise",
      label: "Response preference",
      detail: "Prefers concise answers.",
      accent: "violet"
    });
  }

  if (stylePreference?.value === "detailed") {
    cards.push({
      id: "memory-style-detailed",
      label: "Response preference",
      detail: "Prefers more detailed answers.",
      accent: "violet"
    });
  }

  if (snapshot?.workspaceInfo?.currentFocus) {
    cards.push({
      id: "memory-workspace-focus",
      label: "Current workspace",
      detail: snapshot.workspaceInfo.currentFocus,
      accent: "emerald"
    });
  }

  return cards;
}

module.exports = {
  DEFAULT_WORKSPACE_ID,
  buildMemoryContext,
  createMemoryCards,
  getLightweightMemorySnapshot,
  rememberFromUserMessage
};
