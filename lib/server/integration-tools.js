const { Buffer } = require("node:buffer");

const integrationStore = require("./integration-store");

const PROVIDER_LABELS = {
  github: "GitHub",
  google_drive: "Google Drive",
  notion: "Notion",
  slack: "Slack",
  gmail: "Gmail",
  linear: "Linear",
  jira: "Jira",
  figma: "Figma"
};

function normalizePrompt(prompt = "") {
  return `${prompt}`.replace(/\s+/g, " ").trim();
}

function includesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildHeaders(accessToken, extra = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...extra
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function requestJson(url, { accessToken, method = "GET", headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: buildHeaders(accessToken, {
      Accept: "application/json",
      ...headers
    }),
    body
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      payload?.error_description ||
      payload?.error?.message ||
      payload?.error ||
      payload?.message ||
      `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

function findRepo(prompt) {
  return prompt.match(/\b([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\b/)?.[1] || null;
}

function findPrNumber(prompt) {
  return prompt.match(/\b(?:pr|pull request)\s*#?(\d+)\b/i)?.[1] || null;
}

function findQuoted(prompt) {
  return prompt.match(/["“”']([^"“”']+)["“”']/)?.[1]?.trim() || null;
}

function truncate(value, limit = 220) {
  const normalized = `${value || ""}`.trim();
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 3)}...`;
}

function summarizeList(items, formatter) {
  return items.map((item) => `- ${formatter(item)}`).join("\n");
}

function providerLabel(provider) {
  return PROVIDER_LABELS[provider] || provider;
}

function buildAugmentation(provider, action, detail) {
  return `${providerLabel(provider)} ${action} result:\n${detail}`;
}

async function executeGithub(prompt, integration) {
  const lower = prompt.toLowerCase();
  const repo = findRepo(prompt);
  const prNumber = findPrNumber(prompt);

  if (repo && prNumber && /\b(pr|pull request)\b/.test(lower)) {
    const payload = await requestJson(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
      accessToken: integration.accessToken,
      headers: { "X-GitHub-Api-Version": "2022-11-28" }
    });
    const summary = `Loaded PR #${payload.number} from ${repo}: ${payload.title}.`;
    return {
      action: "get_pr",
      summary,
      payload: {
        repo,
        number: payload.number,
        title: payload.title,
        state: payload.state,
        author: payload.user?.login || null,
        url: payload.html_url || null
      },
      promptAugmentation: buildAugmentation(
        "github",
        "PR lookup",
        `Repository: ${repo}\nPR #${payload.number}: ${payload.title}\nState: ${payload.state}\nAuthor: ${payload.user?.login || "unknown"}`
      )
    };
  }

  if (repo && /\b(pr|pull requests|pull request|open prs)\b/.test(lower)) {
    const payload = await requestJson(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=5`, {
      accessToken: integration.accessToken,
      headers: { "X-GitHub-Api-Version": "2022-11-28" }
    });
    const pulls = Array.isArray(payload) ? payload : [];
    const summary = pulls.length
      ? `Found ${pulls.length} open pull request${pulls.length === 1 ? "" : "s"} in ${repo}.`
      : `No open pull requests found in ${repo}.`;
    return {
      action: "list_prs",
      summary,
      payload: {
        repo,
        pulls: pulls.map((pull) => ({
          number: pull.number,
          title: pull.title,
          author: pull.user?.login || null,
          url: pull.html_url || null
        }))
      },
      promptAugmentation: buildAugmentation(
        "github",
        "pull request list",
        pulls.length
          ? summarizeList(pulls, (pull) => `#${pull.number} ${pull.title} (${pull.user?.login || "unknown"})`)
          : "No open pull requests found."
      )
    };
  }

  if (repo && /\b(create issue|open issue|new issue)\b/.test(lower)) {
    const title = findQuoted(prompt) || `Xeivora issue from chat`;
    const issueBody = `Created from Xeivora.\n\nOriginal request:\n${truncate(prompt, 800)}`;
    const payload = await requestJson(`https://api.github.com/repos/${repo}/issues`, {
      accessToken: integration.accessToken,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ title, body: issueBody })
    });
    return {
      action: "create_issue",
      summary: `Created GitHub issue in ${repo}: ${payload.title}.`,
      payload: {
        repo,
        issueNumber: payload.number,
        title: payload.title,
        url: payload.html_url || null
      },
      promptAugmentation: buildAugmentation(
        "github",
        "issue creation",
        `Created issue #${payload.number} in ${repo}: ${payload.title}`
      )
    };
  }

  const query = findQuoted(prompt) || prompt.replace(/\bgithub\b/gi, "").replace(/\brepo(sitory|s)?\b/gi, "").trim();
  const payload = await requestJson(
    `https://api.github.com/search/repositories?q=${encodeURIComponent(query || "xeivora")}&per_page=5`,
    {
      accessToken: integration.accessToken,
      headers: { "X-GitHub-Api-Version": "2022-11-28" }
    }
  );
  const repos = Array.isArray(payload.items) ? payload.items : [];
  const summary = repos.length
    ? `Found ${repos.length} GitHub repos for "${query || "xeivora"}".`
    : `No GitHub repos found for "${query || "xeivora"}".`;
  return {
    action: "search_repos",
    summary,
    payload: {
      query,
      repos: repos.map((item) => ({
        fullName: item.full_name,
        description: item.description,
        stars: item.stargazers_count,
        url: item.html_url
      }))
    },
    promptAugmentation: buildAugmentation(
      "github",
      "repository search",
      repos.length
        ? summarizeList(repos, (repoItem) => `${repoItem.full_name} — ${truncate(repoItem.description || "No description", 80)}`)
        : "No repositories found."
    )
  };
}

