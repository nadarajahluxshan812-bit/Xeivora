"use client";

import Image from "next/image";
import { Copy, KeyRound, LogOut, PlugZap, RefreshCcw, Save, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ManageSubscription from "@/components/payments/ManageSubscription";
import { useXeivoraTheme } from "@/components/theme/theme-provider";
import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSectionTitle,
  WorkspaceTextArea,
  WorkspaceToggle
} from "@/components/workspace/workspace-page-ui";
import type { AuthUser } from "@/lib/auth-types";
import type { IntegrationConnectionSummary } from "@/lib/chat-types";
import { cn } from "@/lib/utils";

type SettingsShellProps = {
  initialUser: AuthUser;
};

type WorkspaceSettings = {
  memoryEnabled?: boolean;
  orchestrationEnabled?: boolean;
  continuityEnabled?: boolean;
  theme?: string;
  themePreference?: "dark" | "light" | "system";
  modelPreferenceOrder?: string[];
  defaultModel?: string;
  routingPreference?: "auto" | "single";
  enabledModels?: string[];
  providerApiKeys?: Record<string, string>;
  fontSize?: "small" | "medium" | "large";
  compactMode?: boolean;
  showModelIndicator?: boolean;
  xeivoraApiKey?: string;
  xeivoraApiKeyCreatedAt?: string;
};

type BillingStatus = {
  plan: string;
  credits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
};

type MemoryItem = {
  id: string;
  title: string;
  content: string;
  type: string;
  enabled: boolean;
};

const sections = [
  { key: "profile", label: "Profile" },
  { key: "appearance", label: "Appearance" },
  { key: "models", label: "Models" },
  { key: "memory", label: "Project Memory" },
  { key: "integrations", label: "Integrations" },
  { key: "billing", label: "Billing" },
  { key: "api-keys", label: "API Keys" }
] as const;

type SectionKey = (typeof sections)[number]["key"];

const modelChoices = [
  { key: "orbit-auto", label: "Xeivora Auto", description: "Let Xeivora decide" },
  { key: "claude", label: "Claude Sonnet", description: "Best for complex reasoning" },
  { key: "gpt-4o", label: "GPT-4o", description: "Best for coding and multimodal work" },
  { key: "gemini", label: "Gemini 2.5 Pro", description: "Best for research and synthesis" },
  { key: "deepseek", label: "DeepSeek R1", description: "Reasoning-first fallback mode" }
] as const;

