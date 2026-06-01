const fs = require("node:fs");
const path = require("node:path");
const { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } = require("node:crypto");

const { isDatabaseConfigured, query } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-integrations.json");
const DEFAULT_STORE = {
  integrations: []
};

let schemaReadyPromise;
const jsonStore = isDatabaseConfigured() ? null : loadStore();

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
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : []
    };
  } catch {
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

function now() {
  return new Date().toISOString();
}

function getCipherKey() {
  const seed =
    process.env.INTEGRATIONS_ENCRYPTION_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.OPENAI_API_KEY ||
    process.env.DATABASE_URL ||
    "xeivora-integrations-dev-key";

  return createHash("sha256").update(seed).digest();
}

function encryptValue(value) {
  if (!value) {
    return null;
  }

  const iv = randomBytes(12);
  const key = getCipherKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

function decryptValue(value) {
  if (!value) {
    return null;
  }

  const parts = String(value).split(".");
  if (parts.length !== 3) {
    return value;
  }

  try {
    const [ivRaw, tagRaw, encryptedRaw] = parts;
    const decipher = createDecipheriv("aes-256-gcm", getCipherKey(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

function sanitizeScopes(scopes = []) {
  return Array.isArray(scopes) ? scopes.filter(Boolean).map((scope) => String(scope)) : [];
}

function mapRow(row) {
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    provider: row.provider,
    accessToken: decryptValue(row.access_token || row.accessToken),
    refreshToken: decryptValue(row.refresh_token || row.refreshToken),
    expiresAt:
      row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at || row.expiresAt || null,
    scopes: sanitizeScopes(row.scopes || []),
    connectedAt:
      row.connected_at instanceof Date
        ? row.connected_at.toISOString()
        : row.connected_at || row.connectedAt || null,
    updatedAt:
      row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at || row.updatedAt || null,
    accountLabel: row.account_label || row.accountLabel || null,
    metadata: row.metadata || {}
  };
}

async function ensureSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS xeivora_user_integrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES xeivora_users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      scopes TEXT[] NOT NULL DEFAULT '{}',
      account_label TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, provider)
    );
  `);

  await schemaReadyPromise;
}

async function listUserIntegrations(userId) {
  if (!userId) {
    return [];
  }

  if (!isDatabaseConfigured()) {
    return jsonStore.integrations.filter((entry) => entry.userId === userId).map(mapRow);
  }

  await ensureSchema();
  const result = await query(
    `SELECT * FROM xeivora_user_integrations WHERE user_id = $1 ORDER BY connected_at DESC`,
    [userId]
  );
  return result.rows.map(mapRow);
}

async function getUserIntegration(userId, provider) {
  if (!userId || !provider) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const row = jsonStore.integrations.find((entry) => entry.userId === userId && entry.provider === provider);
    return row ? mapRow(row) : null;
  }

  await ensureSchema();
  const result = await query(
    `SELECT * FROM xeivora_user_integrations WHERE user_id = $1 AND provider = $2 LIMIT 1`,
    [userId, provider]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function upsertUserIntegration(userId, provider, payload) {
  const timestamp = now();
  const next = {
    id: payload.id || randomUUID(),
    userId,
    provider,
    accessToken: payload.accessToken || null,
    refreshToken: payload.refreshToken || null,
    expiresAt: payload.expiresAt || null,
    scopes: sanitizeScopes(payload.scopes),
    accountLabel: payload.accountLabel || null,
    metadata: payload.metadata || {},
    connectedAt: payload.connectedAt || timestamp,
    updatedAt: timestamp
  };

  if (!isDatabaseConfigured()) {
    const index = jsonStore.integrations.findIndex((entry) => entry.userId === userId && entry.provider === provider);
    const record = {
      ...next,
      accessToken: encryptValue(next.accessToken),
      refreshToken: encryptValue(next.refreshToken)
    };

    if (index >= 0) {
      jsonStore.integrations[index] = record;
    } else {
      jsonStore.integrations.unshift(record);
    }

    saveStore(jsonStore);
    return mapRow(record);
  }

  await ensureSchema();
  const result = await query(
    `INSERT INTO xeivora_user_integrations
      (id, user_id, provider, access_token, refresh_token, expires_at, scopes, account_label, metadata, connected_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       access_token = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at = EXCLUDED.expires_at,
       scopes = EXCLUDED.scopes,
       account_label = EXCLUDED.account_label,
       metadata = EXCLUDED.metadata,
       connected_at = EXCLUDED.connected_at,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      next.id,
      userId,
      provider,
      encryptValue(next.accessToken),
      encryptValue(next.refreshToken),
      next.expiresAt,
      next.scopes,
      next.accountLabel,
      JSON.stringify(next.metadata || {}),
      next.connectedAt,
      next.updatedAt
    ]
  );

  return mapRow(result.rows[0]);
}

async function deleteUserIntegration(userId, provider) {
  if (!userId || !provider) {
    return false;
  }

  if (!isDatabaseConfigured()) {
    const before = jsonStore.integrations.length;
    jsonStore.integrations = jsonStore.integrations.filter(
      (entry) => !(entry.userId === userId && entry.provider === provider)
    );
    saveStore(jsonStore);
    return jsonStore.integrations.length !== before;
  }

  await ensureSchema();
  const result = await query(
    `DELETE FROM xeivora_user_integrations WHERE user_id = $1 AND provider = $2`,
    [userId, provider]
  );
  return Boolean(result.rowCount);
}

module.exports = {
  deleteUserIntegration,
  getUserIntegration,
  listUserIntegrations,
  upsertUserIntegration
};
