import type { IntegrationProvider } from "@/lib/chat-types";

export type IntegrationDescriptor = {
  provider: IntegrationProvider;
  label: string;
  description: string;
  icon: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  scopeDelimiter?: "space" | "comma";
  usesGoogleOAuth?: boolean;
};

export const integrationDescriptors: Record<IntegrationProvider, IntegrationDescriptor> = {
  github: {
    provider: "github",
    label: "GitHub",
    description: "Read repos, review PRs, search code, and create issues.",
    icon: "github",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user"],
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET"
  },
  google_drive: {
    provider: "google_drive",
    label: "Google Drive",
    description: "Search files, read docs, and create content in Drive.",
    icon: "drive",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/drive.file"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    usesGoogleOAuth: true
  },
  notion: {
    provider: "notion",
    label: "Notion",
    description: "Read and write pages, notes, and connected databases.",
    icon: "notion",
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET"
  },
  slack: {
    provider: "slack",
    label: "Slack",
    description: "Read channels, search conversations, and send messages.",
    icon: "slack",
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "users:read", "search:read", "groups:read", "im:history"],
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
    scopeDelimiter: "comma"
  },
  gmail: {
    provider: "gmail",
    label: "Gmail",
    description: "Search inbox, read messages, and send replies.",
    icon: "gmail",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    usesGoogleOAuth: true
  },
  linear: {
    provider: "linear",
    label: "Linear",
    description: "Create issues, manage cycles, and coordinate projects.",
    icon: "linear",
    authUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read", "write"],
    clientIdEnv: "LINEAR_CLIENT_ID",
    clientSecretEnv: "LINEAR_CLIENT_SECRET"
  },
  jira: {
    provider: "jira",
    label: "Jira",
    description: "Read tickets, create issues, and manage sprint work.",
    icon: "jira",
    authUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    scopes: ["read:jira-user", "read:jira-work", "write:jira-work", "offline_access"],
    clientIdEnv: "JIRA_CLIENT_ID",
    clientSecretEnv: "JIRA_CLIENT_SECRET"
  },
  figma: {
    provider: "figma",
    label: "Figma",
    description: "Read design files, components, and file metadata.",
    icon: "figma",
    authUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    scopes: ["file_content:read", "file_metadata:read"],
    clientIdEnv: "FIGMA_CLIENT_ID",
    clientSecretEnv: "FIGMA_CLIENT_SECRET",
    scopeDelimiter: "space"
  }
};

export const integrationOrder = Object.keys(integrationDescriptors) as IntegrationProvider[];

export function getIntegrationDescriptor(provider: string) {
  if (!provider || !(provider in integrationDescriptors)) {
    return null;
  }

  return integrationDescriptors[provider as IntegrationProvider];
}

export function getIntegrationScopeValue(provider: IntegrationProvider) {
  const descriptor = integrationDescriptors[provider];
  const delimiter = descriptor.scopeDelimiter === "comma" ? "," : " ";
  return descriptor.scopes.join(delimiter);
}

export function isIntegrationConfigured(provider: IntegrationProvider) {
  const descriptor = integrationDescriptors[provider];
  return Boolean(process.env[descriptor.clientIdEnv] && process.env[descriptor.clientSecretEnv]);
}