async function executeDrive(prompt, integration) {
  const lower = prompt.toLowerCase();
  const query = findQuoted(prompt) || prompt.replace(/\b(google drive|drive|document|documents|sheet|spreadsheet|file|files)\b/gi, "").trim();
  const fields = "files(id,name,mimeType,modifiedTime,webViewLink)";

  const endpoint =
    /\brecent\b/.test(lower) || !query
      ? `https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&pageSize=5&fields=${encodeURIComponent(fields)}`
      : `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name contains '${query.replace(/'/g, "\\'")}' and trashed=false`)}&pageSize=5&fields=${encodeURIComponent(fields)}`;

  const payload = await requestJson(endpoint, {
    accessToken: integration.accessToken
  });
  const files = Array.isArray(payload.files) ? payload.files : [];
  const summary = files.length
    ? `Found ${files.length} Google Drive file${files.length === 1 ? "" : "s"}.`
    : "No matching Google Drive files found.";

  return {
    action: /\brecent\b/.test(lower) || !query ? "list_recent" : "search_files",
    summary,
    payload: {
      query: query || null,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime,
        webViewLink: file.webViewLink || null
      }))
    },
    promptAugmentation: buildAugmentation(
      "google_drive",
      /\brecent\b/.test(lower) || !query ? "recent files" : "file search",
      files.length
        ? summarizeList(files, (file) => `${file.name} (${file.mimeType || "unknown"})`)
        : "No files found."
    )
  };
}

async function executeNotion(prompt, integration) {
  const payload = await requestJson("https://api.notion.com/v1/search", {
    accessToken: integration.accessToken,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify({
      query: findQuoted(prompt) || prompt.replace(/\bnotion\b/gi, "").trim(),
      page_size: 5
    })
  });

  const results = Array.isArray(payload.results) ? payload.results : [];
  const pages = results.map((result) => {
    const title = result.properties?.title?.title?.[0]?.plain_text
      || result.properties?.Name?.title?.[0]?.plain_text
      || result.title?.[0]?.plain_text
      || result.url
      || "Untitled";

    return {
      id: result.id,
      title,
      url: result.url || null
    };
  });

  return {
    action: "search_pages",
    summary: pages.length ? `Found ${pages.length} Notion page${pages.length === 1 ? "" : "s"}.` : "No matching Notion pages found.",
    payload: { pages },
    promptAugmentation: buildAugmentation(
      "notion",
      "page search",
      pages.length ? summarizeList(pages, (page) => page.title) : "No pages found."
    )
  };
}

async function executeSlack(prompt, integration) {
  const lower = prompt.toLowerCase();

  if (/\bsend\b/.test(lower) && /\bslack\b/.test(lower)) {
    const channelName = prompt.match(/#([a-z0-9_-]+)/i)?.[1] || null;
    const channelsPayload = await requestJson("https://slack.com/api/conversations.list?limit=200&exclude_archived=true", {
      accessToken: integration.accessToken
    });
    const channels = Array.isArray(channelsPayload.channels) ? channelsPayload.channels : [];
    const targetChannel = channels.find((channel) => channel.name === channelName) || null;

    if (!targetChannel) {
      return {
        action: "send_message",
        summary: "Slack channel not found. Mention a channel like #general to send a message.",
        payload: {
          requestedChannel: channelName
        },
        promptAugmentation: null
      };
    }

    const messageText = findQuoted(prompt) || truncate(prompt.replace(/.*?#([a-z0-9_-]+)/i, "").trim(), 300);
    const payload = await requestJson("https://slack.com/api/chat.postMessage", {
      accessToken: integration.accessToken,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: targetChannel.id,
        text: messageText || "Sent from Xeivora."
      })
    });

    return {
      action: "send_message",
      summary: `Sent a Slack message to #${targetChannel.name}.`,
      payload: {
        channel: targetChannel.name,
        ts: payload.ts || null
      },
      promptAugmentation: buildAugmentation(
        "slack",
        "message send",
        `Sent to #${targetChannel.name}: ${messageText || "Sent from Xeivora."}`
      )
    };
  }

  if (/\bchannel|channels\b/.test(lower)) {
    const payload = await requestJson("https://slack.com/api/conversations.list?limit=10&exclude_archived=true", {
      accessToken: integration.accessToken
    });
    const channels = Array.isArray(payload.channels) ? payload.channels : [];

    return {
      action: "list_channels",
      summary: channels.length ? `Loaded ${channels.length} Slack channels.` : "No Slack channels found.",
      payload: {
        channels: channels.map((channel) => ({
          id: channel.id,
          name: channel.name
        }))
      },
      promptAugmentation: buildAugmentation(
        "slack",
        "channel list",
        channels.length ? summarizeList(channels, (channel) => `#${channel.name}`) : "No channels found."
      )
    };
  }

  const query = findQuoted(prompt) || prompt.replace(/\bslack\b/gi, "").replace(/\bmessages?\b/gi, "").trim();
  const payload = await requestJson(
    `https://slack.com/api/search.messages?query=${encodeURIComponent(query || "update")}&count=5`,
    {
      accessToken: integration.accessToken
    }
  );
  const matches = Array.isArray(payload.messages?.matches) ? payload.messages.matches : [];

  return {
    action: "search_messages",
    summary: matches.length ? `Found ${matches.length} Slack message${matches.length === 1 ? "" : "s"}.` : "No Slack messages found.",
    payload: {
      query,
      messages: matches.map((message) => ({
        user: message.username || message.user || null,
        text: truncate(message.text || "", 160),
        channel: message.channel?.name || null
      }))
    },
    promptAugmentation: buildAugmentation(
      "slack",
      "message search",
      matches.length
        ? summarizeList(matches, (message) => `#${message.channel?.name || "unknown"} — ${truncate(message.text || "", 90)}`)
        : "No messages found."
    )
  };
}

