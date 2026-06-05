const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const { isDatabaseConfigured, query } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-preview-store.json");
const DEFAULT_STORE = {
  previewVersions: []
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

function loadStore() {
  ensureStoreFile();
  try {
    const raw = fs.readFileSync(storeFile, "utf8").trim();
    const parsed = raw ? JSON.parse(raw) : DEFAULT_STORE;
    return {
      previewVersions: Array.isArray(parsed.previewVersions) ? parsed.previewVersions : []
    };
  } catch {
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
    return deepClone(DEFAULT_STORE);
  }
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

const jsonStore = isDatabaseConfigured() ? null : loadStore();

function sanitizeText(value = "") {
  return `${value}`.replace(/\s+/g, " ").trim();
}

function normalizeChangedFiles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item))
    .filter(Boolean)
    .slice(0, 24);
}

function normalizePreviewPayload(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value;
  const renderMode =
    payload.renderMode === "unsupported"
      ? "unsupported"
      : payload.renderMode === "html"
        ? "html"
        : null;

  if (!renderMode) {
    return null;
  }

  return {
    renderMode,
    srcDoc: typeof payload.srcDoc === "string" ? payload.srcDoc : null,
    sourceCode: typeof payload.sourceCode === "string" ? payload.sourceCode : null,
    language: typeof payload.language === "string" ? payload.language : null,
    reason: typeof payload.reason === "string" ? payload.reason : null,
    entryLabel: typeof payload.entryLabel === "string" ? payload.entryLabel : null
  };
}

function normalizePreviewStatus(value = "") {
  const normalized = sanitizeText(value).toLowerCase();

  if (normalized === "approved") {
    return "approved";
  }

  if (normalized === "deployed" || normalized === "deploy_ready" || normalized === "deploy-ready") {
    return "deploy_ready";
  }

  return "live";
}

