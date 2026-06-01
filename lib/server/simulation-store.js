const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const { isDatabaseConfigured, query } = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-simulations.json");
const DEFAULT_STORE = {
  simulations: []
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
      simulations: Array.isArray(parsed.simulations) ? parsed.simulations : []
    };
  } catch {
    fs.writeFileSync(storeFile, JSON.stringify(DEFAULT_STORE, null, 2));
    return { ...DEFAULT_STORE };
  }
}

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

function shortenScenario(scenario = "") {
  const words = `${scenario}`.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.join(" ").trim() || "Untitled simulation";
}

function mapRow(row) {
  const scenario = row.scenario || "";
  return {
    id: row.id,
    userId: row.user_id || row.userId,
    scenario,
    topic: row.topic || "general",
    title: row.title || shortenScenario(scenario),
    agentsUsed: Array.isArray(row.agents_used)
      ? row.agents_used
      : Array.isArray(row.agentsUsed)
        ? row.agentsUsed
        : [],
    report: row.report || null,
    debate: row.debate || [],
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at || row.createdAt || new Date().toISOString()
  };
}

async function ensureSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= query(`
    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      scenario TEXT NOT NULL,
      topic TEXT NOT NULL DEFAULT 'general',
      title TEXT NOT NULL,
      agents_used TEXT[] NOT NULL DEFAULT '{}',
      report JSONB NOT NULL DEFAULT '{}'::jsonb,
      debate JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (id)
    );

    CREATE INDEX IF NOT EXISTS simulations_user_created_idx
      ON simulations (user_id, created_at DESC);
  `);

  await schemaReadyPromise;
}

async function listSimulations({ userId, limit = 18 } = {}) {
  if (!userId) {
    return [];
  }

  if (!isDatabaseConfigured()) {
    return jsonStore.simulations
      .filter((entry) => entry.userId === userId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, limit)
      .map((entry) => {
        const row = mapRow(entry);
        return {
          id: row.id,
          scenario: row.scenario,
          title: row.title,
          agentsUsed: row.agentsUsed,
          createdAt: row.createdAt
        };
      });
  }

  await ensureSchema();
  const result = await query(
    `SELECT id, scenario, title, agents_used, created_at
     FROM simulations
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows.map((row) => {
    const mapped = mapRow(row);
    return {
      id: mapped.id,
      scenario: mapped.scenario,
      title: mapped.title,
      agentsUsed: mapped.agentsUsed,
      createdAt: mapped.createdAt
    };
  });
}

async function getSimulationById({ id, userId } = {}) {
  if (!id || !userId) {
    return null;
  }

  if (!isDatabaseConfigured()) {
    const row = jsonStore.simulations.find((entry) => entry.id === id && entry.userId === userId);
    return row ? mapRow(row) : null;
  }

  await ensureSchema();
  const result = await query(
    `SELECT * FROM simulations WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [id, userId]
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

async function createSimulation({
  userId,
  scenario,
  topic,
  agentsUsed,
  report,
  debate
}) {
  const record = {
    id: randomUUID(),
    userId,
    scenario,
    topic,
    title: shortenScenario(scenario),
    agentsUsed: Array.isArray(agentsUsed) ? agentsUsed : [],
    report: report || {},
    debate: Array.isArray(debate) ? debate : [],
    createdAt: new Date().toISOString()
  };

  if (!isDatabaseConfigured()) {
    jsonStore.simulations.unshift(record);
    saveStore(jsonStore);
    return mapRow(record);
  }

  await ensureSchema();
  const result = await query(
    `INSERT INTO simulations (id, user_id, scenario, topic, title, agents_used, report, debate, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
     RETURNING *`,
    [
      record.id,
      record.userId,
      record.scenario,
      record.topic,
      record.title,
      record.agentsUsed,
      JSON.stringify(record.report || {}),
      JSON.stringify(record.debate || []),
      record.createdAt
    ]
  );

  return mapRow(result.rows[0]);
}

module.exports = {
  createSimulation,
  getSimulationById,
  listSimulations
};
