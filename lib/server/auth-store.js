const fs = require("node:fs");
const path = require("node:path");
const {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual
} = require("node:crypto");

const { isDatabaseConfigured, query, withTransaction } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-auth-store.json");
const DEFAULT_STORE = {
  users: [],
  sessions: [],
  passwordResetTokens: []
};

let schemaReadyPromise;

function now() {
  return new Date().toISOString();
}

function ensureStoreFile() {
  if (!fs.existsSync(storeFile)) {
    fs.mkdirSync(path.dirname(storeFile), { recursive: true });
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

function loadStore() {
  ensureStoreFile();
  const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8"));
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    passwordResetTokens: Array.isArray(parsed.passwordResetTokens) ? parsed.passwordResetTokens : []
  };
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

const jsonStore = isDatabaseConfigured() ? null : loadStore();

function normalizeEmail(value = "") {
  return `${value}`.trim().toLowerCase();
}

function normalizeName(value = "") {
  return `${value}`.replace(/\s+/g, " ").trim();
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash = "") {
  const [salt, hash] = `${storedHash}`.split(":");

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const received = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function defaultPreferences() {
  return {
    memoryEnabled: true,
    orchestrationMode: "auto",
    workspaceDensity: "comfortable"
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl || null,
    provider: user.provider,
    plan: user.plan || "Starter",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt || null,
    preferences: {
      ...defaultPreferences(),
      ...(user.preferences || {})
    }
  };
}

async function ensureAuthSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS xeivora_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        avatar_url TEXT,
        password_hash TEXT,
        provider TEXT NOT NULL DEFAULT 'password',
        plan TEXT NOT NULL DEFAULT 'Starter',
        preferences JSONB NOT NULL DEFAULT '{"memoryEnabled":true,"orchestrationMode":"auto","workspaceDensity":"comfortable"}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS xeivora_auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES xeivora_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        user_agent TEXT,
        ip_address TEXT,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS xeivora_auth_sessions_user_idx
        ON xeivora_auth_sessions (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS xeivora_password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES xeivora_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  })();

  await schemaReadyPromise;
}

function mapUserRow(row) {
  return toPublicUser({
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url || null,
    provider: row.provider || "password",
    plan: row.plan || "Starter",
    preferences: row.preferences || defaultPreferences(),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    lastLoginAt: row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at
  });
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const match = jsonStore.users.find((user) => user.email === normalizedEmail);
    return match ? toPublicUser(match) : null;
  }

  await ensureAuthSchema();
  const result = await query(`SELECT * FROM xeivora_users WHERE email = $1 LIMIT 1`, [normalizedEmail]);
  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function findUserRowByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return jsonStore.users.find((user) => user.email === normalizedEmail) || null;
  }

  await ensureAuthSchema();
  const result = await query(`SELECT * FROM xeivora_users WHERE email = $1 LIMIT 1`, [normalizedEmail]);
  return result.rows[0] || null;
}

async function findUserRowById(userId) {
  if (!userId) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    return jsonStore.users.find((user) => user.id === userId) || null;
  }

  await ensureAuthSchema();
  const result = await query(`SELECT * FROM xeivora_users WHERE id = $1 LIMIT 1`, [userId]);
  return result.rows[0] || null;
}

async function createUser({ email, name, password, provider = "password", avatarUrl = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);

  if (!normalizedEmail || !normalizedName) {
    const error = new Error("Name and email are required.");
    error.statusCode = 400;
    throw error;
  }

  if (provider === "password" && (!password || password.length < 8)) {
    const error = new Error("Password must be at least 8 characters.");
    error.statusCode = 400;
    throw error;
  }

  const existing = await findUserRowByEmail(normalizedEmail);
  if (existing) {
    const error = new Error("An account with this email already exists.");
    error.statusCode = 409;
    throw error;
  }

  const timestamp = now();
  const user = {
    id: randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    avatarUrl,
    passwordHash: password ? hashPassword(password) : null,
    provider,
    plan: "Starter",
    preferences: defaultPreferences(),
    createdAt: timestamp,
    updatedAt: timestamp,
    lastLoginAt: null
  };

  if (!isDatabaseConfigured()) {
    jsonStore.users.unshift(user);
    saveStore(jsonStore);
    return toPublicUser(user);
  }

  await ensureAuthSchema();
  const result = await query(
    `INSERT INTO xeivora_users
      (id, name, email, avatar_url, password_hash, provider, plan, preferences, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)
     RETURNING *`,
    [
      user.id,
      user.name,
      user.email,
      user.avatarUrl,
      user.passwordHash,
      user.provider,
      user.plan,
      JSON.stringify(user.preferences),
      user.createdAt,
      user.updatedAt
    ]
  );

  return mapUserRow(result.rows[0]);
}