async function ensurePreviewSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS xeivora_preview_versions (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      session_id TEXT,
      version_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'live',
      route_path TEXT NOT NULL DEFAULT '/',
      changed_files JSONB NOT NULL DEFAULT '[]'::jsonb,
      preview_payload JSONB,
      notes TEXT,
      approved_at TIMESTAMPTZ,
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS xeivora_preview_versions_project_created_idx
      ON xeivora_preview_versions (project_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS xeivora_preview_versions_session_created_idx
      ON xeivora_preview_versions (session_id, created_at DESC);

    ALTER TABLE xeivora_preview_versions
      ADD COLUMN IF NOT EXISTS preview_payload JSONB;
  `);

  await schemaReadyPromise;
}

function mapPreviewRow(row) {
  return {
    id: row.id,
    projectId: row.project_id || null,
    sessionId: row.session_id || null,
    versionNumber: Number(row.version_number || 1),
    title: row.title,
    summary: row.summary,
    status: normalizePreviewStatus(row.status || "live"),
    routePath: row.route_path || "/",
    changedFiles: Array.isArray(row.changed_files) ? row.changed_files : [],
    previewPayload: normalizePreviewPayload(row.preview_payload),
    notes: row.notes || null,
    approvedAt: row.approved_at instanceof Date ? row.approved_at.toISOString() : row.approved_at || null,
    deployedAt: row.deployed_at instanceof Date ? row.deployed_at.toISOString() : row.deployed_at || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at
  };
}

function filterPreviews(items, { projectId = null, sessionId = null } = {}) {
  return items.filter(
    (item) => (projectId ? item.projectId === projectId : true) && (sessionId ? item.sessionId === sessionId : true)
  );
}

function inferNextVersionNumber(items, { projectId = null, sessionId = null } = {}) {
  const scoped = filterPreviews(items, { projectId, sessionId });
  return scoped.reduce((max, item) => Math.max(max, Number(item.versionNumber || 0)), 0) + 1;
}

async function listPreviewVersions({ projectId = null, sessionId = null, limit = 40 } = {}) {
  if (!isDatabaseConfigured()) {
    return filterPreviews(jsonStore.previewVersions || [], { projectId, sessionId })
      .slice()
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, limit)
      .map((item) => deepClone(item));
  }

  await ensurePreviewSchema();
  const clauses = [];
  const params = [];

  if (projectId) {
    params.push(projectId);
    clauses.push(`project_id = $${params.length}`);
  }

  if (sessionId) {
    params.push(sessionId);
    clauses.push(`session_id = $${params.length}`);
  }

  params.push(limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await query(
    `SELECT *
     FROM xeivora_preview_versions
     ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map(mapPreviewRow);
}

async function createPreviewVersion(payload = {}) {
  const basePreview = {
    id: randomUUID(),
    projectId: payload.projectId || null,
    sessionId: payload.sessionId || null,
    versionNumber: 1,
    title: sanitizeText(payload.title || "Preview checkpoint") || "Preview checkpoint",
    summary: sanitizeText(payload.summary || "Preview tracked for this project.") || "Preview tracked for this project.",
    status: normalizePreviewStatus(payload.status || "live"),
    routePath: sanitizeText(payload.routePath || "/") || "/",
    changedFiles: normalizeChangedFiles(payload.changedFiles),
    previewPayload: normalizePreviewPayload(payload.previewPayload),
    notes: sanitizeText(payload.notes || "") || null,
    approvedAt: payload.approvedAt || null,
    deployedAt: payload.deployedAt || null,
    createdAt: payload.createdAt || now(),
    updatedAt: payload.updatedAt || now()
  };

  if (!isDatabaseConfigured()) {
    const versionNumber = inferNextVersionNumber(jsonStore.previewVersions || [], {
      projectId: basePreview.projectId,
      sessionId: basePreview.sessionId
    });
    const preview = { ...basePreview, versionNumber };
    jsonStore.previewVersions = [preview, ...(jsonStore.previewVersions || [])].slice(0, 240);
    saveStore(jsonStore);
    return deepClone(preview);
  }

  await ensurePreviewSchema();
  const result = await query(
    `SELECT COALESCE(MAX(version_number), 0)::integer + 1 AS next_version
     FROM xeivora_preview_versions
     WHERE ($1::text IS NULL OR project_id = $1)
       AND ($2::text IS NULL OR session_id = $2)`,
    [basePreview.projectId, basePreview.sessionId]
  );
  const versionNumber = Number(result.rows[0]?.next_version || 1);
  const preview = { ...basePreview, versionNumber };

  await query(
    `INSERT INTO xeivora_preview_versions
      (id, project_id, session_id, version_number, title, summary, status, route_path, changed_files, preview_payload, notes, approved_at, deployed_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15)`,
    [
      preview.id,
      preview.projectId,
      preview.sessionId,
      preview.versionNumber,
      preview.title,
      preview.summary,
      preview.status,
      preview.routePath,
      JSON.stringify(preview.changedFiles),
      preview.previewPayload ? JSON.stringify(preview.previewPayload) : null,
      preview.notes,
      preview.approvedAt,
      preview.deployedAt,
      preview.createdAt,
      preview.updatedAt
    ]
  );

  return preview;
}

async function updatePreviewVersion(previewId, payload = {}) {
  if (!isDatabaseConfigured()) {
    const preview = (jsonStore.previewVersions || []).find((item) => item.id === previewId);
    if (!preview) {
      return null;
    }

    Object.assign(preview, {
      title: payload.title !== undefined ? sanitizeText(payload.title) : preview.title,
      summary: payload.summary !== undefined ? sanitizeText(payload.summary) : preview.summary,
      status: payload.status !== undefined ? normalizePreviewStatus(payload.status) : preview.status,
      routePath: payload.routePath !== undefined ? sanitizeText(payload.routePath) : preview.routePath,
      changedFiles: payload.changedFiles !== undefined ? normalizeChangedFiles(payload.changedFiles) : preview.changedFiles,
      previewPayload: payload.previewPayload !== undefined ? normalizePreviewPayload(payload.previewPayload) : preview.previewPayload,
      notes: payload.notes !== undefined ? sanitizeText(payload.notes) || null : preview.notes,
      approvedAt: payload.approvedAt !== undefined ? payload.approvedAt : preview.approvedAt,
      deployedAt: payload.deployedAt !== undefined ? payload.deployedAt : preview.deployedAt,
      updatedAt: now()
    });
    saveStore(jsonStore);
    return deepClone(preview);
  }

  await ensurePreviewSchema();
  const normalizedStatus = payload.status !== undefined ? normalizePreviewStatus(payload.status) : null;
  const result = await query(
    `UPDATE xeivora_preview_versions
     SET
       title = COALESCE($2, title),
       summary = COALESCE($3, summary),
       status = COALESCE($4, status),
       route_path = COALESCE($5, route_path),
       changed_files = COALESCE($6::jsonb, changed_files),
       preview_payload = COALESCE($7::jsonb, preview_payload),
       notes = COALESCE($8, notes),
       approved_at = COALESCE($9, approved_at),
       deployed_at = COALESCE($10, deployed_at),
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      previewId,
      payload.title !== undefined ? sanitizeText(payload.title) : null,
      payload.summary !== undefined ? sanitizeText(payload.summary) : null,
      normalizedStatus,
      payload.routePath !== undefined ? sanitizeText(payload.routePath) : null,
      payload.changedFiles !== undefined ? JSON.stringify(normalizeChangedFiles(payload.changedFiles)) : null,
      payload.previewPayload !== undefined ? JSON.stringify(normalizePreviewPayload(payload.previewPayload)) : null,
      payload.notes !== undefined ? sanitizeText(payload.notes) || null : null,
      payload.approvedAt !== undefined ? payload.approvedAt : null,
      payload.deployedAt !== undefined ? payload.deployedAt : null
    ]
  );

  return result.rowCount ? mapPreviewRow(result.rows[0]) : null;
}

async function getLatestPreviewVersion({ projectId = null, sessionId = null } = {}) {
  const previews = await listPreviewVersions({ projectId, sessionId, limit: 1 });
  return previews[0] || null;
}

module.exports = {
  createPreviewVersion,
  getLatestPreviewVersion,
  listPreviewVersions,
  updatePreviewVersion
};
