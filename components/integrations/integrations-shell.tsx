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
          <div className="rounded-[8px] border border-[rgba(201,100,66,0.2)] bg-[rgba(201,100,66,0.08)] px-4 py-3 text-sm text-[#f0ead8]">
            {statusMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[8px] border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-3 text-sm text-[#f0ead8]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <WorkspaceCard className="flex min-h-[240px] items-center justify-center">
            <div className="flex items-center gap-3 text-[rgba(240,234,216,0.7)]">
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
                  className="flex min-h-[220px] flex-col justify-between border-[rgba(201,100,66,0.15)] bg-[#1a1410] p-5"
                  key={integration.provider}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <IntegrationGlyph icon={integration.icon} label={integration.label} />
                        <div>
                          <WorkspaceSectionTitle className="text-[18px]">{integration.label}</WorkspaceSectionTitle>
                          <p className="mt-1 text-sm leading-6 text-[rgba(240,234,216,0.5)]">
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
                        <span className="inline-flex items-center rounded-full border border-[rgba(201,100,66,0.15)] px-2.5 py-1 text-[11px] text-[rgba(240,234,216,0.4)]">
                          Not configured
                        </span>
                      ) : null}
                    </div>

                    {integration.accountLabel ? (
                      <p className="mt-4 text-xs text-[rgba(240,234,216,0.5)]">
                        Connected as <span className="text-[#f0ead8]">{integration.accountLabel}</span>
                      </p>
                    ) : null}

                    {integration.scopes.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {integration.scopes.slice(0, 4).map((scope) => (
                          <span
                            className="rounded-full border border-[rgba(201,100,66,0.15)] bg-[rgba(201,100,66,0.06)] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-[rgba(240,234,216,0.45)]"
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
                          className="inline-flex items-center gap-2 text-sm text-[rgba(240,234,216,0.6)] transition hover:text-[#f0ead8]"
                          href={`/api/integrations/${integration.provider}/auth`}
                        >
                          Reconnect
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </>
                    ) : available ? (
                      <a
                        className="inline-flex items-center justify-center rounded-[8px] bg-[#c96442] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#a04e32]"
                        href={`/api/integrations/${integration.provider}/auth`}
                      >
                        Connect
                      </a>
                    ) : (
                      <span className="text-sm text-[rgba(240,234,216,0.45)]">
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
        "flex h-11 w-11 items-center justify-center rounded-[14px] border border-[rgba(201,100,66,0.2)] bg-[rgba(201,100,66,0.08)] text-sm font-semibold text-[#f0ead8]"
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

  return <PlugZap className="h-4 w-4 text-[#c96442]" />;
}
