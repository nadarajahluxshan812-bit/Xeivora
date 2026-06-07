// Deterministic "Continue Project" briefing.
//
// Builds the six sections Xeivora promises (Summary, Completed, Pending,
// Blockers, Suggested Next Actions, Context Package) purely from real,
// project-scoped records. No LLM, no API keys, no fabricated data — every
// line is derived from something the project actually has, so the briefing
// always works and never lies. Empty sections are reported honestly.

function toTime(value) {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function relativeTime(value) {
  const then = toTime(value);
  if (!then) {
    return "unknown";
  }
  const diff = Date.now() - then;
  if (diff < 0) {
    return "just now";
  }
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function bySection(memory, section) {
  return (Array.isArray(memory) ? memory : []).filter(
    (item) => String(item.section || "").toLowerCase() === section
  );
}

function memoryEntry(item) {
  return {
    title: String(item.title || "Untitled").trim(),
    content: String(item.content || "").trim()
  };
}

// raw = { project, chats, files, previews, memory, repo, vercel, deployments }
function buildProjectBrief(raw = {}) {
  const project = raw.project || {};
  const chats = Array.isArray(raw.chats) ? raw.chats : [];
  const files = Array.isArray(raw.files) ? raw.files : [];
  const previews = Array.isArray(raw.previews) ? raw.previews : [];
  const memory = Array.isArray(raw.memory) ? raw.memory : [];
  const deployments = Array.isArray(raw.deployments) ? raw.deployments : [];
  const repo = raw.repo || null;
  const vercel = raw.vercel || null;

  const sortedChats = [...chats].sort(
    (a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt)
  );
  const sortedFiles = [...files].sort(
    (a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt)
  );
  const sortedPreviews = [...previews].sort((a, b) => (b.versionNumber || 0) - (a.versionNumber || 0));

  const succeededDeploys = deployments.filter((d) => String(d.state || "").toUpperCase() === "READY");
  const failedDeploys = deployments.filter((d) =>
    ["ERROR", "CANCELED"].includes(String(d.state || "").toUpperCase())
  );
  const buildingDeploys = deployments.filter((d) => String(d.state || "").toUpperCase() === "BUILDING");
  const approvedPreviews = sortedPreviews.filter((p) => p.status === "approved");
  const deployReadyPreviews = sortedPreviews.filter((p) => p.status === "deploy_ready");
  const unreviewedPreviews = sortedPreviews.filter(
    (p) => p.status !== "approved" && p.status !== "deploy_ready"
  );

  const requirements = bySection(memory, "requirements");
  const decisions = bySection(memory, "decisions");
  const constraints = bySection(memory, "constraints");
  const architecture = bySection(memory, "architecture");
  const goals = bySection(memory, "goals");
  const facts = bySection(memory, "facts");

  const lastActivity =
    raw.lastActivity ||
    sortedChats[0]?.updatedAt ||
    sortedFiles[0]?.updatedAt ||
    project.updatedAt ||
    project.createdAt ||
    null;

  // ---- Summary -----------------------------------------------------------
  const summaryParts = [];
  const headline = project.name ? String(project.name).trim() : "This project";
  summaryParts.push(
    `${headline}${project.description ? ` — ${String(project.description).trim()}` : ""}.`
  );
  summaryParts.push(`Last active ${relativeTime(lastActivity)}.`);
  const inventory = [
    plural(chats.length, "chat"),
    plural(files.length, "file"),
    plural(previews.length, "preview version"),
    plural(memory.length, "memory entry")
  ];
  summaryParts.push(`Contains ${inventory.join(", ")}.`);
  if (sortedChats[0]?.title) {
    summaryParts.push(`Most recent thread: "${String(sortedChats[0].title).trim()}".`);
  }
  const summary = summaryParts.join(" ");

  // ---- Completed ---------------------------------------------------------
  const completed = [];
  if (repo && (repo.fullName || repo.name)) {
    completed.push({ title: `Connected GitHub repo ${repo.fullName || repo.name}`, at: repo.createdAt });
  }
  if (vercel && (vercel.name || vercel.id)) {
    completed.push({ title: `Linked Vercel project ${vercel.name || vercel.id}`, at: vercel.createdAt });
  }
  for (const d of succeededDeploys) {
    const target = d.target === "production" ? "Production" : "Preview";
    completed.push({ title: `${target} deployment succeeded`, at: d.updatedAt || d.createdAt, href: d.url });
  }
  for (const p of approvedPreviews.slice(0, 3)) {
    completed.push({ title: `Approved preview v${p.versionNumber}: ${p.title || "checkpoint"}`, at: p.updatedAt || p.createdAt });
  }
  for (const decision of decisions.slice(0, 3)) {
    completed.push({ title: `Decision locked in: ${memoryEntry(decision).title}` });
  }
  completed.sort((a, b) => toTime(b.at) - toTime(a.at));

  // ---- Pending -----------------------------------------------------------
  const pending = [];
  for (const p of deployReadyPreviews) {
    pending.push({ title: `Preview v${p.versionNumber} is deploy-ready: ${p.title || "checkpoint"}` });
  }
  for (const p of unreviewedPreviews.slice(0, 3)) {
    pending.push({ title: `Preview v${p.versionNumber} awaiting review: ${p.title || "checkpoint"}` });
  }
  for (const req of requirements.slice(0, 5)) {
    pending.push({ title: `Open requirement: ${memoryEntry(req).title}` });
  }
  for (const d of buildingDeploys) {
    const target = d.target === "production" ? "Production" : "Preview";
    pending.push({ title: `${target} build in progress` });
  }

  // ---- Blockers ----------------------------------------------------------
  const blockers = [];
  for (const d of failedDeploys) {
    const target = d.target === "production" ? "Production" : "Preview";
    blockers.push({ title: `${target} deployment failed${d.url ? ` (${d.url})` : ""}` });
  }

  // ---- Suggested Next Actions -------------------------------------------
  const nextActions = [];
  if (deployReadyPreviews[0]) {
    nextActions.push({ title: `Review and deploy preview v${deployReadyPreviews[0].versionNumber}` });
  }
  if (failedDeploys.length) {
    nextActions.push({ title: "Investigate the failed deployment and redeploy" });
  }
  if (requirements.length) {
    nextActions.push({ title: `Work through ${plural(requirements.length, "open requirement")}` });
  }
  if (!repo) {
    nextActions.push({ title: "Connect a GitHub repository for version control" });
  }
  if (sortedChats[0]?.title) {
    nextActions.push({ title: `Resume the latest chat: "${String(sortedChats[0].title).trim()}"` });
  }
  if (!nextActions.length) {
    nextActions.push({ title: "Start a new chat to continue building this project" });
  }
  const dedupedNextActions = [];
  const seen = new Set();
  for (const action of nextActions) {
    if (!seen.has(action.title)) {
      seen.add(action.title);
      dedupedNextActions.push(action);
    }
    if (dedupedNextActions.length >= 4) {
      break;
    }
  }

  // ---- Context Package ---------------------------------------------------
  const contextPackage = {
    goals: goals.map(memoryEntry),
    requirements: requirements.map(memoryEntry),
    decisions: decisions.map(memoryEntry),
    constraints: constraints.map(memoryEntry),
    architecture: architecture.map(memoryEntry),
    facts: facts.map(memoryEntry),
    repo: repo ? repo.fullName || repo.name || null : null,
    production: succeededDeploys.find((d) => d.target === "production")?.url || null,
    recentFiles: sortedFiles.slice(0, 5).map((f) => String(f.name || "file")),
    recentChats: sortedChats.slice(0, 3).map((c) => String(c.title || "Untitled chat")),
    lastActivity
  };

  return {
    summary,
    completed,
    pending,
    blockers,
    nextActions: dedupedNextActions,
    contextPackage,
    generatedAt: new Date().toISOString()
  };
}

module.exports = { buildProjectBrief, relativeTime };
