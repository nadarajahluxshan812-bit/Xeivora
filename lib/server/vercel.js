const mvpStore = require("./mvp-store");

const VERCEL_API = "https://api.vercel.com";
const LINK_COLLECTION = "vercelProjects";
const DEPLOYMENT_COLLECTION = "vercelDeployments";

class VercelApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "VercelApiError";
    this.status = status || 502;
  }
}

// Server-side only. The token is never returned to callers or the client.
function getToken() {
  return process.env.VERCEL_TOKEN || "";
}

function isVercelConfigured() {
  return Boolean(getToken());
}

function getTeamQuery() {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `teamId=${encodeURIComponent(teamId)}` : "";
}

function withTeam(path) {
  const team = getTeamQuery();
  if (!team) {
    return path;
  }
  return path.includes("?") ? `${path}&${team}` : `${path}?${team}`;
}

async function vercelFetch(path, init = {}) {
  const token = getToken();
  if (!token) {
    throw new VercelApiError("Vercel is not configured on this server.", 503);
  }

  const response = await fetch(`${VERCEL_API}${withTeam(path)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  if (response.status === 401 || response.status === 403) {
    throw new VercelApiError("Vercel token is invalid or lacks access.", 401);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new VercelApiError(detail || `Vercel request failed (${response.status}).`, response.status);
  }

  return response.json();
}

function normalizeGitRepo(link) {
  if (!link || !link.type) {
    return null;
  }
  return {
    type: link.type,
    repo: link.repo || (link.org && link.repo ? `${link.org}/${link.repo}` : null),
    repoId: link.repoId ?? null,
    productionBranch: link.productionBranch || null
  };
}

function normalizeProject(project) {
  return {
    id: project.id,
    name: project.name,
    framework: project.framework || null,
    gitRepo: normalizeGitRepo(project.link),
    updatedAt: project.updatedAt || null
  };
}

function normalizeDeployment(dep) {
  const url = dep.url ? (dep.url.startsWith("http") ? dep.url : `https://${dep.url}`) : null;
  return {
    id: dep.uid || dep.id,
    url,
    name: dep.name || null,
    target: dep.target || (dep.meta && dep.meta.target) || "preview",
    state: dep.readyState || dep.state || "QUEUED",
    createdAt: dep.createdAt || dep.created || null
  };
}

async function getUser() {
  const data = await vercelFetch("/v2/user");
  const user = data.user || data;
  return {
    id: user.id || user.uid || null,
    username: user.username || null,
    email: user.email || null,
    name: user.name || null
  };
}

async function listProjects({ limit = 100 } = {}) {
  const data = await vercelFetch(`/v9/projects?limit=${limit}`);
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return projects.map(normalizeProject);
}

async function getProject(idOrName) {
  return normalizeProject(await vercelFetch(`/v9/projects/${encodeURIComponent(idOrName)}`));
}

async function createDeployment({ name, gitSource, target }) {
  const body = {
    name,
    gitSource,
    ...(target === "production" ? { target: "production" } : {})
  };
  const dep = await vercelFetch("/v13/deployments", {
    method: "POST",
    body: JSON.stringify(body)
  });
  return normalizeDeployment(dep);
}

async function getDeployment(id) {
  return normalizeDeployment(await vercelFetch(`/v13/deployments/${encodeURIComponent(id)}`));
}

async function listVercelDeployments({ projectId, limit = 20 } = {}) {
  const data = await vercelFetch(`/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=${limit}`);
  const deployments = Array.isArray(data.deployments) ? data.deployments : [];
  return deployments.map(normalizeDeployment);
}

// ---- Project <-> Vercel project link (mvp-store) ----

async function getProjectVercel(projectId) {
  if (!projectId) return null;
  const links = await mvpStore.list(LINK_COLLECTION);
  return (Array.isArray(links) ? links : []).find((link) => link.projectId === projectId) || null;
}

async function saveProjectVercel(projectId, payload) {
  const existing = await getProjectVercel(projectId);
  if (existing) {
    await mvpStore.remove(LINK_COLLECTION, existing.id);
  }
  return mvpStore.create(LINK_COLLECTION, {
    projectId,
    vercelProjectId: payload.vercelProjectId,
    name: payload.name,
    framework: payload.framework || null,
    gitRepo: payload.gitRepo || null,
    linkedBy: payload.linkedBy || null
  });
}

async function removeProjectVercel(projectId) {
  const existing = await getProjectVercel(projectId);
  if (!existing) return false;
  return mvpStore.remove(LINK_COLLECTION, existing.id);
}

// ---- Local deployment records (mvp-store) ----

async function listDeploymentRecords(projectId) {
  const all = await mvpStore.list(DEPLOYMENT_COLLECTION);
  return (Array.isArray(all) ? all : [])
    .filter((record) => record.projectId === projectId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function recordDeployment(projectId, payload) {
  return mvpStore.create(DEPLOYMENT_COLLECTION, {
    projectId,
    vercelDeploymentId: payload.vercelDeploymentId,
    url: payload.url || null,
    target: payload.target || "preview",
    state: payload.state || "QUEUED"
  });
}

async function updateDeploymentRecord(id, patch) {
  return mvpStore.update(DEPLOYMENT_COLLECTION, id, patch);
}

module.exports = {
  VercelApiError,
  createDeployment,
  getDeployment,
  getProject,
  getProjectVercel,
  getUser,
  isVercelConfigured,
  listDeploymentRecords,
  listProjects,
  listVercelDeployments,
  recordDeployment,
  removeProjectVercel,
  saveProjectVercel,
  updateDeploymentRecord
};
