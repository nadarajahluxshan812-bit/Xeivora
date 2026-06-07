// Pure, ownership-aware search result builder.
//
// Given already-fetched workspace data plus the set of projects the viewer is
// allowed to see (owner-less legacy projects + projects they own), this builds
// the same response shape the command palette expects — but only ever includes
// rows that belong to a visible project. Non-project-scoped rows (no projectId)
// are excluded, so one user can never surface another user's project data.
//
// Kept free of any store/DB imports so it can be unit-tested directly.

function toMillis(value) {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

function nowIso() {
  return new Date().toISOString();
}

// Set of project ids the viewer may see, from already owner-filtered projects.
function visibleProjectIdSet(visibleProjects) {
  const set = new Set();
  for (const project of Array.isArray(visibleProjects) ? visibleProjects : []) {
    if (project && project.id) {
      set.add(project.id);
    }
  }
  return set;
}

// A row is in scope only if it is tied to a visible project.
function inVisibleProjects(projectId, visibleIds) {
  return Boolean(projectId) && visibleIds.has(projectId);
}

function buildScopedResults({
  query = "",
  visibleProjects = [],
  sessions = [],
  files = [],
  memories = [],
  previews = []
} = {}) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) {
    return [];
  }

  const visibleIds = visibleProjectIdSet(visibleProjects);
  const results = [];

  // Projects — the visible set is already ownership-filtered.
  for (const project of visibleProjects) {
    const haystack = `${project.name || ""} ${project.description || ""}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: project.id,
        category: "project",
        title: project.name,
        excerpt: project.description,
        href: "/dashboard",
        projectId: project.id,
        updatedAt: project.updatedAt
      });
    }
  }

  // Chats / sessions — scoped to a visible project.
  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!inVisibleProjects(session.projectId, visibleIds)) {
      continue;
    }
    const haystack = `${session.title || ""} ${session.preview || ""}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: session.id,
        category: "chat",
        title: session.title,
        excerpt: session.preview,
        href: `/chat?session=${session.id}`,
        projectId: session.projectId,
        updatedAt: session.updatedAt
      });
    }
  }

  // Files — scoped to a visible project.
  for (const file of Array.isArray(files) ? files : []) {
    if (!inVisibleProjects(file.projectId, visibleIds)) {
      continue;
    }
    const haystack = `${file.name || ""} ${file.previewText || ""} ${file.summary || ""}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: file.id,
        category: "file",
        title: file.name,
        excerpt: file.summary || file.previewText || "Uploaded workspace file",
        href: file.sessionId ? `/chat?session=${file.sessionId}` : "/chat",
        projectId: file.projectId,
        updatedAt: file.updatedAt
      });
    }
  }

  // Memory + Decisions — scoped to a visible project.
  for (const memory of Array.isArray(memories) ? memories : []) {
    if (!inVisibleProjects(memory.projectId, visibleIds)) {
      continue;
    }
    const haystack = `${memory.title || ""} ${memory.content || ""}`.toLowerCase();
    if (haystack.includes(q)) {
      const isDecision = String(memory.section || "").toLowerCase() === "decisions";
      results.push({
        id: memory.id,
        category: isDecision ? "decision" : "memory",
        title: memory.title || (isDecision ? "Project decision" : "Workspace memory"),
        excerpt: memory.content || "",
        href: `/memory?project=${memory.projectId}`,
        projectId: memory.projectId,
        updatedAt: memory.updatedAt || memory.createdAt || nowIso()
      });
    }
  }

  // Timeline (preview checkpoints) — scoped to a visible project.
  for (const preview of Array.isArray(previews) ? previews : []) {
    if (!inVisibleProjects(preview.projectId, visibleIds)) {
      continue;
    }
    const label = `Preview v${preview.versionNumber} ${preview.title || ""}`.trim();
    const haystack = `${label} ${preview.summary || ""}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({
        id: preview.id,
        category: "timeline",
        title: `Preview v${preview.versionNumber} generated`,
        excerpt: preview.title || preview.summary || "Preview checkpoint",
        href: `/timeline?project=${preview.projectId}`,
        projectId: preview.projectId,
        updatedAt: preview.updatedAt || preview.createdAt || nowIso()
      });
    }
  }

  return results.sort((left, right) => toMillis(right.updatedAt) - toMillis(left.updatedAt)).slice(0, 24);
}

module.exports = { buildScopedResults, visibleProjectIdSet, inVisibleProjects };
