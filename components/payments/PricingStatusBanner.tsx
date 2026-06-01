"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type SyncState = "idle" | "syncing" | "success" | "error" | "cancelled";

export function PricingStatusBanner() {
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");
  const [syncState, setSyncState] = useState<SyncState>(payment === "cancelled" ? "cancelled" : "idle");
  const [message, setMessage] = useState<string | null>(payment === "cancelled" ? "Checkout cancelled." : null);

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
        return "border-[rgba(201,100,66,0.25)] bg-[rgba(201,100,66,0.08)] text-[#f0ead8]";
      default:
        return "border-[rgba(201,100,66,0.25)] bg-[rgba(201,100,66,0.08)] text-[#f0ead8]";
    }
  }, [syncState]);

  if (!message) {
    return null;
  }

  return (
    <div className={`mx-auto mb-8 max-w-[1180px] rounded-[16px] border px-5 py-4 text-sm ${tone}`}>
      {message}
    </div>
  );
}
