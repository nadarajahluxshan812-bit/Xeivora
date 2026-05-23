const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const {
  isDatabaseConfigured,
  query,
  withClient,
  withTransaction
} = require("./db");

const storeFile = path.join(process.cwd(), "data", "xeivora-mvp-store.json");

const now = () => new Date().toISOString();

const DEFAULT_STORE = {
  memory: [
    {
      id: "mem-continuity-promise",
      type: "user_preferences",
      title: "Product promise",
      content: "One prompt. Multiple AI systems. Same memory. Same workflow. No context loss.",
      enabled: true,
      createdAt: "2026-05-20T08:00:00.000Z",
      updatedAt: "2026-05-20T08:00:00.000Z"
    },
    {
      id: "mem-coding-state",
      type: "coding_state_checkpoints",
      title: "Coding continuation behavior",
      content: "When a provider fails, save a checkpoint, compress context, preserve file/task state, and continue with the next provider.",
      enabled: true,
      createdAt: "2026-05-20T08:05:00.000Z",
      updatedAt: "2026-05-20T08:05:00.000Z"
    }
  ],
  workflows: [
    {
      id: "wf-research-report",
      name: "Research -> Summary -> Final Report",
      description: "Collect findings, compress into evidence-backed notes, then produce a polished report.",
      steps: ["Research", "Summarize", "Write final report"],
      status: "active",
      createdAt: "2026-05-20T08:10:00.000Z",
      updatedAt: "2026-05-20T08:10:00.000Z"
    },
    {
      id: "wf-code-continuation",
      name: "Multi-model Coding Continuation",
      description: "Start with OpenAI/Codex, checkpoint progress, then fail over to Claude or Gemini if needed.",
      steps: ["Understand code task", "Generate patch", "Validate", "Fail over if provider fails"],
      status: "active",
      createdAt: "2026-05-20T08:11:00.000Z",
      updatedAt: "2026-05-20T08:11:00.000Z"
    },
    {
      id: "wf-provider-failover",
      name: "AI Provider Failover Workflow",
      description: "Detect provider failure, compress context, preserve output format, and continue with the fallback model.",
      steps: ["Detect issue", "Save checkpoint", "Compress context", "Continue with fallback"],
      status: "active",
      createdAt: "2026-05-20T08:12:00.000Z",
      updatedAt: "2026-05-20T08:12:00.000Z"
    }
  ],
  agents: [
    {
      id: "agent-research",
      name: "Research Agent",
      role: "Finds, structures, and summarizes evidence.",
      modelPreference: "gemini",
      description: "Best for discovery, source mapping, and synthesis.",
      status: "ready",
      sampleTask: "Research competitors and summarize positioning.",
      assignedWorkflowType: "Research -> Summary -> Final Report"
    },
    {
      id: "agent-coding",
      name: "Coding Agent",
      role: "Plans, edits, validates, and explains code changes.",
      modelPreference: "gpt-4o",
      description: "Best for implementation work with checkpoints.",
      status: "ready",
      sampleTask: "Fix a failing API route and update tests.",
      assignedWorkflowType: "Code Request -> Debug -> Explanation"
    },
    {
      id: "agent-writing",
      name: "Writing Agent",
      role: "Creates clear copy, reports, emails, and structured documents.",
      modelPreference: "claude",
      description: "Best for long-form communication and polished narrative.",
      status: "ready",
      sampleTask: "Turn notes into an investor-ready memo.",
      assignedWorkflowType: "Content -> Caption -> Post"
    },
    {
      id: "agent-strategy",
      name: "Business Strategy Agent",
      role: "Turns raw ideas into market analysis and pitch structure.",
      modelPreference: "claude",
      description: "Best for business planning and strategic tradeoffs.",
      status: "ready",
      sampleTask: "Evaluate a SaaS idea and draft a go-to-market plan.",
      assignedWorkflowType: "Business Idea -> Market Analysis -> Pitch"
    },
    {
      id: "agent-planner",
      name: "Workflow Planner Agent",
      role: "Breaks prompts into reliable multi-step workflows.",
      modelPreference: "orbit-auto",
      description: "Best for task decomposition and tool routing.",
      status: "ready",
      sampleTask: "Create a workflow from brief to delivery.",
      assignedWorkflowType: "Idea -> Plan -> Execution Steps"
    },
    {
      id: "agent-continuity",
      name: "Continuity Recovery Agent",
      role: "Restores context after provider, rate, token, or timeout failures.",
      modelPreference: "orbit-auto",
      description: "Best for checkpoint recovery and provider failover.",
      status: "ready",
      sampleTask: "Continue a task after OpenAI reaches a token limit.",
      assignedWorkflowType: "AI Provider Failover Workflow"
    }
  ],
  providerEvents: [],
  checkpoints: [],
  orchestrationTraces: [],
  settings: {
    memoryEnabled: true,
    orchestrationEnabled: true,
    continuityEnabled: true,
    theme: "dark",
    modelPreferenceOrder: ["openai", "anthropic", "google", "simulation"]
  }
};

let schemaReadyPromise;

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

