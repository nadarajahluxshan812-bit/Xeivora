const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const { isDatabaseConfigured, query, withTransaction } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-workspace-store.json");
const uploadsDir = path.join(process.cwd(), "data", "uploads");

const DEFAULT_PROJECT_ID = "project-xeivora-core";
const DEFAULT_STORE = {
  projects: [
    {
      id: DEFAULT_PROJECT_ID,
      name: "Xeivora Core",
      description: "Primary workspace for building and operating Xeivora.",
      color: "#8b5cf6",
      status: "active",
      createdAt: "2026-05-20T08:00:00.000Z",
      updatedAt: "2026-05-20T08:00:00.000Z"
    }
  ],
  files: [],
  toolLogs: []
};

let schemaReadyPromise;

function now() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStoreFile() {
  if (!fs.existsSync(storeFile)) {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function loadStore() {
  ensureStoreFile();
  let parsed = DEFAULT_STORE;
  try {
    const raw = fs.readFileSync(storeFile, "utf8").trim();
    parsed = raw ? JSON.parse(raw) : DEFAULT_STORE;
  } catch {
    parsed = deepClone(DEFAULT_STORE);
    saveStore(parsed);
  }
  const normalized = {
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    files: Array.isArray(parsed.files) ? parsed.files : [],
    toolLogs: Array.isArray(parsed.toolLogs) ? parsed.toolLogs : []
  };

  if (!normalized.projects.length) {
    normalized.projects = deepClone(DEFAULT_STORE.projects);
  }

  return normalized;
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

const jsonStore = isDatabaseConfigured() ? null : loadStore();

function sanitizeText(value = "") {
  return `${value}`.replace(/\s+/g, " ").trim();
}

function sanitizeFileName(value = "file") {
  return sanitizeText(value)
    .replace(/[^\p{L}\p{N}.\-_\s]/gu, "")
    .replace(/\s+/g, "-")
    .toLowerCase() || "file";
}

function detectFileKind(name = "", mimeType = "") {
  const lowerName = name.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf";
  if (
    lowerMime.includes("wordprocessingml") ||
    lowerMime.includes("msword") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) return "docx";
  if (lowerMime.includes("csv") || lowerName.endsWith(".csv")) return "csv";
  if (lowerMime.includes("sheet") || lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) return "xlsx";
  if (lowerMime.includes("json") || lowerName.endsWith(".json")) return "json";
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.includes("markdown") || lowerName.endsWith(".md") || lowerName.endsWith(".mdx")) return "markdown";
  if (lowerMime.startsWith("text/") || lowerName.endsWith(".txt")) return "txt";
  return "unknown";
}

function buildProjectCounts(project, sessions = [], files = [], memories = []) {
  const projectId = project.id;
  return {
    chatCount: sessions.filter((session) => session.projectId === projectId).length,
    fileCount: files.filter((file) => file.projectId === projectId).length,
    memoryCount: memories.filter((item) => item.projectId === projectId).length
  };
}

async function ensureWorkspaceSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS xeivora_projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        color TEXT NOT NULL DEFAULT '#8b5cf6',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Ownership column added additively. Pre-existing rows keep a NULL owner
      -- and remain shared/legacy; new projects are stamped with their creator.
      ALTER TABLE xeivora_projects
        ADD COLUMN IF NOT EXISTS owner_id TEXT;

      CREATE TABLE IF NOT EXISTS xeivora_uploaded_files (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        project_id TEXT REFERENCES xeivora_projects(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        kind TEXT NOT NULL,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        storage_path TEXT NOT NULL,
        preview_text TEXT,
        summary TEXT,
        extracted_text TEXT,
        analysis_status TEXT NOT NULL DEFAULT 'queued',
        owner_id TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Ownership added additively. Pre-existing files keep a NULL owner and
      -- stay shared/legacy; new uploads are stamped with their uploader so
      -- search can scope file results per viewer.
      ALTER TABLE xeivora_uploaded_files
        ADD COLUMN IF NOT EXISTS owner_id TEXT;

      CREATE INDEX IF NOT EXISTS xeivora_uploaded_files_session_created_idx
        ON xeivora_uploaded_files (session_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS xeivora_uploaded_files_project_created_idx
        ON xeivora_uploaded_files (project_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS xeivora_tool_logs (
        id TEXT PRIMARY KEY,
        tool TEXT NOT NULL,
        session_id TEXT,
        project_id TEXT REFERENCES xeivora_projects(id) ON DELETE SET NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE xeivora_chat_sessions
        ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE xeivora_chat_sessions
        ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE xeivora_chat_sessions
        ADD COLUMN IF NOT EXISTS project_id TEXT REFERENCES xeivora_projects(id) ON DELETE SET NULL;
    `);

    await withTransaction(async (client) => {
      const countResult = await client.query("SELECT COUNT(*)::integer AS count FROM xeivora_projects");
      if (!Number(countResult.rows[0]?.count || 0)) {
        const project = DEFAULT_STORE.projects[0];
        await client.query(
          `INSERT INTO xeivora_projects (id, name, description, color, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [project.id, project.name, project.description, project.color, project.status, project.createdAt, project.updatedAt]
        );
      }
    });
  })();

  await schemaReadyPromise;
}

function mapProjectRow(row, counts = { chatCount: 0, fileCount: 0, memoryCount: 0 }) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    color: row.color || "#c96442",
    status: row.status || "active",
    ownerId: row.owner_id || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    ...counts
  };
}