async function executeGmail(prompt, integration) {
  const lower = prompt.toLowerCase();
  const query = findQuoted(prompt) || prompt.replace(/\bgmail\b/gi, "").replace(/\bemail(s)?\b/gi, "").trim();

  if (/\bsend\b/.test(lower)) {
    const to = prompt.match(/\bto\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)?.[1] || null;
    if (!to) {
      return {
        action: "send_email",
        summary: "Add a recipient email address like “to name@example.com” to send from Gmail.",
        payload: {},
        promptAugmentation: null
      };
    }

    const subject = findQuoted(prompt) || "Message from Xeivora";
    const body = truncate(prompt.replace(/\bto\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "").trim(), 1200);
    const raw = toBase64Url(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`);
    await requestJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      accessToken: integration.accessToken,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw })
    });

    return {
      action: "send_email",
      summary: `Sent a Gmail message to ${to}.`,
      payload: {
        to,
        subject
      },
      promptAugmentation: buildAugmentation("gmail", "email send", `Sent email to ${to} with subject "${subject}".`)
    };
  }

  const payload = await requestJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5${query ? `&q=${encodeURIComponent(query)}` : ""}`,
    {
      accessToken: integration.accessToken
    }
  );
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  return {
    action: query ? "search_emails" : "list_recent",
    summary: messages.length ? `Loaded ${messages.length} Gmail message${messages.length === 1 ? "" : "s"}.` : "No Gmail messages found.",
    payload: {
      query: query || null,
      messages: messages.map((message) => ({ id: message.id, threadId: message.threadId }))
    },
    promptAugmentation: buildAugmentation(
      "gmail",
      query ? "email search" : "recent inbox",
      messages.length
        ? summarizeList(messages, (message) => `Message ${message.id}`)
        : "No messages found."
    )
  };
}

async function executeLinear(prompt, integration) {
  const query = `
    query XeivoraIssues($term: String!) {
      issues(first: 5, filter: { title: { containsIgnoreCase: $term } }) {
        nodes {
          id
          identifier
          title
          state { name }
          url
        }
      }
    }
  `;
  const term = findQuoted(prompt) || prompt.replace(/\blinear\b/gi, "").replace(/\bissues?\b/gi, "").trim() || "issue";
  const payload = await requestJson("https://api.linear.app/graphql", {
    accessToken: integration.accessToken,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { term } })
  });
  const issues = Array.isArray(payload.data?.issues?.nodes) ? payload.data.issues.nodes : [];

  return {
    action: "search_issues",
    summary: issues.length ? `Found ${issues.length} Linear issue${issues.length === 1 ? "" : "s"}.` : "No matching Linear issues found.",
    payload: {
      term,
      issues: issues.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state?.name || null,
        url: issue.url || null
      }))
    },
    promptAugmentation: buildAugmentation(
      "linear",
      "issue search",
      issues.length
        ? summarizeList(issues, (issue) => `${issue.identifier} ${issue.title} (${issue.state?.name || "unknown"})`)
        : "No issues found."
    )
  };
}

