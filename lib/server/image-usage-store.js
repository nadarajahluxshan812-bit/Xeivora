const fs = require("node:fs");
const path = require("node:path");

const { isDatabaseConfigured, query } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-image-usage.json");
const DEFAULT_STORE = {
  usage: []
};

let schemaReadyPromise;

function usageDateKey(date = new Date()) {
  return new Date(date).toISOString().slice(0, 10);
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
      usage: Array.isArray(parsed.usage) ? parsed.usage : []
    };
  } catch {
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
    return structuredClone(DEFAULT_STORE);
  }
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

const jsonStore = isDatabaseConfigured() ? null : loadStore();

async function ensureImageUsageSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS image_usage (
      user_id TEXT NOT NULL REFERENCES xeivora_users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, usage_date)
    );
  `);

  await schemaReadyPromise;
}

async function getDailyImageUsage(userId, usageDate = usageDateKey()) {
  if (!userId) {
    return 0;
  }

  const dateKey = usageDateKey(usageDate);

  if (!isDatabaseConfigured()) {
    const row = jsonStore.usage.find((entry) => entry.userId === userId && entry.usageDate === dateKey);
    return Number(row?.count || 0);
  }

  await ensureImageUsageSchema();
  const result = await query(`SELECT count FROM image_usage WHERE user_id = $1 AND usage_date = $2 LIMIT 1`, [userId, dateKey]);
  return Number(result.rows[0]?.count || 0);
}

async function addDailyImageUsage(userId, amount, usageDate = usageDateKey()) {
  if (!userId || !amount) {
    return 0;
  }

  const dateKey = usageDateKey(usageDate);

  if (!isDatabaseConfigured()) {
    const existing = jsonStore.usage.find((entry) => entry.userId === userId && entry.usageDate === dateKey);
    if (existing) {
      existing.count = Number(existing.count || 0) + amount;
      saveStore(jsonStore);
      return existing.count;
    }

    jsonStore.usage.unshift({
      userId,
      usageDate: dateKey,
      count: amount
    });
    saveStore(jsonStore);
    return amount;
  }

  await ensureImageUsageSchema();
  const result = await query(
    `INSERT INTO image_usage (user_id, usage_date, count)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET
       count = image_usage.count + EXCLUDED.count,
       updated_at = NOW()
     RETURNING count`,
    [userId, dateKey, amount]
  );

  return Number(result.rows[0]?.count || 0);
}

module.exports = {
  addDailyImageUsage,
  getDailyImageUsage,
  usageDateKey
};