async function verifyUserCredentials(email, password) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) {
    return null;
  }

  const user = await findUserRowByEmail(normalizedEmail);
  const passwordHash = user?.passwordHash || user?.password_hash || null;

  if (!user || !passwordHash || !verifyPassword(password, passwordHash)) {
    return null;
  }

  return isDatabaseConfigured() ? mapUserRow(user) : toPublicUser(user);
}

async function updateLastLogin(userId) {
  const timestamp = now();

  if (!isDatabaseConfigured()) {
    const user = jsonStore.users.find((item) => item.id === userId);
    if (user) {
      user.lastLoginAt = timestamp;
      user.updatedAt = timestamp;
      saveStore(jsonStore);
    }
    return;
  }

  await ensureAuthSchema();
  await query(
    `UPDATE xeivora_users
     SET last_login_at = $2, updated_at = $2
     WHERE id = $1`,
    [userId, timestamp]
  );
}

async function createSession(userId, meta = {}) {
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const timestamp = now();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const session = {
    id: randomUUID(),
    userId,
    tokenHash,
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
    expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (!isDatabaseConfigured()) {
    jsonStore.sessions = jsonStore.sessions.filter((entry) => entry.userId !== userId);
    jsonStore.sessions.unshift(session);
    saveStore(jsonStore);
  } else {
    await ensureAuthSchema();
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM xeivora_auth_sessions WHERE user_id = $1`, [userId]);
      await client.query(
        `INSERT INTO xeivora_auth_sessions
          (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [session.id, session.userId, session.tokenHash, session.userAgent, session.ipAddress, session.expiresAt, session.createdAt, session.updatedAt]
      );
    });
  }

  await updateLastLogin(userId);
  const user = await findUserRowById(userId);
  return {
    token,
    expiresAt,
    user: isDatabaseConfigured() ? mapUserRow(user) : toPublicUser(user)
  };
}

async function getSessionByToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);

  if (!isDatabaseConfigured()) {
    const session = jsonStore.sessions.find((entry) => entry.tokenHash === tokenHash);
    if (!session) {
      return null;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      jsonStore.sessions = jsonStore.sessions.filter((entry) => entry.tokenHash !== tokenHash);
      saveStore(jsonStore);
      return null;
    }

    const user = jsonStore.users.find((entry) => entry.id === session.userId);
    return user
      ? {
          user: toPublicUser(user),
          expiresAt: session.expiresAt
        }
      : null;
  }

  await ensureAuthSchema();
  const result = await query(
    `SELECT s.expires_at, u.*
     FROM xeivora_auth_sessions s
     JOIN xeivora_users u ON u.id = s.user_id
     WHERE s.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  const expiresAt = row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at;
  if (new Date(expiresAt).getTime() <= Date.now()) {
    await revokeSessionByToken(token);
    return null;
  }

  return {
    user: mapUserRow(row),
    expiresAt
  };
}

async function revokeSessionByToken(token) {
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);

  if (!isDatabaseConfigured()) {
    jsonStore.sessions = jsonStore.sessions.filter((entry) => entry.tokenHash !== tokenHash);
    saveStore(jsonStore);
    return;
  }

  await ensureAuthSchema();
  await query(`DELETE FROM xeivora_auth_sessions WHERE token_hash = $1`, [tokenHash]);
}

async function upsertGoogleUser({ email, name, avatarUrl = null }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name) || normalizedEmail.split("@")[0] || "Xeivora User";

  if (!normalizedEmail) {
    const error = new Error("Google account email is missing.");
    error.statusCode = 400;
    throw error;
  }

  if (!isDatabaseConfigured()) {
    const existing = jsonStore.users.find((entry) => entry.email === normalizedEmail);
    if (existing) {
      existing.name = normalizedName;
      existing.avatarUrl = avatarUrl;
      existing.provider = "google";
      existing.updatedAt = now();
      saveStore(jsonStore);
      return toPublicUser(existing);
    }

    return createUser({ email: normalizedEmail, name: normalizedName, provider: "google", avatarUrl });
  }

  await ensureAuthSchema();
  const result = await query(
    `INSERT INTO xeivora_users
      (id, name, email, avatar_url, provider, plan, preferences, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'google', 'Starter', $5::jsonb, $6, $6)
     ON CONFLICT (email)
     DO UPDATE SET
       name = EXCLUDED.name,
       avatar_url = EXCLUDED.avatar_url,
       provider = 'google',
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      randomUUID(),
      normalizedName,
      normalizedEmail,
      avatarUrl,
      JSON.stringify(defaultPreferences()),
      now()
    ]
  );
  return mapUserRow(result.rows[0]);
}