async function executeJira(prompt, integration) {
  const cloudId = integration.metadata?.cloudId;
  if (!cloudId) {
    return {
      action: "search_tickets",
      summary: "Jira is connected, but the accessible site could not be identified yet.",
      payload: {},
      promptAugmentation: null
    };
  }

  const query = findQuoted(prompt) || prompt.replace(/\bjira\b/gi, "").replace(/\b(ticket|tickets|issue|issues|sprint|sprints)\b/gi, "").trim();
  const payload = await requestJson(
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search/jql?maxResults=5&fields=summary,status&jql=${encodeURIComponent(
      query ? `text ~ "${query.replace(/"/g, '\\"')}" ORDER BY updated DESC` : "ORDER BY updated DESC"
    )}`,
    {
      accessToken: integration.accessToken
    }
  );
  const issues = Array.isArray(payload.issues) ? payload.issues : [];

  return {
    action: "search_tickets",
    summary: issues.length ? `Found ${issues.length} Jira ticket${issues.length === 1 ? "" : "s"}.` : "No Jira tickets found.",
    payload: {
      query: query || null,
      issues: issues.map((issue) => ({
        key: issue.key,
        summary: issue.fields?.summary || null,
        status: issue.fields?.status?.name || null
      }))
    },
    promptAugmentation: buildAugmentation(
      "jira",
      "ticket search",
      issues.length
        ? summarizeList(issues, (issue) => `${issue.key} ${issue.fields?.summary || "Untitled"} (${issue.fields?.status?.name || "unknown"})`)
        : "No tickets found."
    )
  };
}

async function executeFigma(prompt, integration) {
  const fileKey = prompt.match(/\b([A-Za-z0-9]{22,128})\b/)?.[1] || null;
  if (!fileKey) {
    return {
      action: "read_file",
      summary: "Figma is connected. Mention a Figma file key to inspect a design file.",
      payload: {},
      promptAugmentation: null
    };
  }

  const payload = await requestJson(`https://api.figma.com/v1/files/${fileKey}`, {
    accessToken: integration.accessToken
  });

  return {
    action: "read_file",
    summary: `Loaded Figma file "${payload.name || fileKey}".`,
    payload: {
      fileKey,
      name: payload.name || null,
      lastModified: payload.lastModified || null,
      version: payload.version || null
    },
    promptAugmentation: buildAugmentation(
      "figma",
      "file read",
      `File: ${payload.name || fileKey}\nLast modified: ${payload.lastModified || "unknown"}`
    )
  };
}

function getActiveConnectedProviders({ integrations = [], enabledProviders = [] }) {
  const enabledSet = new Set(enabledProviders.length ? enabledProviders : integrations.filter((entry) => entry.connected).map((entry) => entry.provider));
  return integrations.filter((integration) => integration.connected && enabledSet.has(integration.provider));
}