export function SettingsShell({ initialUser }: SettingsShellProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { resolvedTheme, setTheme, themePreference } = useXeivoraTheme();
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");
  const [user, setUser] = useState<AuthUser>(initialUser);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, unknown> | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationConnectionSummary[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [nameDraft, setNameDraft] = useState(initialUser.name);
  const [emailDraft, setEmailDraft] = useState(initialUser.email);
  const [avatarDraft, setAvatarDraft] = useState(initialUser.avatarUrl || "");
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [regeneratingApiKey, setRegeneratingApiKey] = useState(false);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/status/providers", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/stripe/billing", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/integrations", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/memory", { cache: "no-store" }).then((response) => response.json())
    ])
      .then(([nextSettings, nextProviders, nextBilling, nextIntegrations, nextMemories]) => {
        setSettings(nextSettings);
        setProviderStatus(nextProviders);
        setBillingStatus(nextBilling);
        setIntegrations(nextIntegrations.integrations || []);
        setMemories(Array.isArray(nextMemories) ? nextMemories : []);
        setProviderKeys(nextSettings?.providerApiKeys || {});
      })
      .catch(() => setError("Unable to load settings."));
  }, []);

  const enabledModels = settings?.enabledModels || ["orbit-auto", "claude", "gpt-4o", "gemini", "deepseek"];
  const maskedApiKey = maskApiKey(settings?.xeivoraApiKey || "");
  const connectedIntegrations = integrations.filter((integration) => integration.connected);
  const usageLabel = useMemo(() => {
    if (!billingStatus) {
      return "Loading usage…";
    }

    if (billingStatus.plan === "Starter") {
      return `${billingStatus.credits} credits available this month`;
    }

    return `${billingStatus.credits} credits available`;
  }, [billingStatus]);

  async function persistSettings(nextPartial: Partial<WorkspaceSettings>, successMessage = "Settings updated.") {
    setSavingSettings(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(settings || {}), ...nextPartial })
      });
      const payload = (await response.json()) as WorkspaceSettings & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save settings.");
      }
      setSettings(payload);
      setProviderKeys(payload.providerApiKeys || {});
      setFeedback(successMessage);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameDraft,
          email: emailDraft,
          avatarUrl: avatarDraft || null,
          preferences: user.preferences
        })
      });
      const payload = (await response.json()) as { error?: string; user?: AuthUser };
      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Unable to save profile.");
      }
      setUser(payload.user);
      setFeedback("Profile updated.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSendResetLink() {
    setSendingReset(true);
    setFeedback(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailDraft })
      });
      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to send reset link.");
      }
      setFeedback(payload.message || "Password reset link sent.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send reset link.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDisconnectIntegration(provider: string) {
    try {
      const response = await fetch(`/api/integrations/${provider}/disconnect`, { method: "POST" });
      if (!response.ok) {
        throw new Error("Unable to disconnect integration.");
      }
      setIntegrations((current) => current.map((item) => (item.provider === provider ? { ...item, connected: false } : item)));
      setFeedback("Integration disconnected.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to disconnect integration.");
    }
  }

  async function handleRemoveMemory(memoryId: string) {
    const response = await fetch(`/api/memory/${memoryId}`, { method: "DELETE" });
    if (response.ok) {
      setMemories((current) => current.filter((item) => item.id !== memoryId));
    }
  }

  async function handleClearMemory() {
    await Promise.all(memories.map((memory) => fetch(`/api/memory/${memory.id}`, { method: "DELETE" })));
    setMemories([]);
  }

  async function handleRegenerateApiKey() {
    setRegeneratingApiKey(true);
    const nextKey = createXeivoraApiKey();
    await persistSettings(
      {
        xeivoraApiKey: nextKey,
        xeivoraApiKeyCreatedAt: new Date().toISOString()
      },
      "API key regenerated."
    );
    setRegeneratingApiKey(false);
  }

  async function handleCopyApiKey() {
    if (!settings?.xeivoraApiKey) {
      return;
    }

    await navigator.clipboard.writeText(settings.xeivoraApiKey);
    setFeedback("API key copied.");
  }

  function handleAvatarUpload(file: File | null) {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarDraft(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

  return (
    <WorkspacePageShell statusLabel="Protected" viewer={user}>
      <div className="space-y-8">
        <WorkspacePageHero
          actions={
            <WorkspaceButton onClick={() => void handleLogout()} variant="secondary">
              <LogOut className="h-4 w-4" />
              Sign out
            </WorkspaceButton>
          }
          description="Tune how Xeivora looks, routes models, remembers context, connects apps, and handles billing from one protected workspace control surface."
          eyebrow="Account settings"
          title="Profile, preferences, and integrations"
        />

        {feedback ? <Feedback tone="success">{feedback}</Feedback> : null}
        {error ? <Feedback tone="error">{error}</Feedback> : null}

        <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-card)] p-3">
            <nav className="space-y-1">
              {sections.map((section) => {
                const active = activeSection === section.key;
                return (
                  <button
                    className={cn(
                      "flex w-full items-center rounded-[8px] border-l-2 px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-l-[var(--site-accent)] bg-[var(--site-accent-soft)] text-[var(--site-text)]"
                        : "border-l-transparent text-[var(--site-subtle)] hover:bg-[var(--site-accent-soft)] hover:text-[var(--site-text)]"
                    )}
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    type="button"
                  >
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="space-y-6">
            {activeSection === "profile" ? (
              <WorkspaceCard>
                <div className="flex items-center justify-between gap-4 border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Profile</WorkspaceSectionTitle>
                  <WorkspaceButton disabled={savingProfile} onClick={() => void handleSaveProfile()}>
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Saving..." : "Save profile"}
                  </WorkspaceButton>
                </div>

                <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                  <div className="space-y-3">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--site-accent)] text-lg font-semibold text-[var(--site-inverse)]">
                      {avatarDraft ? (
                        <Image
                          alt={user.name}
                          className="h-full w-full object-cover"
                          height={64}
                          src={avatarDraft}
                          unoptimized
                          width={64}
                        />
                      ) : (
                        getInitials(user.name)
                      )}
                    </div>
                    <input
                      className="hidden"
                      onChange={(event) => handleAvatarUpload(event.target.files?.[0] || null)}
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                    />
                    <WorkspaceButton onClick={() => fileInputRef.current?.click()} variant="secondary">
                      <UploadCloud className="h-4 w-4" />
                      Upload avatar
                    </WorkspaceButton>
                  </div>

                  <div className="min-w-0 flex-1 space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <WorkspaceField label="Full name">
                        <WorkspaceInput onChange={(event) => setNameDraft(event.target.value)} value={nameDraft} />
                      </WorkspaceField>
                      <WorkspaceField label="Email">
                        <WorkspaceInput onChange={(event) => setEmailDraft(event.target.value)} value={emailDraft} />
                      </WorkspaceField>
                    </div>

                    <WorkspaceField label="Password">
                      <div className="flex flex-wrap items-center gap-3">
                        <WorkspaceInput disabled value="••••••••••••" />
                        <WorkspaceButton disabled={sendingReset} onClick={() => void handleSendResetLink()} variant="secondary">
                          {sendingReset ? "Sending..." : "Send reset link"}
                        </WorkspaceButton>
                      </div>
                    </WorkspaceField>

                    <div className="rounded-[8px] border border-[rgba(239,68,68,0.2)] bg-[var(--site-panel)] p-4">
                      <div className="text-sm font-medium text-[var(--site-text)]">Delete account</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--site-subtle)]">
                        Account deletion is still protected. Reach out before removing your workspace permanently.
                      </p>
                      <div className="mt-4">
                        <WorkspaceButton variant="danger">Delete account</WorkspaceButton>
                      </div>
                    </div>
                  </div>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "appearance" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Appearance</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-6">
                  <SegmentField
                    label="Theme"
                    options={[
                      { key: "dark", label: "Dark" },
                      { key: "light", label: "Light" },
                      { key: "system", label: "System" }
                    ]}
                    value={themePreference}
                    onChange={(value) => {
                      setTheme(value as "dark" | "light" | "system");
                      void persistSettings({ themePreference: value as "dark" | "light" | "system" });
                    }}
                  />

                  <SegmentField
                    label="Font size"
                    options={[
                      { key: "small", label: "Small" },
                      { key: "medium", label: "Medium" },
                      { key: "large", label: "Large" }
                    ]}
                    value={settings?.fontSize || "medium"}
                    onChange={(value) => void persistSettings({ fontSize: value as "small" | "medium" | "large" })}
                  />

                  <PreferenceToggleRow
                    checked={Boolean(settings?.compactMode)}
                    description="Use tighter message spacing across the workspace."
                    label="Compact mode"
                    onToggle={() => void persistSettings({ compactMode: !settings?.compactMode })}
                  />

                  <PreferenceToggleRow
                    checked={settings?.showModelIndicator ?? true}
                    description="Show which model replied to each message."
                    label="Show model indicator"
                    onToggle={() => void persistSettings({ showModelIndicator: !(settings?.showModelIndicator ?? true) })}
                  />

                  <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4 text-sm text-[var(--site-subtle)]">
                    Current resolved theme: <span className="text-[var(--site-text)]">{resolvedTheme}</span>
                  </div>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "models" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Models</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-6">
                  <SegmentField
                    label="Default model"
                    options={modelChoices.map((model) => ({ key: model.key, label: model.label }))}
                    value={settings?.defaultModel || "orbit-auto"}
                    onChange={(value) => void persistSettings({ defaultModel: value })}
                  />

                  <SegmentField
                    label="Routing preference"
                    options={[
                      { key: "auto", label: "Let Xeivora decide" },
                      { key: "single", label: "Always use one model" }
                    ]}
                    value={settings?.routingPreference || "auto"}
                    onChange={(value) => void persistSettings({ routingPreference: value as "auto" | "single" })}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    {modelChoices.map((model) => {
                      const enabled = enabledModels.includes(model.key);
                      return (
                        <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4" key={model.key}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-[var(--site-text)]">{model.label}</div>
                              <div className="mt-1 text-sm text-[var(--site-subtle)]">{model.description}</div>
                            </div>
                            <WorkspaceToggle
                              checked={enabled}
                              onClick={() => {
                                const next = enabled
                                  ? enabledModels.filter((entry) => entry !== model.key)
                                  : [...enabledModels, model.key];
                                void persistSettings({ enabledModels: next });
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      ["anthropic", "Anthropic API Key"],
                      ["openai", "OpenAI API Key"],
                      ["google", "Google Gemini API Key"],
                      ["deepseek", "DeepSeek API Key"]
                    ].map(([key, label]) => (
                      <WorkspaceField key={key} label={label}>
                        <WorkspaceInput
                          onChange={(event) => setProviderKeys((current) => ({ ...current, [key]: event.target.value }))}
                          placeholder="Paste key"
                          type="password"
                          value={providerKeys[key] || ""}
                        />
                      </WorkspaceField>
                    ))}
                  </div>

                  <WorkspaceButton onClick={() => void persistSettings({ providerApiKeys: providerKeys }, "Model settings updated.")}>Save model settings</WorkspaceButton>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "memory" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Project Memory</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-4">
                  <PreferenceToggleRow
                    checked={settings?.memoryEnabled ?? true}
                    description="Allow Xeivora to preserve reusable project memory across chats."
                    label="Enable Project Memory across chats"
                    onToggle={() => void persistSettings({ memoryEnabled: !(settings?.memoryEnabled ?? true) })}
                  />

                  <div className="space-y-3">
                    {memories.map((memory) => (
                      <div className="flex items-start justify-between gap-4 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4" key={memory.id}>
                        <div>
                          <div className="text-sm font-medium text-[var(--site-text)]">{memory.title}</div>
                          <div className="mt-2 text-sm leading-6 text-[var(--site-subtle)]">{memory.content}</div>
                        </div>
                        <button className="text-[var(--site-subtle)] transition hover:text-[#ef4444]" onClick={() => void handleRemoveMemory(memory.id)} type="button">
                          ×
                        </button>
                      </div>
                    ))}
                    {!memories.length ? <div className="text-sm text-[var(--site-subtle)]">No Project Memory entries yet.</div> : null}
                  </div>

                  <WorkspaceButton onClick={() => void handleClearMemory()} variant="danger">Clear Project Memory</WorkspaceButton>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "integrations" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Integrations</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-5">
                  <div className="flex flex-wrap gap-2">
                    {connectedIntegrations.length ? connectedIntegrations.map((integration) => (
                      <WorkspaceBadge key={integration.provider} tone="live">{integration.label}</WorkspaceBadge>
                    )) : <WorkspaceBadge tone="standby">No connected apps</WorkspaceBadge>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {integrations.map((integration) => (
                      <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4" key={integration.provider}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-[var(--site-text)]">{integration.label}</div>
                            <div className="mt-1 text-sm text-[var(--site-subtle)]">{integration.description}</div>
                          </div>
                          {integration.connected ? <WorkspaceBadge tone="live">Connected</WorkspaceBadge> : null}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {integration.connected ? (
                            <WorkspaceButton onClick={() => void handleDisconnectIntegration(integration.provider)} variant="secondary">Disconnect</WorkspaceButton>
                          ) : (
                            <WorkspaceButton onClick={() => { window.location.href = `/api/integrations/${integration.provider}/auth`; }}>Connect</WorkspaceButton>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "billing" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>Billing</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-6">
                  <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-4">
                    <div className="text-sm font-medium text-[var(--site-text)]">Current plan: {billingStatus?.plan || user.plan}</div>
                    <div className="mt-2 text-sm text-[var(--site-subtle)]">Usage this month: {usageLabel}</div>
                    {billingStatus?.stripeCustomerId ? <div className="mt-4"><ManageSubscription /></div> : null}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <PricingMiniCard
                      description="Unlimited messages, persistent memory, uploads, routing, and priority access."
                      price="£9.99/month"
                      title="Upgrade to Pro"
                    />
                    <PricingMiniCard
                      description="Shared workspaces, connected apps, billing controls, and team collaboration."
                      price="£49/user/month"
                      title="Upgrade to Teams"
                    />
                  </div>
                </div>
              </WorkspaceCard>
            ) : null}

            {activeSection === "api-keys" ? (
              <WorkspaceCard>
                <div className="border-b border-[color:var(--site-border)] pb-4">
                  <WorkspaceSectionTitle>API Keys</WorkspaceSectionTitle>
                </div>
                <div className="mt-6 space-y-5">
                  <WorkspaceField label="Xeivora API key">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <WorkspaceInput disabled value={maskedApiKey || "xv-••••••••••••••••"} />
                      <WorkspaceButton onClick={() => void handleCopyApiKey()} variant="secondary">
                        <Copy className="h-4 w-4" />
                        Copy
                      </WorkspaceButton>
                      <WorkspaceButton disabled={regeneratingApiKey} onClick={() => void handleRegenerateApiKey()} variant="secondary">
                        <RefreshCcw className="h-4 w-4" />
                        {regeneratingApiKey ? "Regenerating..." : "Regenerate"}
                      </WorkspaceButton>
                    </div>
                  </WorkspaceField>

                  <div className="grid gap-4 md:grid-cols-3">
                    <UsageStat label="Plan" value={billingStatus?.plan || user.plan} />
                    <UsageStat label="Credits" value={`${billingStatus?.credits ?? 0}`} />
                    <UsageStat label="Created" value={settings?.xeivoraApiKeyCreatedAt ? new Date(settings.xeivoraApiKeyCreatedAt).toLocaleDateString() : "Not generated"} />
                  </div>
                </div>
              </WorkspaceCard>
            ) : null}
          </div>
        </div>
      </div>
    </WorkspacePageShell>
  );
}

function PreferenceToggleRow({
  checked,
  description,
  label,
  onToggle
}: {
  checked: boolean;
  description: string;
  label: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4">
      <div>
        <div className="text-sm font-medium text-[var(--site-text)]">{label}</div>
        <div className="mt-2 text-sm leading-6 text-[var(--site-subtle)]">{description}</div>
      </div>
      <WorkspaceToggle checked={checked} onClick={onToggle} />
    </div>
  );
}

function SegmentField({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string }>;
  value: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[12px] uppercase tracking-[0.06em] text-[var(--site-subtle)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.key === value;
          return (
            <button
              className={cn(
                "rounded-full border px-4 py-2 text-sm transition",
                active
                  ? "border-[var(--site-accent)] bg-[var(--site-accent-soft)] text-[var(--site-text)]"
                  : "border-[color:var(--site-border)] bg-[var(--site-panel)] text-[var(--site-subtle)] hover:text-[var(--site-text)]"
              )}
              key={option.key}
              onClick={() => onChange(option.key)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PricingMiniCard({ description, price, title }: { description: string; price: string; title: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] p-5">
      <div className="text-base font-medium text-[var(--site-text)]">{title}</div>
      <div className="mt-3 text-[28px] font-bold text-[var(--site-text)]">{price}</div>
      <div className="mt-3 text-sm leading-6 text-[var(--site-subtle)]">{description}</div>
    </div>
  );
}

function UsageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-[color:var(--site-border)] bg-[var(--site-panel)] px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--site-subtle)]">{label}</div>
      <div className="mt-2 text-sm text-[var(--site-text)]">{value}</div>
    </div>
  );
}

function Feedback({ children, tone }: { children: string; tone: "success" | "error" }) {
  return (
    <div
      className={cn(
        "rounded-[8px] border px-4 py-3 text-sm",
        tone === "success"
          ? "border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-[#a7f3d0]"
          : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.08)] text-[#fecaca]"
      )}
    >
      {children}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "X";
}

function createXeivoraApiKey() {
  return `xv-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`.slice(0, 22);
}

function maskApiKey(value: string) {
  if (!value) {
    return "";
  }

  return `${value.slice(0, 3)}-••••••••••••••••`;
}
