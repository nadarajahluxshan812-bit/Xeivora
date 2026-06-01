"use client";

import { ExternalLink, LoaderCircle, PlugZap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceEmptyState,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSectionTitle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { IntegrationConnectionSummary } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type IntegrationsShellProps = {
  viewer: AuthUser;
};

type IntegrationsResponse = {
  error?: string;
  integrations?: IntegrationConnectionSummary[];
};

export function IntegrationsShell({ viewer }: IntegrationsShellProps) {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationConnectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIntegrations() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/integrations", { cache: "no-store" });
        const payload = (await response.json()) as IntegrationsResponse;

        if (!response.ok || !payload.integrations) {
          throw new Error(payload.error || "Unable to load integrations.");
        }

        if (!active) {
          return;
        }

        setIntegrations(payload.integrations);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load integrations.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadIntegrations();

    return () => {
      active = false;
    };
  }, []);

  const connectedCount = useMemo(
    () => integrations.filter((integration) => integration.connected).length,
    [integrations]
  );

  const statusMessage = searchParams.get("connected")
    ? `${labelForProvider(searchParams.get("connected"))} connected successfully.`
    : searchParams.get("disconnected")
      ? `${labelForProvider(searchParams.get("disconnected"))} disconnected.`
      : searchParams.get("error");

  async function handleDisconnect(provider: string) {
    setDisconnectingProvider(provider);
    setError(null);

    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string; disconnected?: boolean };

      if (!response.ok || !payload.disconnected) {
        throw new Error(payload.error || "Unable to disconnect this app.");
      }

      setIntegrations((current) =>
        current.map((integration) =>
          integration.provider === provider
            ? {
                ...integration,
                connected: false,
                accountLabel: null,
                connectedAt: null,
                scopes: []
              }
            : integration
        )
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to disconnect this app.");
    } finally {
      setDisconnectingProvider(null);
    }
  }

  return (
    <WorkspacePageShell statusLabel="Integrations" viewer={viewer}>
      <div className="space-y-8">
        <WorkspacePageHero
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <WorkspaceBadge tone="learning">{connectedCount} connected</WorkspaceBadge>
              <WorkspaceBadge tone="standby">{integrations.length} available apps</WorkspaceBadge>
            </div>
          }
          description="Let Xeivora read and write to the tools you already use."
          eyebrow="Connect your apps"
          title="Connect your apps"
        />

        {statusMessage ? (
          <div className="rounded-[8px] border border-[color:var(--site-border-strong)] bg-[var(--site-accent-soft)] px-4 py-3 text-sm text-[var(--site-text)]">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[8px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[var(--site-text)]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <WorkspaceCard className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-[var(--site-muted)]">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading connected apps...
            </div>
          </WorkspaceCard>
        ) : integrations.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integrations.map((integration) => {
              const connected = integration.connected;
              const available = integration.available;
              const disconnecting = disconnectingProvider === integration.provider;

              return (
                <WorkspaceCard
                  className="flex min-h-[220px] flex-col justify-between border-[color:var(--site-border)] bg-[var(--site-card)] p-5"
                  key={integration.provider}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <IntegrationGlyph icon={integration.icon} label={integration.label} />
                        <div>
                          <WorkspaceSectionTitle className="text-[18px]">{integration.label}</WorkspaceSectionTitle>
                          <p className="mt-1 text-sm leading-6 text-[var(--site-subtle)]">
                            {integration.description}
                          </p>
                        </div>
                      </div>

                      {connected ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-[11px] font-medium text-[#7ee08d]">
                          <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
                          Connected
                        </span>
                      ) : !available ? (
                        <span className="inline-flex items-center rounded-full border border-[color:var(--site-border)] px-2.5 py-1 text-[11px] text-[var(--site-subtle)]">
                          Not configured
                        </span>
                      ) : null}
                    </div>

                    {integration.accountLabel ? (
                      <p className="mt-4 text-xs text-[var(--site-subtle)]">
                        Connected as <span className="text-[var(--site-text)]">{integration.accountLabel}</span>
                      </p>
                    ) : null}

                    {integration.scopes.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {integration.scopes.slice(0, 4).map((scope) => (
                          <span
                            className="rounded-full border border-[color:var(--site-border)] bg-[var(--site-accent-soft)] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-[var(--site-subtle)]"
                            key={scope}
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    {connected ? (
                      <>
                        <WorkspaceButton
                          className="px-4"
                          onClick={() => void handleDisconnect(integration.provider)}
                          type="button"
                          variant="secondary"
                        >
                          {disconnecting ? "Disconnecting..." : "Disconnect"}
                        </WorkspaceButton>
                        <a
                          className="inline-flex items-center gap-2 text-sm text-[var(--site-muted)] transition hover:text-[var(--site-text)]"
                          href={`/api/integrations/${integration.provider}/auth`}
                        >
                          Reconnect
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </>
                    ) : available ? (
                      <a
                        className="inline-flex items-center justify-center rounded-[8px] bg-[var(--site-accent)] px-4 py-2 text-sm font-medium text-[var(--site-inverse)] transition hover:bg-[var(--site-accent-strong)]"
                        href={`/api/integrations/${integration.provider}/auth`}
                      >
                        Connect
                      </a>
                    ) : (
                      <span className="text-sm text-[var(--site-subtle)]">
                        Add OAuth credentials to enable this integration.
                      </span>
                    )}
                  </div>
                </WorkspaceCard>
              );
            })}
          </div>
        ) : (
          <WorkspaceEmptyState
            description="No integrations are available yet. Add provider credentials and Xeivora will list them here."
            title="No apps available"
          />
        )}
      </div>
    </WorkspacePageShell>
  );
}

function labelForProvider(provider: string | null) {
  if (!provider) {
    return "Integration";
  }

  return provider
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function IntegrationGlyph({ icon, label }: { icon: string; label: string }) {
  const glyph = iconLabel(icon);

  return (
    <div
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[14px] border border-[color:var(--site-border)] bg-[var(--site-accent-soft)] text-sm font-semibold text-[var(--site-text)]"
      )}
      aria-label={label}
      title={label}
    >
      {glyph}
    </div>
  );
}

function iconLabel(icon: string) {
  const normalized = icon.toLowerCase();

  if (normalized === "github") return "GH";
  if (normalized === "drive") return "Dr";
  if (normalized === "notion") return "No";
  if (normalized === "slack") return "Sl";
  if (normalized === "gmail") return "Gm";
  if (normalized === "linear") return "Li";
  if (normalized === "jira") return "Ji";
  if (normalized === "figma") return "Fi";

  return <PlugZap className="h-4 w-4 text-[var(--site-accent)]" />;
}
