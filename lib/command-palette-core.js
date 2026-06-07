// Pure, framework-free logic for the command palette: category metadata,
// result grouping/ranking, and static-action filtering. Kept separate from
// the React component so it can be unit-tested with plain node.

const CATEGORY_LABELS = {
  project: "Projects",
  chat: "Chats",
  file: "Files",
  memory: "Memory",
  decision: "Decisions",
  timeline: "Timeline",
  task: "Tasks"
};

// Display + priority order. "Current project" is honored by floating the
// active project to the top of the Projects group (see groupResults).
const CATEGORY_ORDER = ["project", "chat", "file", "memory", "decision", "timeline", "task"];

function toTime(value) {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? t : 0;
}

// Group flat search results by category, ordered by CATEGORY_ORDER, each
// group sorted by recency. The current project is pinned first in Projects.
function groupResults(results, currentProjectId = null) {
  const list = Array.isArray(results) ? results : [];
  const buckets = {};

  for (const result of list) {
    if (!result || !result.category) {
      continue;
    }
    const category = CATEGORY_ORDER.includes(result.category) ? result.category : "task";
    if (!buckets[category]) {
      buckets[category] = [];
    }
    buckets[category].push(result);
  }

  const groups = [];
  for (const category of CATEGORY_ORDER) {
    const items = buckets[category];
    if (!items || !items.length) {
      continue;
    }
    items.sort((a, b) => {
      if (category === "project" && currentProjectId) {
        if (a.id === currentProjectId && b.id !== currentProjectId) {
          return -1;
        }
        if (b.id === currentProjectId && a.id !== currentProjectId) {
          return 1;
        }
      }
      return toTime(b.updatedAt) - toTime(a.updatedAt);
    });
    groups.push({ category, label: CATEGORY_LABELS[category], items });
  }
  return groups;
}

// Filter static actions by a fuzzy substring match over label + keywords.
function matchStaticActions(actions, query) {
  const list = Array.isArray(actions) ? actions : [];
  const q = String(query || "").trim().toLowerCase();
  if (!q) {
    return list;
  }
  return list.filter((action) =>
    `${action.label || ""} ${action.keywords || ""}`.toLowerCase().includes(q)
  );
}

// Build "Continue Project → <name>" entries for projects matching the query.
// Always available for the current project even before typing.
function continueProjectMatches(projects, query, currentProjectId = null, limit = 4) {
  const list = Array.isArray(projects) ? projects : [];
  const q = String(query || "").trim().toLowerCase();
  const wantsContinue = q.startsWith("continue") || q.startsWith("resume");
  const term = q.replace(/^(continue|resume)\s*/, "");

  const scored = list
    .filter((project) => {
      if (!q) {
        return project.id === currentProjectId;
      }
      if (wantsContinue && !term) {
        return true;
      }
      const haystack = `${project.name || ""} ${project.description || ""}`.toLowerCase();
      return haystack.includes(term || q);
    })
    .sort((a, b) => {
      if (a.id === currentProjectId && b.id !== currentProjectId) {
        return -1;
      }
      if (b.id === currentProjectId && a.id !== currentProjectId) {
        return 1;
      }
      return toTime(b.updatedAt) - toTime(a.updatedAt);
    })
    .slice(0, limit);

  return scored;
}

module.exports = {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  groupResults,
  matchStaticActions,
  continueProjectMatches
};
