"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/settings", { cache: "no-store" }).then((response) => response.json()),
      fetch("/api/status", { cache: "no-store" }).then((response) => response.json())
    ]).then(([nextSettings, nextStatus]) => {
      setSettings(nextSettings);
      setStatus(nextStatus);
    });
  }, []);

  async function toggle(key: string) {
    const next = { ...settings, [key]: !settings?.[key] };
    setSettings(next);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next)
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-4 text-white md:px-6">
      <div className="mx-auto max-w-5xl">
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70" href="/chat">
          Back to chat
        </Link>
        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white p-7 text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">Settings</p>
          <h1 className="mt-3 text-4xl font-semibold">Workspace controls</h1>
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {["memoryEnabled", "orchestrationEnabled", "continuityEnabled"].map((key) => (
              <button className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-left text-white" key={key} onClick={() => void toggle(key)} type="button">
                <span className="block font-semibold">{key}</span>
                <span className="mt-2 block text-sm text-white/55">{settings?.[key] ? "Enabled" : "Disabled"}</span>
              </button>
            ))}
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white">
              <h2 className="font-semibold">API key status</h2>
              <pre className="mt-3 overflow-auto text-xs text-white/55">{JSON.stringify(status?.providers || {}, null, 2)}</pre>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/65 p-5 text-white">
              <h2 className="font-semibold">Data controls</h2>
              <p className="mt-2 text-sm text-white/55">Export/import and local reset hooks are represented for MVP wiring.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