function mapFileRow(row) {
  return {
    id: row.id,
    sessionId: row.session_id || null,
    projectId: row.project_id || null,
    ownerId: row.owner_id || null,
    name: row.name,
    mimeType: row.mime_type,
    kind: row.kind,
    size: Number(row.size_bytes || 0),
    storagePath: row.storage_path,
    previewText: row.preview_text || null,
    summary: row.summary || null,
    extractedText: row.extracted_text || null,
    analysisStatus: row.analysis_status || "queued",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

async function listProjects() {
  if (!isDatabaseConfigured()) {
    const { listSessions } = require("./chat-store");
    const mvpStore = require("./mvp-store");
    const [sessions, memories] = await Promise.all([listSessions({ includeArchived: true }), mvpStore.list("memory")]);
    return (jsonStore.projects || [])
      .slice()
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .map((project) => ({
        ...project,
        ...buildProjectCounts(project, sessions, jsonStore.files || [], memories)
      }));
  }

  await ensureWorkspaceSchema();
  const result = await query(`
    SELECT
      p.*,
      (
        SELECT COUNT(*)::integer FROM xeivora_chat_sessions s WHERE s.project_id = p.id
      ) AS chat_count,
      (
        SELECT COUNT(*)::integer FROM xeivora_uploaded_files f WHERE f.project_id = p.id
      ) AS file_count,
      0::integer AS memory_count
    FROM xeivora_projects p
    ORDER BY
      CASE WHEN p.status = 'active' THEN 0 ELSE 1 END,
      p.updated_at DESC
  `);

  return result.rows.map((row) =>
    mapProjectRow(row, {
      chatCount: Number(row.chat_count || 0),
      fileCount: Number(row.file_count || 0),
      memoryCount: Number(row.memory_count || 0)
    })
  );
}

/**
 * Owner-aware project list for user-facing responses.
 *
 * Returns the projects a given viewer is allowed to see:
 * - projects owned by `viewerId`, plus
 * - legacy projects with no owner (kept visible for backward compatibility).
 *
 * Projects owned by another user are excluded, so the list never leaks the
 * existence or metadata of other users' projects. A null/undefined viewerId
 * still yields legacy (owner-less) projects only.
 */
async function listVisibleProjects(viewerId = null) {
  const projects = await listProjects();
  return projects.filter((project) => {
    const ownerId = project.ownerId ?? null;
    return ownerId === null || ownerId === viewerId;
  });
}

async function createProject(payload = {}) {
  const project = {
    id: randomUUID(),
    name: sanitizeText(payload.name || "Untitled project") || "Untitled project",
    description: sanitizeText(payload.description || ""),
    color: sanitizeText(payload.color || "#c96442") || "#c96442",
    status: payload.status || "active",
    ownerId: payload.ownerId || null,
    createdAt: now(),
    updatedAt: now(),
    chatCount: 0,
    fileCount: 0,
    memoryCount: 0
  };

  if (!isDatabaseConfigured()) {
    jsonStore.projects = [project, ...(jsonStore.projects || [])];
    saveStore(jsonStore);
    return deepClone(project);
  }

  await ensureWorkspaceSchema();
  await query(
    `INSERT INTO xeivora_projects (id, name, description, color, status, owner_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      project.id,
      project.name,
      project.description,
      project.color,
      project.status,
      project.ownerId,
      project.createdAt,
      project.updatedAt
    ]
  );
  return project;
}

async function updateProject(projectId, payload = {}) {
  if (!isDatabaseConfigured()) {
    const project = (jsonStore.projects || []).find((item) => item.id === projectId);
    if (!project) {
      return null;
    }

    Object.assign(project, {
      name: payload.name ? sanitizeText(payload.name) : project.name,
      description: payload.description !== undefined ? sanitizeText(payload.description) : project.description,
      color: payload.color ? sanitizeText(payload.color) : project.color,
      status: payload.status || project.status,
      updatedAt: now()
    });
    saveStore(jsonStore);
    return deepClone(project);
  }

  await ensureWorkspaceSchema();
  const result = await query(
    `UPDATE xeivora_projects
     SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       color = COALESCE($4, color),
       status = COALESCE($5, status),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      projectId,
      payload.name ? sanitizeText(payload.name) : null,
      payload.description !== undefined ? sanitizeText(payload.description) : null,
      payload.color ? sanitizeText(payload.color) : null,
      payload.status || null
    ]
  );

  return result.rowCount ? mapProjectRow(result.rows[0]) : null;
}

async function deleteProject(projectId) {
  if (!isDatabaseConfigured()) {
    const previousLength = (jsonStore.projects || []).length;
    jsonStore.projects = (jsonStore.projects || []).filter((item) => item.id !== projectId);
    (jsonStore.files || []).forEach((file) => {
      if (file.projectId === projectId) {
        file.projectId = null;
      }
    });
    saveStore(jsonStore);
    return previousLength !== jsonStore.projects.length;
  }

  await ensureWorkspaceSchema();
  await query("UPDATE xeivora_chat_sessions SET project_id = NULL WHERE project_id = $1", [projectId]);
  const result = await query("DELETE FROM xeivora_projects WHERE id = $1", [projectId]);
  return result.rowCount > 0;
}

function createUploadTarget(originalName = "upload.bin") {
  ensureUploadsDir();
  const safeName = sanitizeFileName(originalName);
  const fileId = randomUUID();
  return {
    fileId,
    absolutePath: path.join(uploadsDir, `${fileId}-${safeName}`),
    relativePath: `data/uploads/${fileId}-${safeName}`
  };
}

async function listFiles({ sessionId = null, projectId = null, limit = 100 } = {}) {
  if (!isDatabaseConfigured()) {
    return (jsonStore.files || [])
      .filter((file) => (sessionId ? file.sessionId === sessionId : true) && (projectId ? file.projectId === projectId : true))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, limit)
      .map((file) => deepClone(file));
  }

  await ensureWorkspaceSchema();
  const clauses = [];
  const params = [];

  if (sessionId) {
    params.push(sessionId);
    clauses.push(`session_id = $${params.length}`);
  }

  if (projectId) {
    params.push(projectId);
    clauses.push(`project_id = $${params.length}`);
  }

  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT *
     FROM xeivora_uploaded_files
     ${where}
     ORDER BY updated_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map(mapFileRow);
}