async function updateUserProfile(userId, updates = {}) {
  const nextName = normalizeName(updates.name || "");

  if (!isDatabaseConfigured()) {
    const user = jsonStore.users.find((entry) => entry.id === userId);
    if (!user) {
      return null;
    }

    user.name = nextName || user.name;
    user.avatarUrl = updates.avatarUrl === undefined ? user.avatarUrl : updates.avatarUrl;
    user.preferences = {
      ...defaultPreferences(),
      ...(user.preferences || {}),
      ...(updates.preferences || {})
    };
    user.updatedAt = now();
    saveStore(jsonStore);
    return toPublicUser(user);
  }

  await ensureAuthSchema();
  const current = await findUserRowById(userId);
  if (!current) {
    return null;
  }

  const preferences = {
    ...defaultPreferences(),
    ...(current.preferences || {}),
    ...(updates.preferences || {})
  };
  const result = await query(
    `UPDATE xeivora_users
     SET name = $2,
         avatar_url = $3,
         preferences = $4::jsonb,
         updated_at = $5
     WHERE id = $1
     RETURNING *`,
    [
      userId,
      nextName || current.name,
      updates.avatarUrl === undefined ? current.avatar_url : updates.avatarUrl,
      JSON.stringify(preferences),
      now()
    ]
  );
  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

async function requestPasswordReset(email) {
  const user = await findUserRowByEmail(email);
  if (!user) {
    return null;
  }

  const token = createSessionToken();
  const record = {
    id: randomUUID(),
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
    usedAt: null,
    createdAt: now()
  };

  if (!isDatabaseConfigured()) {
    jsonStore.passwordResetTokens = jsonStore.passwordResetTokens.filter((entry) => entry.userId !== user.id);
    jsonStore.passwordResetTokens.unshift(record);
    saveStore(jsonStore);
  } else {
    await ensureAuthSchema();
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM xeivora_password_reset_tokens WHERE user_id = $1`, [user.id]);
      await client.query(
        `INSERT INTO xeivora_password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [record.id, record.userId, record.tokenHash, record.expiresAt, record.createdAt]
      );
    });
  }

  return token;
}

async function consumePasswordReset(token, nextPassword) {
  if (!token || !nextPassword || nextPassword.length < 8) {
    const error = new Error("A valid reset token and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashToken(token);
  const nextHash = hashPassword(nextPassword);

  if (!isDatabaseConfigured()) {
    const entry = jsonStore.passwordResetTokens.find((item) => item.tokenHash === tokenHash && !item.usedAt);
    if (!entry || new Date(entry.expiresAt).getTime() <= Date.now()) {
      const error = new Error("This reset link is invalid or expired.");
      error.statusCode = 400;
      throw error;
    }

    const user = jsonStore.users.find((item) => item.id === entry.userId);
    if (!user) {
      const error = new Error("Unable to find the matching account.");
      error.statusCode = 404;
      throw error;
    }

    user.passwordHash = nextHash;
    user.provider = "password";
    user.updatedAt = now();
    entry.usedAt = now();
    saveStore(jsonStore);
    return toPublicUser(user);
  }

  await ensureAuthSchema();
  const result = await query(
    `SELECT r.id, r.user_id, r.expires_at, r.used_at
     FROM xeivora_password_reset_tokens r
     WHERE r.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  const record = result.rows[0];
  if (!record || record.used_at) {
    const error = new Error("This reset link is invalid or expired.");
    error.statusCode = 400;
    throw error;
  }

  const expiresAt = record.expires_at instanceof Date ? record.expires_at.getTime() : new Date(record.expires_at).getTime();
  if (expiresAt <= Date.now()) {
    const error = new Error("This reset link is invalid or expired.");
    error.statusCode = 400;
    throw error;
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE xeivora_users
       SET password_hash = $2, provider = 'password', updated_at = NOW()
       WHERE id = $1`,
      [record.user_id, nextHash]
    );
    await client.query(`UPDATE xeivora_password_reset_tokens SET used_at = NOW() WHERE id = $1`, [record.id]);
  });

  const user = await findUserRowById(record.user_id);
  return mapUserRow(user);
}

module.exports = {
  createSession,
  createUser,
  findUserByEmail,
  getSessionByToken,
  requestPasswordReset,
  revokeSessionByToken,
  updateUserProfile,
  upsertGoogleUser,
  verifyUserCredentials,
  consumePasswordReset
};
