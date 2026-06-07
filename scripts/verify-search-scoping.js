#!/usr/bin/env node
/**
 * Deterministic verification for ownership-scoped global search.
 *
 * The repo has no test runner, so this is a self-contained integration check.
 * It runs against the JSON-backed stores (no DATABASE_URL) inside an isolated
 * working directory, seeds two owners + a legacy owner-less project, attaches a
 * chat/file/memory to each, then asserts that searchWorkspace() returns only
 * records the viewer owns (plus legacy owner-less records). It also verifies
 * the viewer's own project-less chat is searchable, which ownership-based
 * scoping surfaces but the earlier project-membership rule wrongly hid.
 *
 * Usage: node scripts/verify-search-scoping.js
 * (re-execs itself in a fresh temp cwd so it never touches the repo's data/).
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const REPO_ROOT = path.join(__dirname, "..");
const MARKER = "__SEARCH_SCOPING_CHILD__";

// Re-exec once in an isolated temp dir so the JSON stores (which key off
// process.cwd()) write there instead of polluting the repo's data/ directory.
if (!process.env[MARKER]) {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "xeivora-search-verify-"));
  const result = spawnSync(process.execPath, [__filename], {
    cwd: workdir,
    stdio: "inherit",
    env: { ...process.env, [MARKER]: "1", DATABASE_URL: "", DATABASE_PUBLIC_URL: "" }
  });
  fs.rmSync(workdir, { recursive: true, force: true });
  process.exit(result.status === null ? 1 : result.status);
}

const ws = require(path.join(REPO_ROOT, "lib/server/workspace-store"));
const chat = require(path.join(REPO_ROOT, "lib/server/chat-store"));
const mvp = require(path.join(REPO_ROOT, "lib/server/mvp-store"));

const OWNER_A = "viewer-a";
const OWNER_B = "viewer-b";
const TOKEN = `scopetok${Date.now()}`;

let failures = 0;
function check(label, condition) {
  const ok = Boolean(condition);
  if (!ok) {
    failures += 1;
  }
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
}

async function seedProject(ownerId, label) {
  const project = await ws.createProject({ name: `${label} ${TOKEN}`, ownerId });
  const session = await chat.createSession({ projectId: project.id, ownerId });
  await chat.updateSessionMetadata(session.id, { title: `Chat ${label} ${TOKEN}` });
  await ws.createUploadedFile({ name: `file-${label}-${TOKEN}.txt`, projectId: project.id, ownerId, storagePath: "x" });
  await mvp.create("memory", { title: `Memory ${label} ${TOKEN}`, content: "note", projectId: project.id, ownerId });
  return project;
}

function idsByCategory(results, category) {
  return results.filter((r) => r.category === category).map((r) => r.id);
}

async function main() {
  const projectA = await seedProject(OWNER_A, "Alpha");
  const projectB = await seedProject(OWNER_B, "Bravo");
  const projectLegacy = await seedProject(null, "Legacy"); // owner-less

  // A owns a chat that belongs to NO project. Owner-based scoping must still
  // surface it to A (the previous project-membership rule wrongly hid it).
  const looseSession = await chat.createSession({ ownerId: OWNER_A });
  await chat.updateSessionMetadata(looseSession.id, { title: `Loose Alpha ${TOKEN}` });

  // Viewer A searches: should see only records A owns + legacy owner-less ones.
  const resultsA = await ws.searchWorkspace(TOKEN, { viewerId: OWNER_A });
  const projectIdsA = idsByCategory(resultsA, "project");

  check("A sees own project", projectIdsA.includes(projectA.id));
  check("A sees legacy owner-less project", projectIdsA.includes(projectLegacy.id));
  check("A does NOT see B's project", !projectIdsA.includes(projectB.id));
  check("A sees own project-less chat", idsByCategory(resultsA, "chat").includes(looseSession.id));

  // No result of any category may reference B's owned data.
  const allHrefsA = JSON.stringify(resultsA);
  check("A's results contain own + legacy chats", idsByCategory(resultsA, "chat").length >= 2);
  check("A leaks no 'Bravo' title", !allHrefsA.includes("Bravo"));
  check("A sees 'Alpha' + 'Legacy' content", allHrefsA.includes("Alpha") && allHrefsA.includes("Legacy"));

  // Every returned chat must be owned by A or be owner-less (legacy).
  const sessionsA = await chat.listSessions({ includeArchived: true });
  const sessionOwner = new Map(sessionsA.map((s) => [s.id, s.ownerId ?? null]));
  const strayChat = idsByCategory(resultsA, "chat").find((id) => {
    const owner = sessionOwner.get(id);
    return owner !== null && owner !== OWNER_A;
  });
  check("A's chat results are all owned by A or owner-less", !strayChat);

  // Viewer B searches: mirror assertions.
  const resultsB = await ws.searchWorkspace(TOKEN, { viewerId: OWNER_B });
  const projectIdsB = idsByCategory(resultsB, "project");
  check("B sees own project", projectIdsB.includes(projectB.id));
  check("B sees legacy owner-less project", projectIdsB.includes(projectLegacy.id));
  check("B does NOT see A's project", !projectIdsB.includes(projectA.id));
  check("B does NOT see A's project-less chat", !idsByCategory(resultsB, "chat").includes(looseSession.id));
  check("B leaks no 'Alpha' title", !JSON.stringify(resultsB).includes("Alpha"));

  // Unauthenticated-style call (no viewerId): legacy-only, never an owned project.
  const resultsAnon = await ws.searchWorkspace(TOKEN, {});
  const projectIdsAnon = idsByCategory(resultsAnon, "project");
  check("anon sees only legacy project", projectIdsAnon.length === 1 && projectIdsAnon[0] === projectLegacy.id);
  check("anon leaks no owned-project titles", !JSON.stringify(resultsAnon).match(/Alpha|Bravo/));

  console.log(failures === 0 ? "\nAll search-scoping checks passed." : `\n${failures} check(s) FAILED.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