async function getFile(fileId) {
  if (!isDatabaseConfigured()) {
    const file = (jsonStore.files || []).find((item) => item.id === fileId);
    return file ? deepClone(file) : null;
  }

  await ensureWorkspaceSchema();
  const result = await query("SELECT * FROM xeivora_uploaded_files WHERE id = $1", [fileId]);
  return result.rowCount ? mapFileRow(result.rows[0]) : null;
}

async function createUploadedFile(payload = {}) {
  const file = {
    id: payload.id || randomUUID(),
    sessionId: payload.sessionId || null,
    projectId: payload.projectId || null,
    ownerId: payload.ownerId || null,
    name: sanitizeText(payload.name || "Untitled file") || "Untitled file",
    mimeType: sanitizeText(payload.mimeType || "application/octet-stream") || "application/octet-stream",
    kind: payload.kind || detectFileKind(payload.name || "", payload.mimeType || ""),
    size: Number(payload.size || 0),
    storagePath: payload.storagePath || "",
    previewText: payload.previewText || null,
    summary: payload.summary || null,
    extractedText: payload.extractedText || null,
    analysisStatus: payload.analysisStatus || "queued",
    createdAt: payload.createdAt || now(),
    updatedAt: payload.updatedAt || now()
  };

  if (!isDatabaseConfigured()) {
    jsonStore.files = [file, ...(jsonStore.files || [])];
    saveStore(jsonStore);
    return deepClone(file);
  }

  await ensureWorkspaceSchema();
  await query(
    `INSERT INTO xeivora_uploaded_files
      (id, session_id, project_id, name, mime_type, kind, size_bytes, storage_path, preview_text, summary, extracted_text, analysis_status, owner_id, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '{}'::jsonb, $14, $15)`,
    [
      file.id,
      file.sessionId,
      file.projectId,
      file.name,
      file.mimeType,
      file.kind,
      file.size,
      file.storagePath,
      file.previewText,
      file.summary,
      file.extractedText,
      file.analysisStatus,
      file.ownerId,
      file.createdAt,
      file.updatedAt
    ]
  );

  return file;
}

