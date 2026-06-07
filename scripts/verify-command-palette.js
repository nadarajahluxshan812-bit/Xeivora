// Verifies the pure command-palette core (grouping, ranking, action filtering).
// Run: node scripts/verify-command-palette.js
const assert = require("assert");
const {
  CATEGORY_ORDER,
  groupResults,
  matchStaticActions,
  continueProjectMatches
} = require("../lib/command-palette-core");

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`FAIL  ${name} -> ${err.message}`);
  }
}

const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

const results = [
  { id: "tl1", category: "timeline", title: "Preview v3 generated", updatedAt: iso(1000) },
  { id: "p-other", category: "project", title: "Side Project", updatedAt: iso(9000) },
  { id: "c1", category: "chat", title: "OAuth discussion", updatedAt: iso(2000) },
  { id: "p-cur", category: "project", title: "Xeivora", updatedAt: iso(8000) },
  { id: "m1", category: "memory", title: "Caching note", updatedAt: iso(3000) },
  { id: "d1", category: "decision", title: "PostgreSQL decision", updatedAt: iso(4000) },
  { id: "f1", category: "file", title: "memory.ts", updatedAt: iso(1500) }
];

check("groups appear in CATEGORY_ORDER priority", () => {
  const groups = groupResults(results, "p-cur");
  const order = groups.map((g) => g.category);
  // project, chat, file, memory, decision, timeline (task absent)
  assert.deepEqual(order, ["project", "chat", "file", "memory", "decision", "timeline"]);
});

check("current project is pinned first within Projects", () => {
  const groups = groupResults(results, "p-cur");
  const projects = groups.find((g) => g.category === "project");
  assert.equal(projects.items[0].id, "p-cur", "current project first");
  assert.equal(projects.items[1].id, "p-other", "other project after");
});

check("decisions are a separate group from memory", () => {
  const groups = groupResults(results, null);
  assert.ok(groups.find((g) => g.category === "decision"), "decision group exists");
  assert.ok(groups.find((g) => g.category === "memory"), "memory group exists");
});

check("unknown category falls back to task bucket", () => {
  const groups = groupResults([{ id: "x", category: "weird", title: "?" }], null);
  assert.equal(groups[0].category, "task");
});

check("empty results yield no groups", () => {
  assert.equal(groupResults([], null).length, 0);
  assert.equal(groupResults(undefined, null).length, 0);
});

const actions = [
  { id: "new-chat", label: "New Chat", keywords: "conversation message" },
  { id: "create-project", label: "Create Project", keywords: "new" },
  { id: "open-files", label: "Open Files", keywords: "documents" }
];

check("matchStaticActions returns all when query empty", () => {
  assert.equal(matchStaticActions(actions, "").length, 3);
});

check("matchStaticActions filters by label + keywords", () => {
  assert.deepEqual(matchStaticActions(actions, "chat").map((a) => a.id), ["new-chat"]);
  assert.deepEqual(matchStaticActions(actions, "documents").map((a) => a.id), ["open-files"]);
});

const projects = [
  { id: "p-cur", name: "Xeivora", updatedAt: iso(8000) },
  { id: "p2", name: "Acme API", updatedAt: iso(2000) }
];

check("continueProjectMatches surfaces current project when query empty", () => {
  const m = continueProjectMatches(projects, "", "p-cur");
  assert.equal(m.length, 1);
  assert.equal(m[0].id, "p-cur");
});

check("'continue xeivora' matches the Xeivora project", () => {
  const m = continueProjectMatches(projects, "continue xeivora", null);
  assert.equal(m[0].id, "p-cur");
});

check("plain name query matches project for Continue action", () => {
  const m = continueProjectMatches(projects, "acme", null);
  assert.equal(m[0].id, "p2");
});

assert.ok(Array.isArray(CATEGORY_ORDER) && CATEGORY_ORDER.length >= 6);

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll command-palette checks passed");
