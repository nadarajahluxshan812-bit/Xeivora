const { Pool } = require("pg");

const globalKey = "__xeivoraPgPool";
const retryableCodes = new Set(["ECONNRESET", "ECONNREFUSED", "57P01", "57P02", "57P03"]);

function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createPool() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number.parseInt(process.env.DATABASE_POOL_MAX || "10", 10),
    idleTimeoutMillis: Number.parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || "30000", 10),
    connectionTimeoutMillis: Number.parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS || "10000", 10),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  pool.on("error", (error) => {
    console.error("[Xeivora] PostgreSQL pool error:", error instanceof Error ? error.message : error);
  });

  return pool;
}

function getPool() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  globalThis[globalKey] ||= createPool();
  return globalThis[globalKey];
}

async function resetPool() {
  const pool = globalThis[globalKey];

  if (pool) {
    try {
      await pool.end();
    } catch {
      // Ignore shutdown failures during pool reset.
    }
  }

  delete globalThis[globalKey];
}

function isRetryableDatabaseError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  return retryableCodes.has(error.code) || /terminating connection|Connection terminated unexpectedly/i.test(error.message);
}

async function runWithReconnect(action) {
  try {
    return await action(getPool());
  } catch (error) {
    if (!isRetryableDatabaseError(error)) {
      throw error;
    }

    await resetPool();
    return action(getPool());
  }
}

async function query(text, params = []) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return runWithReconnect((pool) => pool.query(text, params));
}

async function withClient(callback) {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return runWithReconnect(async (pool) => {
    const client = await pool.connect();

    try {
      return await callback(client);
    } finally {
      client.release();
    }
  });
}

async function withTransaction(callback) {
  return withClient(async (client) => {
    await client.query("BEGIN");

    try {
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

module.exports = {
  getPool,
  isDatabaseConfigured,
  query,
  resetPool,
  withClient,
  withTransaction
};