async function updateUploadedFile(fileId, payload = {}) {
  if (!isDatabaseConfigured()) {
    const file = (jsonStore.files || []).find((item) => item.id === fileId);
    if (!file) {
      return null;
    }

    Object.assign(file, {
      sessionId: payload.sessionId !== undefined ? payload.sessionId : file.sessionId,
      projectId: payload.projectId !== undefined ? payload.projectId : file.projectId,
      previewText: payload.previewText !== undefined ? payload.previewText : file.previewText,
      summary: payload.summary !== undefined ? payload.summary : file.summary,
      extractedText: payload.extractedText !== undefined ? payload.extractedText : file.extractedText,
      analysisStatus: payload.analysisStatus || file.analysisStatus,
      updatedAt: now()
    });
    saveStore(jsonStore);
    return deepClone(file);
  }

  await ensureWorkspaceSchema();
  const result = await query(
    `UPDATE xeivora_uploaded_files
     SET
       session_id = COALESCE($2, session_id),
       project_id = $3,
       preview_text = COALESCE($4, preview_text),
       summary = COALESCE($5, summary),
       extracted_text = COALESCE($6, extracted_text),
       analysis_status = COALESCE($7, analysis_status),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      fileId,
      payload.sessionId !== undefined ? payload.sessionId : null,
      payload.projectId !== undefined ? payload.projectId : null,
      payload.previewText !== undefined ? payload.previewText : null,
      payload.summary !== undefined ? payload.summary : null,
      payload.extractedText !== undefined ? payload.extractedText : null,
      payload.analysisStatus || null
    ]
  );

  return result.rowCount ? mapFileRow(result.rows[0]) : null;
}

async function deleteUploadedFile(fileId) {
  const existing = await getFile(fileId);
  if (!existing) {
    return false;
  }

  try {
    fs.rmSync(path.isAbsolute(existing.storagePath) ? existing.storagePath : path.join(process.cwd(), existing.storagePath), {
      force: true
    });
  } catch {
    // Ignore file removal failures and continue to metadata cleanup.
  }

  if (!isDatabaseConfigured()) {
    const previousLength = (jsonStore.files || []).length;
    jsonStore.files = (jsonStore.files || []).filter((item) => item.id !== fileId);
    saveStore(jsonStore);
    return previousLength !== jsonStore.files.length;
  }

  await ensureWorkspaceSchema();
  const result = await query("DELETE FROM xeivora_uploaded_files WHERE id = $1", [fileId]);
  return result.rowCount > 0;
}

async function logToolExecution(payload = {}) {
  const log = {
    id: randomUUID(),
    tool: sanitizeText(payload.tool || "unknown-tool") || "unknown-tool",
    sessionId: payload.sessionId || null,
    projectId: payload.projectId || null,
    status: payload.status || "ok",
    summary: sanitizeText(payload.summary || "Tool executed.") || "Tool executed.",
    payload: payload.payload || {},
    createdAt: now()
  };

  if (!isDatabaseConfigured()) {
    jsonStore.toolLogs = [log, ...(jsonStore.toolLogs || [])].slice(0, 200);
    saveStore(jsonStore);
    return deepClone(log);
  }

  await ensureWorkspaceSchema();
  await query(
    `INSERT INTO xeivora_tool_logs (id, tool, session_id, project_id, status, summary, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
    [log.id, log.tool, log.sessionId, log.projectId, log.status, log.summary, JSON.stringify(log.payload), log.createdAt]
  );
  return log;
}

async function listToolLogs(options = 30) {
  const normalized =
    typeof options === "number"
      ? { limit: options, projectId: null, sessionId: null }
      : {
          limit: Number(options?.limit || 30),
          projectId: options?.projectId || null,
          sessionId: options?.sessionId || null
        };

  if (!isDatabaseConfigured()) {
    return deepClone(
      (jsonStore.toolLogs || [])
        .filter((item) => (normalized.projectId ? item.projectId === normalized.projectId : true))
        .filter((item) => (normalized.sessionId ? item.sessionId === normalized.sessionId : true))
        .slice(0, normalized.limit)
    );
  }

  await ensureWorkspaceSchema();
  const clauses = [];
  const params = [];

  if (normalized.projectId) {
    params.push(normalized.projectId);
    clauses.push(`project_id = $${params.length}`);
  }

  if (normalized.sessionId) {
    params.push(normalized.sessionId);
    clauses.push(`session_id = $${params.length}`);
  }

  params.push(normalized.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT *
     FROM xeivora_tool_logs
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    tool: row.tool,
    sessionId: row.session_id || null,
    projectId: row.project_id || null,
    status: row.status,
    summary: row.summary,
    payload: row.payload || {},
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
  }));
}