function detectProvider(prompt, availableProviders) {
  const lower = prompt.toLowerCase();
  const has = (provider) => availableProviders.some((entry) => entry.provider === provider);

  if (has("github") && (/\bgithub\b/.test(lower) || /\b(repo|repository|repositories|pull request|pr|issue|issues|code search)\b/.test(lower))) {
    return "github";
  }
  if (has("google_drive") && (/\bgoogle drive\b/.test(lower) || /\bdrive\b/.test(lower) || /\b(doc|docs|document|spreadsheet|sheet|files?)\b/.test(lower))) {
    return "google_drive";
  }
  if (has("notion") && /\bnotion\b|\bpage\b|\bdatabase\b|\bnote\b/i.test(prompt)) {
    return "notion";
  }
  if (has("slack") && /\bslack\b|\bchannel\b|\bchannels\b|\bmessage\b|\bmessages\b/i.test(prompt)) {
    return "slack";
  }
  if (has("gmail") && /\bgmail\b|\bemail\b|\binbox\b/i.test(prompt)) {
    return "gmail";
  }
  if (has("linear") && /\blinear\b|\bcycle\b|\bissue\b|\bissues\b/i.test(prompt)) {
    return "linear";
  }
  if (has("jira") && /\bjira\b|\bticket\b|\bsprint\b/i.test(prompt)) {
    return "jira";
  }
  if (has("figma") && /\bfigma\b|\bdesign\b|\bcomponent\b|\bmockup\b/i.test(prompt)) {
    return "figma";
  }

  return null;
}

async function executeProvider(provider, prompt, integration) {
  if (provider === "github") return executeGithub(prompt, integration);
  if (provider === "google_drive") return executeDrive(prompt, integration);
  if (provider === "notion") return executeNotion(prompt, integration);
  if (provider === "slack") return executeSlack(prompt, integration);
  if (provider === "gmail") return executeGmail(prompt, integration);
  if (provider === "linear") return executeLinear(prompt, integration);
  if (provider === "jira") return executeJira(prompt, integration);
  if (provider === "figma") return executeFigma(prompt, integration);
  return null;
}

async function executeIntegrationTools({
  prompt,
  userId = null,
  integrations = [],
  enabledProviders = [],
  sessionId = null,
  projectId = null
}) {
  if (!userId) {
    return {
      executions: [],
      promptAugmentation: null,
      localResponse: null
    };
  }

  const normalizedPrompt = normalizePrompt(prompt);
  const activeProviders = getActiveConnectedProviders({ integrations, enabledProviders });
  if (!activeProviders.length) {
    return {
      executions: [],
      promptAugmentation: null,
      localResponse: null
    };
  }

  const provider = detectProvider(normalizedPrompt, activeProviders);
  if (!provider) {
    return {
      executions: [],
      promptAugmentation: null,
      localResponse: null
    };
  }

  const storedIntegration = await integrationStore.getUserIntegration(userId, provider);
  if (!storedIntegration?.accessToken) {
    return {
      executions: [
        {
          id: `${provider}-not-connected`,
          name: provider,
          uiLabel: providerLabel(provider),
          status: "not_connected",
          connected: false,
          source: "integration",
          summary: `${providerLabel(provider)} is not connected yet.`,
          payload: {}
        }
      ],
      promptAugmentation: null,
      localResponse: null
    };
  }

  const startedAt = Date.now();

  try {
    const result = await executeProvider(provider, normalizedPrompt, storedIntegration);
    if (!result) {
      return {
        executions: [],
        promptAugmentation: null,
        localResponse: null
      };
    }

    return {
      executions: [
        {
          id: `${provider}-${Date.now()}`,
          name: `${provider}.${result.action}`,
          uiLabel: providerLabel(provider),
          status: "completed",
          connected: true,
          source: "integration",
          summary: result.summary,
          payload: {
            provider,
            action: result.action,
            sessionId,
            projectId,
            ...(result.payload || {})
          },
          durationMs: Date.now() - startedAt
        }
      ],
      promptAugmentation: result.promptAugmentation || null,
      localResponse: null
    };
  } catch (error) {
    return {
      executions: [
        {
          id: `${provider}-${Date.now()}`,
          name: `${provider}.error`,
          uiLabel: providerLabel(provider),
          status: "error",
          connected: false,
          source: "integration",
          summary: error instanceof Error ? error.message : `Unable to use ${providerLabel(provider)} right now.`,
          payload: {
            provider
          },
          durationMs: Date.now() - startedAt
        }
      ],
      promptAugmentation: null,
      localResponse: null
    };
  }
}

module.exports = {
  executeIntegrationTools
};