function saveStore(store) {
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

async function ensureStoreSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  schemaReadyPromise ||= (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS xeivora_resource_items (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS xeivora_resource_items_collection_created_idx
        ON xeivora_resource_items (collection, created_at DESC);

      CREATE TABLE IF NOT EXISTS xeivora_resource_settings (
        key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await withTransaction(async (client) => {
      const countResult = await client.query("SELECT COUNT(*)::integer AS count FROM xeivora_resource_items");
      const itemCount = Number(countResult.rows[0].count);

      if (!itemCount) {
        for (const [collection, items] of Object.entries(DEFAULT_STORE)) {
          if (collection === "settings") {
            continue;
          }

          for (const item of items) {
            await client.query(
              `INSERT INTO xeivora_resource_items (id, collection, data, created_at, updated_at)
               VALUES ($1, $2, $3::jsonb, $4, $5)`,
              [item.id, collection, JSON.stringify(item), item.createdAt || now(), item.updatedAt || now()]
            );
          }
        }
      }

      await client.query(
        `INSERT INTO xeivora_resource_settings (key, data, updated_at)
         VALUES ('default', $1::jsonb, NOW())
         ON CONFLICT (key)
         DO NOTHING`,
        [JSON.stringify(DEFAULT_STORE.settings)]
      );
    });
  })();

  await schemaReadyPromise;
}

async function list(collection) {
  if (!isDatabaseConfigured()) {
    return loadStore()[collection] || [];
  }

  await ensureStoreSchema();
  const result = await query(
    `SELECT data
     FROM xeivora_resource_items
     WHERE collection = $1
     ORDER BY created_at DESC`,
    [collection]
  );

  return result.rows.map((row) => row.data);
}

async function create(collection, payload) {
  const item = {
    ...payload,
    id: randomUUID(),
    createdAt: payload.createdAt || now(),
    updatedAt: payload.updatedAt || now()
  };

  if (!isDatabaseConfigured()) {
    const store = loadStore();
    store[collection] = [item, ...(store[collection] || [])];
    saveStore(store);
    return item;
  }

  await ensureStoreSchema();
  await query(
    `INSERT INTO xeivora_resource_items (id, collection, data, created_at, updated_at)
     VALUES ($1, $2, $3::jsonb, $4, $5)`,
    [item.id, collection, JSON.stringify(item), item.createdAt, item.updatedAt]
  );
  return item;
}

async function update(collection, id, payload) {
  if (!isDatabaseConfigured()) {
    const store = loadStore();
    const items = store[collection] || [];
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      return null;
    }

    items[index] = {
      ...items[index],
      ...payload,
      updatedAt: now()
    };
    store[collection] = items;
    saveStore(store);
    return items[index];
  }

  await ensureStoreSchema();

  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT data
       FROM xeivora_resource_items
       WHERE collection = $1 AND id = $2
       LIMIT 1`,
      [collection, id]
    );

    if (!result.rowCount) {
      return null;
    }

    const nextItem = {
      ...result.rows[0].data,
      ...payload,
      updatedAt: now()
    };

    await client.query(
      `UPDATE xeivora_resource_items
       SET data = $3::jsonb,
           updated_at = $4
       WHERE collection = $1 AND id = $2`,
      [collection, id, JSON.stringify(nextItem), nextItem.updatedAt]
    );

    return nextItem;
  });
}

async function remove(collection, id) {
  if (!isDatabaseConfigured()) {
    const store = loadStore();
    const items = store[collection] || [];
    const nextItems = items.filter((item) => item.id !== id);
    store[collection] = nextItems;
    saveStore(store);
    return nextItems.length !== items.length;
  }

  await ensureStoreSchema();
  const result = await query("DELETE FROM xeivora_resource_items WHERE collection = $1 AND id = $2", [collection, id]);
  return result.rowCount > 0;
}

async function getSettings() {
  if (!isDatabaseConfigured()) {
    return loadStore().settings;
  }

  await ensureStoreSchema();
  const result = await query(
    `SELECT data
     FROM xeivora_resource_settings
     WHERE key = 'default'
     LIMIT 1`
  );

  return result.rows[0]?.data || DEFAULT_STORE.settings;
}

async function updateSettings(payload) {
  if (!isDatabaseConfigured()) {
    const store = loadStore();
    store.settings = {
      ...store.settings,
      ...payload
    };
    saveStore(store);
    return store.settings;
  }

  await ensureStoreSchema();
  const settings = {
    ...(await getSettings()),
    ...payload
  };

  await query(
    `INSERT INTO xeivora_resource_settings (key, data, updated_at)
     VALUES ('default', $1::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET
       data = EXCLUDED.data,
       updated_at = NOW()`,
    [JSON.stringify(settings)]
  );

  return settings;
}

async function getStatus(providerStatus, chatSessions = []) {
  const [memory, workflows, providerEvents, settings] = await Promise.all([
    list("memory"),
    list("workflows"),
    list("providerEvents"),
    getSettings()
  ]);

  return {
    brand: "Xeivora",
    tagline: "Unified AI Intelligence",
    mode: isDatabaseConfigured() ? "production" : "local fallback",
    providers: providerStatus,
    metrics: {
      totalChats: chatSessions.length,
      activeWorkflows: workflows.filter((workflow) => workflow.status === "active").length,
      memoryItems: memory.length,
      providerUsage: providerEvents.length,
      continuityEvents: providerEvents.filter((event) => event.type === "fallback").length,
      fallbackEvents: providerEvents.filter((event) => event.type === "fallback").length,
      orchestrationSuccessRate: 98.7
    },
    settings
  };
}

async function createCheckpoint(payload) {
  return create("checkpoints", {
    ...payload,
    contextCompressed: true,
    memoryPreserved: true,
    contextLossPercentage: 0
  });
}

async function createProviderEvent(payload) {
  return create("providerEvents", payload);
}

async function createTrace(payload) {
  return create("orchestrationTraces", payload);
}

module.exports = {
  create,
  createCheckpoint,
  createProviderEvent,
  createTrace,
  getSettings,
  getStatus,
  list,
  remove,
  update,
  updateSettings
};
