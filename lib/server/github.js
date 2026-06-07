const mvpStore = require("./mvp-store");

const GITHUB_API = "https://api.github.com";
const LINK_COLLECTION = "githubRepos";

class GitHubApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status || 502;
  }
}

async function githubFetch(token, path, init = {}) {
  if (!token) {
    throw new GitHubApiError("GitHub account is not connected.", 401);
  }

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Xeivora",
      ...(init.headers || {})
    },
    cache: "no-store"
  });

  if (response.status === 401) {
    throw new GitHubApiError("GitHub authorization expired. Reconnect your account.", 401);
  }
  if (response.status === 404) {
    throw new GitHubApiError("GitHub resource not found.", 404);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new GitHubApiError(detail || `GitHub request failed (${response.status}).`, response.status);
  }

  return response.json();
}

function normalizeRepo(repo) {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login || repo.full_name?.split("/")[0] || "",
    private: Boolean(repo.private),
    description: repo.description || "",
    defaultBranch: repo.default_branch || "main",
    url: repo.html_url,
    updatedAt: repo.updated_at,
    language: repo.language || null,
    stars: repo.stargazers_count ?? 0
  };
}

function normalizeBranch(branch) {
  return {
    name: branch.name,
    protected: Boolean(branch.protected),
    sha: branch.commit?.sha || null
  };
}

function normalizeCommit(commit) {
  return {
    sha: commit.sha,
    shortSha: (commit.sha || "").slice(0, 7),
    message: (commit.commit?.message || "").split("\n")[0],
    author: commit.commit?.author?.name || commit.author?.login || "Unknown",
    date: commit.commit?.author?.date || commit.commit?.committer?.date || null,
    url: commit.html_url
  };
}

function normalizePull(pull) {
  return {
    number: pull.number,
    title: pull.title,
    state: pull.state,
    draft: Boolean(pull.draft),
    author: pull.user?.login || "Unknown",
    branch: pull.head?.ref || null,
    base: pull.base?.ref || null,
    createdAt: pull.created_at,
    updatedAt: pull.updated_at,
    url: pull.html_url
  };
}

async function listUserRepos(token, { perPage = 50 } = {}) {
  const repos = await githubFetch(
    token,
    `/user/repos?per_page=${perPage}&sort=updated&affiliation=owner,collaborator,organization_member`
  );
  return Array.isArray(repos) ? repos.map(normalizeRepo) : [];
}

async function getRepo(token, owner, repo) {
  return normalizeRepo(await githubFetch(token, `/repos/${owner}/${repo}`));
}

async function listBranches(token, owner, repo, { perPage = 50 } = {}) {
  const branches = await githubFetch(token, `/repos/${owner}/${repo}/branches?per_page=${perPage}`);
  return Array.isArray(branches) ? branches.map(normalizeBranch) : [];
}

async function listCommits(token, owner, repo, { perPage = 20 } = {}) {
  const commits = await githubFetch(token, `/repos/${owner}/${repo}/commits?per_page=${perPage}`);
  return Array.isArray(commits) ? commits.map(normalizeCommit) : [];
}

async function listPullRequests(token, owner, repo, { state = "all", perPage = 20 } = {}) {
  const pulls = await githubFetch(
    token,
    `/repos/${owner}/${repo}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`
  );
  return Array.isArray(pulls) ? pulls.map(normalizePull) : [];
}

// ---- Project <-> repository link (persisted via the generic mvp-store) ----

async function getProjectRepo(projectId) {
  if (!projectId) {
    return null;
  }
  const links = await mvpStore.list(LINK_COLLECTION);
  return (Array.isArray(links) ? links : []).find((link) => link.projectId === projectId) || null;
}

async function saveProjectRepo(projectId, payload) {
  // One repository per project: replace any existing link.
  const existing = await getProjectRepo(projectId);
  if (existing) {
    await mvpStore.remove(LINK_COLLECTION, existing.id);
  }
  return mvpStore.create(LINK_COLLECTION, {
    projectId,
    owner: payload.owner,
    repo: payload.repo,
    fullName: payload.fullName,
    url: payload.url || null,
    defaultBranch: payload.defaultBranch || "main",
    private: Boolean(payload.private),
    connectedBy: payload.connectedBy || null
  });
}

async function removeProjectRepo(projectId) {
  const existing = await getProjectRepo(projectId);
  if (!existing) {
    return false;
  }
  return mvpStore.remove(LINK_COLLECTION, existing.id);
}

module.exports = {
  GitHubApiError,
  getProjectRepo,
  getRepo,
  listBranches,
  listCommits,
  listPullRequests,
  listUserRepos,
  removeProjectRepo,
  saveProjectRepo
};
