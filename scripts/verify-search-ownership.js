// Verifies ownership scoping of the global search result builder.
// Run: node scripts/verify-search-ownership.js
const assert = require("assert");
const { buildScopedResults, visibleProjectIdSet, inVisibleProjects } = require("../lib/search-scope");

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

// Viewer "alice" can see: her project p-alice + legacy owner-less p-legacy.
// She must NEVER see bob's project p-bob or any data tied to it.
const visibleProjects = [
  { id: "p-alice", name: "Alice API", description: "alpha service", updatedAt: "2026-01-03" },
  { id: "p-legacy", name: "Legacy app", description: "alpha legacy", updatedAt: "2026-01-02" }
];

const sessions = [
  { id: "s-alice", projectId: "p-alice", title: "alpha auth chat", preview: "x", updatedAt: "2026-01-05" },
  { id: "s-bob", projectId: "p-bob", title: "alpha secret chat", preview: "x", updatedAt: "2026-01-06" },
  { id: "s-orphan", projectId: null, title: "alpha orphan chat", preview: "x", updatedAt: "2026-01-07" }
];
const files = [
  { id: "f-alice", projectId: "p-alice", name: "alpha.ts", updatedAt: "2026-01-04" },
  { id: "f-bob", projectId: "p-bob", name: "alpha-secret.ts", updatedAt: "2026-01-04" }
];
const memories = [
  { id: "m-alice", projectId: "p-alice", section: "facts", title: "alpha note", content: "x", updatedAt: "2026-01-03" },
  { id: "d-alice", projectId: "p-alice", section: "decisions", title: "alpha decision", content: "x", updatedAt: "2026-01-03" },
  { id: "m-bob", projectId: "p-bob", section: "facts", title: "alpha leak", content: "x", updatedAt: "2026-01-03" }
];
const previews = [
  { id: "pv-alice", projectId: "p-alice", versionNumber: 2, title: "alpha preview", updatedAt: "2026-01-03" },
  { id: "pv-bob", projectId: "p-bob", versionNumber: 9, title: "alpha preview", updatedAt: "2026-01-03" }
];

const out = buildScopedResults({ query: "alpha", visibleProjects, sessions, files, memories, previews });
const ids = out.map((r) => r.id);

check("includes only the viewer's visible-project rows", () => {
  assert.ok(ids.includes("p-alice"), "own project");
  assert.ok(ids.includes("p-legacy"), "legacy owner-less project");
  assert.ok(ids.includes("s-alice"), "own chat");
  assert.ok(ids.includes("f-alice"), "own file");
  assert.ok(ids.includes("m-alice"), "own memory");
  assert.ok(ids.includes("d-alice"), "own decision");
  assert.ok(ids.includes("pv-alice"), "own preview/timeline");
});

check("excludes every row tied to another user's project", () => {
  for (const leaked of ["p-bob", "s-bob", "f-bob", "m-bob", "pv-bob"]) {
    assert.ok(!ids.includes(leaked), `must not leak ${leaked}`);
  }
});

check("excludes orphan rows with no projectId", () => {
  assert.ok(!ids.includes("s-orphan"), "orphan chat excluded");
});

check("decisions remain a distinct category from memory", () => {
  assert.equal(out.find((r) => r.id === "d-alice").category, "decision");
  assert.equal(out.find((r) => r.id === "m-alice").category, "memory");
});

check("response shape is unchanged (category/title/href/projectId)", () => {
  const chat = out.find((r) => r.id === "s-alice");
  assert.equal(chat.category, "chat");
  assert.equal(chat.href, "/chat?session=s-alice");
  assert.equal(chat.projectId, "p-alice");
  assert.ok("title" in chat && "excerpt" in chat && "updatedAt" in chat);
});

check("empty query returns nothing", () => {
  assert.equal(buildScopedResults({ query: "", visibleProjects, sessions }).length, 0);
});

check("no visible projects means no project-scoped results", () => {
  const none = buildScopedResults({ query: "alpha", visibleProjects: [], sessions, files, memories, previews });
  assert.equal(none.length, 0);
});

check("visibleProjectIdSet + inVisibleProjects behave correctly", () => {
  const set = visibleProjectIdSet(visibleProjects);
  assert.ok(inVisibleProjects("p-alice", set));
  assert.ok(!inVisibleProjects("p-bob", set));
  assert.ok(!inVisibleProjects(null, set));
});

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll search-ownership checks passed");
