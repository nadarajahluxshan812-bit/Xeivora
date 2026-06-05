"use client";

import { useState } from "react";

export default function ManageSubscription() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Unable to open billing portal.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("[Xeivora] Billing portal error:", error);
      window.alert(error instanceof Error ? error.message : "Unable to open billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-[10px] border border-[color:var(--site-border-strong)] bg-transparent px-4 text-sm font-medium text-[color:var(--site-text)] transition hover:bg-[color:var(--site-accent-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      onClick={() => void handleClick()}
      type="button"
    >
      {loading ? "Opening..." : "Manage subscription"}
    </button>
  );
}
