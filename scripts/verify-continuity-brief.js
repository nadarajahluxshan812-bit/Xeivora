// Verifies the deterministic "Continue Project" briefing generator.
// Run: node scripts/verify-continuity-brief.js
const assert = require("assert");
const { buildProjectBrief } = require("../lib/server/continuity-brief");

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

const now = Date.now();
const iso = (msAgo) => new Date(now - msAgo).toISOString();

// 1. Rich project: every section should be populated from real records.
const rich = buildProjectBrief({
  project: { id: "p1", name: "Acme API", description: "Billing service", createdAt: iso(9e8), updatedAt: iso(36e5) },
  chats: [
    { id: "c1", title: "Design auth flow", updatedAt: iso(36e5) },
    { id: "c2", title: "Add Stripe webhook", updatedAt: iso(72e5) }
  ],
  files: [{ id: "f1", name: "schema.sql", updatedAt: iso(50e5) }],
  previews: [
    { id: "pv2", versionNumber: 2, title: "Checkout page", status: "deploy_ready", updatedAt: iso(20e5) },
    { id: "pv1", versionNumber: 1, title: "Landing", status: "approved", updatedAt: iso(80e5) }
  ],
  memory: [
    { id: "m1", section: "requirements", title: "PCI compliant", content: "Use Stripe" },
    { id: "m2", section: "decisions", title: "Postgres over Mongo", content: "Relational needs" },
    { id: "m3", section: "architecture", title: "Modular monolith" }
  ],
  repo: { id: "r1", fullName: "acme/api", createdAt: iso(85e5) },
  vercel: { id: "v1", name: "acme-api", createdAt: iso(84e5) },
  deployments: [
    { id: "d1", target: "production", state: "READY", url: "https://acme.app", updatedAt: iso(40e5) },
    { id: "d2", target: "preview", state: "ERROR", url: "https://x.vercel.app", updatedAt: iso(30e5) }
  ]
});

check("summary mentions project name + counts", () => {
  assert.ok(rich.summary.includes("Acme API"), "name");
  assert.ok(/2 chats/.test(rich.summary), "chat count");
});
check("completed includes repo, vercel, deploy, approved preview, decision", () => {
  const titles = rich.completed.map((c) => c.title).join(" | ");
  assert.ok(/Connected GitHub repo acme\/api/.test(titles), "repo");
  assert.ok(/Production deployment succeeded/.test(titles), "deploy");
  assert.ok(/Approved preview v1/.test(titles), "approved preview");
  assert.ok(/Decision locked in: Postgres over Mongo/.test(titles), "decision");
});
check("pending includes deploy-ready preview + open requirement", () => {
  const titles = rich.pending.map((p) => p.title).join(" | ");
  assert.ok(/Preview v2 is deploy-ready/.test(titles), "deploy-ready");
  assert.ok(/Open requirement: PCI compliant/.test(titles), "requirement");
});
check("blockers surfaces the failed deployment", () => {
  assert.ok(rich.blockers.some((b) => /Preview deployment failed/.test(b.title)), "failed deploy");
});
check("nextActions are concrete and capped at 4", () => {
  assert.ok(rich.nextActions.length >= 1 && rich.nextActions.length <= 4, "count");
  assert.ok(rich.nextActions.some((a) => /deploy preview v2/.test(a.title)), "deploy action");
});
check("contextPackage carries structured memory + repo", () => {
  assert.equal(rich.contextPackage.repo, "acme/api");
  assert.equal(rich.contextPackage.decisions[0].title, "Postgres over Mongo");
  assert.equal(rich.contextPackage.production, "https://acme.app");
});

// 2. Empty project: must be honest, not fabricated, and never crash.
const empty = buildProjectBrief({ project: { id: "p0", name: "Fresh", createdAt: iso(1000) } });
check("empty project has honest empty sections", () => {
  assert.equal(empty.completed.length, 0);
  assert.equal(empty.pending.length, 0);
  assert.equal(empty.blockers.length, 0);
  assert.ok(empty.summary.includes("Fresh"));
});
check("empty project still suggests a concrete next action", () => {
  assert.ok(empty.nextActions.length >= 1, "has next action");
  assert.ok(/Connect a GitHub repository|Start a new chat/.test(empty.nextActions[0].title));
});

// 3. Malformed input must not throw.
check("handles undefined input without throwing", () => {
  const b = buildProjectBrief();
  assert.ok(b.summary.length > 0);
  assert.ok(Array.isArray(b.completed));
});

if (failures) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll continuity-brief checks passed");
