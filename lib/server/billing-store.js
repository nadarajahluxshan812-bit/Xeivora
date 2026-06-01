const fs = require("node:fs");
const path = require("node:path");

const { isDatabaseConfigured, query, withTransaction } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-billing-store.json");
const DEFAULT_STORE = {
  profiles: [],
  processedCheckoutSessions: [],
  processedWebhookEvents: []
};

let schemaReadyPromise;
const jsonStore = isDatabaseConfigured() ? null : loadStore();

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
  try {
    const raw = fs.readFileSync(storeFile, "utf8").trim();
    const parsed = raw ? JSON.parse(raw) : DEFAULT_STORE;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
      processedCheckoutSessions: Array.isArray(parsed.processedCheckoutSessions)
        ? parsed.processedCheckoutSessions
        : [],
      processedWebhookEvents: Array.isArray(parsed.processedWebhookEvents) ? parsed.processedWebhookEvents : []
    };
  } catch {
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
    return structuredClone(DEFAULT_STORE);
  }
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

async function ensureBillingSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS xeivora_billing_profiles (
      user_id TEXT PRIMARY KEY REFERENCES xeivora_users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT UNIQUE,
      stripe_subscription_id TEXT,
      stripe_subscription_status TEXT,
      credits INTEGER NOT NULL DEFAULT 0,
      last_checkout_session_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS xeivora_billing_processed_events (
      event_key TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await schemaReadyPromise;
}

function normalizeProfile(row) {
  if (!row) {
    return {
      userId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      credits: 0,
      lastCheckoutSessionId: null,
      createdAt: null,
      updatedAt: null
    };
  }

  return {
    userId: row.userId || row.user_id,
    stripeCustomerId: row.stripeCustomerId || row.stripe_customer_id || null,
    stripeSubscriptionId: row.stripeSubscriptionId || row.stripe_subscription_id || null,
    stripeSubscriptionStatus: row.stripeSubscriptionStatus || row.stripe_subscription_status || null,
    credits: Number(row.credits || 0),
    lastCheckoutSessionId: row.lastCheckoutSessionId || row.last_checkout_session_id || null,
    createdAt:
      row.createdAt || (row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at) || null,
    updatedAt:
      row.updatedAt || (row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at) || null
  };
}

async function getBillingProfile(userId) {
  if (!userId) {
    return normalizeProfile(null);
  }

  if (!isDatabaseConfigured()) {
    const profile = jsonStore.profiles.find((entry) => entry.userId === userId);
    return normalizeProfile(profile || { userId });
  }

  await ensureBillingSchema();
  const result = await query(`SELECT * FROM xeivora_billing_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
  return normalizeProfile(result.rows[0] || { user_id: userId });
}

async function getBillingProfileByCustomerId(customerId) {
  if (!customerId) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const profile = jsonStore.profiles.find((entry) => entry.stripeCustomerId === customerId);
    return profile ? normalizeProfile(profile) : null;
  }

  await ensureBillingSchema();
  const result = await query(`SELECT * FROM xeivora_billing_profiles WHERE stripe_customer_id = $1 LIMIT 1`, [customerId]);
  return result.rows[0] ? normalizeProfile(result.rows[0]) : null;
}

async function upsertBillingProfile(userId, updates = {}) {
  if (!userId) {
    throw new Error("A user id is required.");
  }

  if (!isDatabaseConfigured()) {
    const existing = jsonStore.profiles.find((entry) => entry.userId === userId);
    const timestamp = now();
    const next = existing || {
      userId,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: null,
      credits: 0,
      lastCheckoutSessionId: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    if (!existing) {
      jsonStore.profiles.unshift(next);
    }

    Object.assign(next, updates, { updatedAt: timestamp });
    saveStore(jsonStore);
    return normalizeProfile(next);
  }

  await ensureBillingSchema();
  const current = await getBillingProfile(userId);
  const next = {
    stripeCustomerId:
      updates.stripeCustomerId === undefined ? current.stripeCustomerId : updates.stripeCustomerId,
    stripeSubscriptionId:
      updates.stripeSubscriptionId === undefined ? current.stripeSubscriptionId : updates.stripeSubscriptionId,
    stripeSubscriptionStatus:
      updates.stripeSubscriptionStatus === undefined
        ? current.stripeSubscriptionStatus
        : updates.stripeSubscriptionStatus,
    credits: updates.credits === undefined ? current.credits : updates.credits,
    lastCheckoutSessionId:
      updates.lastCheckoutSessionId === undefined ? current.lastCheckoutSessionId : updates.lastCheckoutSessionId
  };

  const timestamp = now();
  const result = await query(
    `INSERT INTO xeivora_billing_profiles
      (user_id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, credits, last_checkout_session_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
     ON CONFLICT (user_id)
     DO UPDATE SET
       stripe_customer_id = EXCLUDED.stripe_customer_id,
       stripe_subscription_id = EXCLUDED.stripe_subscription_id,
       stripe_subscription_status = EXCLUDED.stripe_subscription_status,
       credits = EXCLUDED.credits,
       last_checkout_session_id = EXCLUDED.last_checkout_session_id,
       updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [
      userId,
      next.stripeCustomerId,
      next.stripeSubscriptionId,
      next.stripeSubscriptionStatus,
      next.credits,
      next.lastCheckoutSessionId,
      timestamp
    ]
  );

  return normalizeProfile(result.rows[0]);
}

async function addCredits(userId, amount, lastCheckoutSessionId = null) {
  const current = await getBillingProfile(userId);
  return upsertBillingProfile(userId, {
    credits: current.credits + amount,
    lastCheckoutSessionId: lastCheckoutSessionId || current.lastCheckoutSessionId
  });
}

async function markProcessedEvent(eventKey) {
  if (!eventKey) {
    return false;
  }

  if (!isDatabaseConfigured()) {
    if (jsonStore.processedWebhookEvents.includes(eventKey) || jsonStore.processedCheckoutSessions.includes(eventKey)) {
      return false;
    }

    if (eventKey.startsWith("evt_")) {
      jsonStore.processedWebhookEvents.unshift(eventKey);
    } else {
      jsonStore.processedCheckoutSessions.unshift(eventKey);
    }
    saveStore(jsonStore);
    return true;
  }

  await ensureBillingSchema();
  const result = await query(
    `INSERT INTO xeivora_billing_processed_events (event_key)
     VALUES ($1)
     ON CONFLICT (event_key) DO NOTHING
     RETURNING event_key`,
    [eventKey]
  );
  return Boolean(result.rows[0]);
}

async function hasProcessedEvent(eventKey) {
  if (!eventKey) {
    return false;
  }

  if (!isDatabaseConfigured()) {
    return jsonStore.processedWebhookEvents.includes(eventKey) || jsonStore.processedCheckoutSessions.includes(eventKey);
  }

  await ensureBillingSchema();
  const result = await query(`SELECT 1 FROM xeivora_billing_processed_events WHERE event_key = $1 LIMIT 1`, [eventKey]);
  return Boolean(result.rows[0]);
}

async function finalizeCheckoutSession({
  sessionId,
  userId,
  customerId,
  mode,
  subscriptionId = null,
  subscriptionStatus = null,
  planKey = null,
  creditAmount = 0
}) {
  const firstTime = await markProcessedEvent(sessionId);
  const current = await getBillingProfile(userId);

  const updates = {
    stripeCustomerId: customerId || current.stripeCustomerId,
    stripeSubscriptionId: subscriptionId === undefined ? current.stripeSubscriptionId : subscriptionId,
    stripeSubscriptionStatus:
      subscriptionStatus === undefined ? current.stripeSubscriptionStatus : subscriptionStatus,
    credits: current.credits,
    lastCheckoutSessionId: sessionId
  };

  if (mode === "payment" && firstTime && creditAmount > 0) {
    updates.credits = current.credits + creditAmount;
  }

  const profile = await upsertBillingProfile(userId, updates);
  return {
    firstTime,
    profile,
    planKey
  };
}

async function setSubscriptionStatusByCustomer(customerId, subscriptionId, subscriptionStatus) {
  const profile = await getBillingProfileByCustomerId(customerId);
  if (!profile?.userId) {
    return null;
  }

  return upsertBillingProfile(profile.userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subscriptionStatus
  });
}

async function clearSubscriptionByCustomer(customerId) {
  const profile = await getBillingProfileByCustomerId(customerId);
  if (!profile?.userId) {
    return null;
  }

  return upsertBillingProfile(profile.userId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: "cancelled"
  });
}

module.exports = {
  addCredits,
  clearSubscriptionByCustomer,
  finalizeCheckoutSession,
  getBillingProfile,
  getBillingProfileByCustomerId,
  hasProcessedEvent,
  markProcessedEvent,
  setSubscriptionStatusByCustomer,
  upsertBillingProfile
};