async function searchWorkspace(rawQuery, { viewerId = null } = {}) {
  const queryText = sanitizeText(rawQuery).toLowerCase();
  if (!queryText) {
    return [];
  }

  const { listSessions } = require("./chat-store");
  const mvpStore = require("./mvp-store");
  const [sessions, projects, files, memories] = await Promise.all([
    listSessions({ includeArchived: true }),
    listVisibleProjects(viewerId),
    listFiles({ limit: 80 }),
    mvpStore.list("memory")
  ]);

  // Results are scoped per viewer by ownership. `projects` is already
  // owner-filtered (listVisibleProjects). Chats, files, and memories carry an
  // owner_id stamped at creation: a record is visible when the viewer owns it,
  // or when it is owner-less (legacy records created before ownership existed,
  // kept searchable for everyone for backward compatibility). Records owned by
  // another user are excluded, so search never leaks cross-user content.
  const isVisibleToViewer = (ownerId) => {
    const owner = ownerId ?? null;
    return owner === null || owner === viewerId;
  };

  const results = [];

  sessions.forEach((session) => {
    if (!isVisibleToViewer(session.ownerId)) {
      return;
    }
    const haystack = `${session.title} ${session.preview}`.toLowerCase();
    if (haystack.includes(queryText)) {
      results.push({
        id: session.id,
        category: "chat",
        title: session.title,
        excerpt: session.preview,
        href: `/chat?session=${session.id}`,
        updatedAt: session.updatedAt
      });
    }
  });

  projects.forEach((project) => {
    const haystack = `${project.name} ${project.description}`.toLowerCase();
    if (haystack.includes(queryText)) {
      results.push({
        id: project.id,
        category: "project",
        title: project.name,
        excerpt: project.description,
        href: "/dashboard",
        updatedAt: project.updatedAt
      });
    }
  });

  files.forEach((file) => {
    if (!isVisibleToViewer(file.ownerId)) {
      return;
    }
    const haystack = `${file.name} ${file.previewText || ""} ${file.summary || ""}`.toLowerCase();
    if (haystack.includes(queryText)) {
      results.push({
        id: file.id,
        category: "file",
        title: file.name,
        excerpt: file.summary || file.previewText || "Uploaded workspace file",
        href: file.sessionId ? `/chat?session=${file.sessionId}` : "/chat",
        updatedAt: file.updatedAt
      });
    }
  });

  memories.forEach((memory) => {
    if (!isVisibleToViewer(memory.ownerId)) {
      return;
    }
    const haystack = `${memory.title || ""} ${memory.content || ""}`.toLowerCase();
    if (haystack.includes(queryText)) {
      results.push({
        id: memory.id,
        category: "memory",
        title: memory.title || "Workspace memory",
        excerpt: memory.content || "",
        href: "/memory",
        updatedAt: memory.updatedAt || memory.createdAt || now()
      });
    }
  });

  return results
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 24);
}

module.exports = {
  createProject,
  createUploadedFile,
  createUploadTarget,
  deleteProject,
  deleteUploadedFile,
  detectFileKind,
  ensureUploadsDir,
  getFile,
  listFiles,
  listProjects,
  listVisibleProjects,
  listToolLogs,
  logToolExecution,
  searchWorkspace,
  updateProject,
  updateUploadedFile
};
