"use client";

import { useState } from "react";

type UpgradeButtonProps = {
  fullWidth?: boolean;
  label: string;
  planKey: "pro" | "starter_credits";
  variant?: "primary" | "secondary";
};

export default function UpgradeButton({
  fullWidth = true,
  label,
  planKey,
  variant = "primary"
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey })
      });

      if (response.status === 401) {
        window.location.href = "/login?next=/pricing";
        return;
      }

      const payload = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Checkout failed.");
      }

      window.location.href = payload.url;
    } catch (error) {
      console.error("[Xeivora] Stripe checkout button error:", error);
      window.alert(error instanceof Error ? error.message : "Payment error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className={[
        "mt-9 inline-flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold transition",
        fullWidth ? "w-full" : "",
        variant === "primary"
          ? "bg-[color:var(--site-accent)] text-white hover:bg-[color:var(--site-accent-strong)]"
          : "border border-[color:var(--site-border-strong)] bg-transparent text-[color:var(--site-text)] hover:bg-[color:var(--site-accent-soft)]",
        loading ? "cursor-not-allowed opacity-70" : ""
      ].join(" ")}
      disabled={loading}
      onClick={() => void handleClick()}
      type="button"
    >
      {loading ? "Redirecting..." : label}
    </button>
  );
}
