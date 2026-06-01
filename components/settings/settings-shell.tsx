"use client";

import { LogOut, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  WorkspaceBadge,
  WorkspaceButton,
  WorkspaceCard,
  WorkspaceField,
  WorkspaceInput,
  WorkspacePageHero,
  WorkspacePageShell,
  WorkspaceSectionTitle,
  WorkspaceToggle
} from "@/components/workspace/workspace-page-ui";
import ManageSubscription from "@/components/payments/ManageSubscription";
import type { AuthUser } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

type SettingsShellProps = {
  initialUser: AuthUser;
};

type WorkspaceSettings = {
  memoryEnabled?: boolean;
  orchestrationEnabled?: boolean;
  continuityEnabled?: boolean;
  theme?: string;
  modelPreferenceOrder?: string[];
};

type BillingStatus = {
  plan: string;
  credits: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionStatus: string | null;
};
const sections = [
  { key: "profile", label: "Profile" },
  { key: "workspace", label: "Workspace" },
  { key: "providers", label: "Providers" },
  { key: "danger", label: "Danger zone" }
] as const;

type SectionKey = (typeof sections)[number]["key"];

export function SettingsShell({ initialUser }: SettingsShellProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<SectionKey>("profile");
  const [user, setUser] = useState<AuthUser>(initialUser);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, unknown> | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [nameDraft, setNameDraft] = useState(initialUser.name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/status/providers", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/stripe/billing", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextSettings, nextProviders, nextBilling]) => {
      setSettings(nextSettings);
      setProviderStatus(nextProviders);
      setBillingStatus(nextBilling);
    });
  }, []);

  const accountSummary = useMemo(
    () => [
      ["Plan", user.plan],
      ["Provider", user.provider === "google" ? "Google" : "Password"],
      ["Memory", user.preferences.memoryEnabled ? "Active" : "Paused"],
      ["Density", user.preferences.workspaceDensity]
    ],
    [user]
  );

  async function handleSaveProfile() {
    setSavingProfile(true);
    setFeedback(null);
    setError(null);

    const response = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameDraft,
        preferences: user.preferences
      })
    });
    const payload = (await response.json()) as { error?: string; user?: AuthUser };

    setSavingProfile(false);
    if (!response.ok || !payload.user) {
      setError(payload.error || "Unable to save your profile.");
      return;
    }

    setUser(payload.user);
    setFeedback("Profile updated.");
  }

  async function handleToggle(key: keyof WorkspaceSettings) {
    const nextSettings = {
      ...(settings || {}),
      [key]: !settings?.[key]
    };
    setSettings(nextSettings);
    setSavingSettings(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSettings)
    });
    setSavingSettings(false);
    setFeedback("Workspace settings updated.");
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <WorkspacePageShell statusLabel="Protected" viewer={user}>
      <div className="space-y-10">
        <WorkspacePageHero
          actions={
            <WorkspaceButton onClick={() => void handleLogout()} variant="secondary">
              <LogOut className="h-4 w-4" />
              Sign out
            </WorkspaceButton>
          }
          description="Manage your profile, workspace preferences, provider routing defaults, and account safety from one protected Xeivora control surface."
          eyebrow="Account settings"
          title="Profile and preferences"
        />

        {feedback ? <Feedback tone="success">{feedback}</Feedback> : null}
        {error ? <Feedback tone="error">{error}</Feedback> : null}

        <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#1a1410] p-3">
            <nav className="space-y-1">
              {sections.map((section) => {
                const active = activeSection === section.key;
                return (
                  <button
                    className={cn(
                      "flex w-full items-center rounded-[8px] border-l-2 px-4 py-3 text-left text-sm transition-colors",
                      active
                        ? "border-l-[#c96442] bg-[rgba(201,100,66,0.12)] text-white"
                        : "border-l-transparent text-[rgba(255,255,255,0.55)] hover:bg-[rgba(201,100,66,0.08)] hover:text-[#f0ead8]"
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
            <WorkspaceCard className={activeSection !== "profile" ? "opacity-70" : ""}>
              <div className="flex items-center justify-between gap-4 border-b border-[rgba(201,100,66,0.1)] pb-4">
                <WorkspaceSectionTitle>Profile</WorkspaceSectionTitle>
                <WorkspaceButton onClick={() => void handleSaveProfile()} variant="secondary">
                  Edit profile
                </WorkspaceButton>
              </div>

              <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c96442] text-base font-semibold text-white">
                  {initials(user.name)}
                </div>
                <div className="min-w-0 flex-1 space-y-5">
                  <div>
                    <div className="text-lg font-bold text-white">{user.name}</div>
                    <div className="mt-1 text-sm text-[rgba(255,255,255,0.4)]">{user.email}</div>
                    <div className="mt-3">
                      <WorkspaceBadge tone="learning">{user.plan}</WorkspaceBadge>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <WorkspaceField label="Display name">
                      <WorkspaceInput onChange={(event) => setNameDraft(event.target.value)} value={nameDraft} />
                    </WorkspaceField>
                    <WorkspaceField label="Authentication">
                      <WorkspaceInput disabled value={user.provider === "google" ? "Google Sign-In" : "Email + password"} />
                    </WorkspaceField>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <WorkspaceButton disabled={savingProfile} onClick={() => void handleSaveProfile()}>
                      <Save className="h-4 w-4" />
                      {savingProfile ? "Saving..." : "Save profile"}
                    </WorkspaceButton>
                  </div>
                </div>
              </div>
            </WorkspaceCard>

            <WorkspaceCard className={activeSection !== "workspace" ? "opacity-70" : ""}>
              <div className="border-b border-[rgba(201,100,66,0.1)] pb-4">
                <WorkspaceSectionTitle>Workspace preferences</WorkspaceSectionTitle>
              </div>
              <div className="mt-6 space-y-4">
                <PreferenceRow
                  checked={Boolean(settings?.memoryEnabled)}
                  description="Keep reusable facts and user context available across sessions."
                  label="Memory"
                  onToggle={() => void handleToggle("memoryEnabled")}
                />
                <PreferenceRow
                  checked={Boolean(settings?.orchestrationEnabled)}
                  description="Automatically route tasks across providers, tools, and workflows."
                  label="Orchestration"
                  onToggle={() => void handleToggle("orchestrationEnabled")}
                />
                <PreferenceRow
                  checked={Boolean(settings?.continuityEnabled)}
                  description="Preserve checkpoints and resume work when providers switch."
                  label="Continuity"
                  onToggle={() => void handleToggle("continuityEnabled")}
                />
              </div>
              {savingSettings ? <p className="mt-4 text-sm text-[rgba(255,255,255,0.35)]">Saving workspace settings…</p> : null}
            </WorkspaceCard>

            <WorkspaceCard className={activeSection !== "providers" ? "opacity-70" : ""}>
              <div className="border-b border-[rgba(201,100,66,0.1)] pb-4">
                <WorkspaceSectionTitle>Provider readiness</WorkspaceSectionTitle>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {Object.entries(providerStatus || {}).map(([key, value]) => (
                  <div className="rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#120e0a] p-4" key={key}>
                    <div className="text-[12px] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.5)]">{key}</div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-[rgba(255,255,255,0.55)]">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {accountSummary.map(([label, value]) => (
                  <div className="rounded-[8px] border border-[rgba(201,100,66,0.12)] bg-[#120e0a] px-4 py-4" key={label}>
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">{label}</div>
                    <div className="mt-2 text-sm text-white">{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[8px] border border-[rgba(201,100,66,0.15)] bg-[#120e0a] px-4 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.35)]">Billing</div>
                    <div className="mt-2 text-sm text-white">
                      {billingStatus?.stripeSubscriptionStatus
                        ? `Subscription ${billingStatus.stripeSubscriptionStatus}`
                        : "Starter workspace"}
                    </div>
                    <div className="mt-2 text-sm text-[rgba(255,255,255,0.5)]">
                      Credits available: {billingStatus?.credits ?? 0}
                    </div>
                  </div>
                  {billingStatus?.stripeCustomerId ? <ManageSubscription /> : null}
                </div>
              </div>
            </WorkspaceCard>

            <section className={cn(activeSection !== "danger" ? "opacity-70" : "")}>
              <div className="rounded-[8px] border border-[rgba(239,68,68,0.2)] bg-[#1a1410] p-6">
                <div className="border-b border-[rgba(239,68,68,0.16)] pb-4">
                  <WorkspaceSectionTitle>Danger zone</WorkspaceSectionTitle>
                </div>
                <p className="mt-4 max-w-[36rem] text-sm leading-7 text-[rgba(255,255,255,0.5)]">
                  Removing this account would affect your current authenticated workspace. This action is intentionally locked until
                  account deletion flows are finalized.
                </p>
                <div className="mt-6">
                  <WorkspaceButton variant="danger">Delete account</WorkspaceButton>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </WorkspacePageShell>
  );
}

function PreferenceRow({
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
    <div className="flex items-start justify-between gap-4 rounded-[8px] border border-[rgba(201,100,66,0.12)] bg-[#120e0a] px-4 py-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <p className="mt-2 max-w-[34rem] text-sm leading-7 text-[rgba(255,255,255,0.5)]">{description}</p>
      </div>
      <WorkspaceToggle checked={checked} onClick={onToggle} />
    </div>
  );
}

function Feedback({ children, tone }: { children: string; tone: "success" | "error" }) {
  return (
    <div
      className={cn(
        "rounded-[8px] border px-4 py-3 text-sm",
        tone === "success"
          ? "border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.12)] text-[#22c55e]"
          : "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] text-[rgba(239,68,68,0.85)]"
      )}
    >
      {children}
    </div>
  );
}

function initials(value: string) {
  const parts = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "");
  return parts.join("") || "X";
}
