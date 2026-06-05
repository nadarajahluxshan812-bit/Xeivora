"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type SyncState = "idle" | "syncing" | "success" | "error" | "cancelled";

export function PricingStatusBanner({ floating = false }: { floating?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");
  const [syncState, setSyncState] = useState<SyncState>(payment === "cancelled" ? "cancelled" : "idle");
  const [message, setMessage] = useState<string | null>(payment === "cancelled" ? "Checkout cancelled." : null);

  useEffect(() => {
    if (payment !== "cancelled") {
      return;
    }

    setSyncState("cancelled");
    setMessage("Checkout cancelled.");

    const timeout = window.setTimeout(() => {
      setSyncState("idle");
      setMessage(null);

      const params = new URLSearchParams(searchParams.toString());
      params.delete("payment");
      params.delete("session_id");

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(nextUrl, { scroll: false });
    }, 2000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [pathname, payment, router, searchParams]);

  useEffect(() => {
    if (payment !== "success" || !sessionId) {
      return;
    }

    let cancelled = false;

    async function syncCheckout() {
      setSyncState("syncing");
      setMessage("Confirming your Stripe checkout...");

      try {
        const response = await fetch("/api/stripe/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
        const payload = (await response.json()) as { error?: string; credits?: number; plan?: string };

        if (!response.ok) {
          throw new Error(payload.error || "We could not confirm your payment yet.");
        }

        if (!cancelled) {
          setSyncState("success");
          if (payload.plan === "Pro") {
            setMessage("Pro plan unlocked. Xeivora updated your workspace successfully.");
          } else if (typeof payload.credits === "number") {
            setMessage(`Starter Credits added successfully. Current balance: ${payload.credits}.`);
          } else {
            setMessage("Payment confirmed successfully.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          setSyncState("error");
          setMessage(error instanceof Error ? error.message : "Unable to confirm payment.");
        }
      }
    }

    void syncCheckout();

    return () => {
      cancelled = true;
    };
  }, [payment, sessionId]);

  const tone = useMemo(() => {
    switch (syncState) {
      case "success":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
      case "error":
        return "border-red-500/30 bg-red-500/10 text-red-100";
      case "cancelled":
        return "border-[color:var(--site-border-strong)] bg-[color:var(--site-accent-soft)] text-[color:var(--site-text)]";
      default:
        return "border-[color:var(--site-border-strong)] bg-[color:var(--site-accent-soft)] text-[color:var(--site-text)]";
    }
  }, [syncState]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        `rounded-[16px] border px-5 py-4 text-sm ${tone}`,
        floating
          ? "fixed left-1/2 top-24 z-[80] w-[min(92vw,820px)] -translate-x-1/2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          : "mx-auto mb-8 max-w-[1180px]"
      )}
    >
      {message}
    </div>
  );
}
