"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, LogOut, Save, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import type { AuthUser } from "@/lib/auth-types";

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

export function SettingsShell({ initialUser }: SettingsShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(initialUser);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, unknown> | null>(null);
  const [nameDraft, setNameDraft] = useState(initialUser.name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/status/providers", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextSettings, nextProviders]) => {
      setSettings(nextSettings);
      setProviderStatus(nextProviders);
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
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WorkspaceSidebar statusLabel="Protected" viewer={user} />
        <div className="space-y-4">
          <section className="glow-shell p-6">
            <div className="section-kicker">Account settings</div>
            <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">Control your Xeivora workspace identity</h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-white/56">
                  Manage your account, memory preferences, orchestration defaults, and provider readiness from a single
                  protected surface.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/78 transition hover:bg-white/[0.06] hover:text-white"
                onClick={() => void handleLogout()}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </section>

          {feedback ? <Feedback tone="success">{feedback}</Feedback> : null}
          {error ? <Feedback tone="error">{error}</Feedback> : null}

          <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-panel p-5">
              <div className="section-kicker">Profile</div>
              <div className="mt-4 grid gap-5 lg:grid-cols-[160px_minmax(0,1fr)]">
                <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#5b34f7]/18 via-[#7c3aed]/18 to-[#d946ef]/18 text-3xl font-semibold text-white">
                  {initials(user.name)}
                </div>
                <div className="space-y-4">
                  <label className="grid gap-2">
                    <span className="text-sm text-white/60">Display name</span>
                    <input
                      className="h-14 rounded-[18px] border border-white/10 bg-slate-950/72 px-4 text-white outline-none"
                      onChange={(event) => setNameDraft(event.target.value)}
                      value={nameDraft}
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ReadOnlyField label="Email" value={user.email} />
                    <ReadOnlyField label="Authentication" value={user.provider === "google" ? "Google Sign-In" : "Email + password"} />
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                    disabled={savingProfile}
                    onClick={() => void handleSaveProfile()}
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </div>
            </section>

            <section className="glass-panel p-5">
              <div className="section-kicker">Account overview</div>
              <div className="mt-4 grid gap-3">
                {accountSummary.map(([label, value]) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 px-4 py-4" key={label}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</div>
                    <div className="mt-2 text-base font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
            <section className="glass-panel p-5">
              <div className="section-kicker">Workspace behavior</div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ToggleCard
                  active={Boolean(settings?.memoryEnabled)}
                  description="Keep reusable facts and preferences available across sessions."
                  icon={BrainCircuit}
                  label="Memory"
                  onClick={() => void handleToggle("memoryEnabled")}
                />
                <ToggleCard
                  active={Boolean(settings?.orchestrationEnabled)}
                  description="Let Xeivora route across providers, tools, and continuity steps automatically."
                  icon={Sparkles}
                  label="Orchestration"
                  onClick={() => void handleToggle("orchestrationEnabled")}
                />
                <ToggleCard
                  active={Boolean(settings?.continuityEnabled)}
                  description="Preserve checkpoints and recover tasks when providers fail or switch."
                  icon={ShieldCheck}
                  label="Continuity"
                  onClick={() => void handleToggle("continuityEnabled")}
                />
              </div>
              {savingSettings ? <p className="mt-4 text-sm text-white/42">Saving workspace settings...</p> : null}
            </section>

            <section className="glass-panel p-5">
              <div className="section-kicker">Provider readiness</div>
              <div className="mt-4 space-y-3">
                {Object.entries(providerStatus || {}).map(([key, value]) => (
                  <div className="rounded-[1.3rem] border border-white/8 bg-slate-950/72 px-4 py-4" key={key}>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{key}</div>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs leading-6 text-white/58">
                      {JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-slate-950/72 px-4 py-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">{label}</div>
      <div className="mt-2 text-sm text-white">{value}</div>
    </div>
  );
}

function ToggleCard({
  active,
  description,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-[1.5rem] border p-5 text-left transition ${
        active
          ? "border-[#8b5cf6]/30 bg-[#171126] text-white"
          : "border-white/10 bg-slate-950/72 text-white/74 hover:border-white/16 hover:bg-white/[0.03]"
      }`}
      onClick={onClick}
      type="button"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 text-base font-medium">{label}</div>
      <p className="mt-2 text-sm leading-7 opacity-80">{description}</p>
      <div className="mt-4 text-[11px] uppercase tracking-[0.18em] text-white/34">{active ? "Enabled" : "Disabled"}</div>
    </button>
  );
}

function Feedback({ children, tone }: { children: string; tone: "success" | "error" }) {
  return (
    <div
      className={`rounded-[1.4rem] border px-4 py-3 text-sm ${
        tone === "success"
          ? "border-emerald-400/18 bg-emerald-400/[0.08] text-emerald-100"
          : "border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
      }`}
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
