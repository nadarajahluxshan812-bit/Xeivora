import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { getPlanCreditAmount, getStripe, isStripeConfigured } from "@/lib/stripe";

const authStore = require("@/lib/server/auth-store");
const billingStore = require("@/lib/server/billing-store");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCustomerId(customer: string | { id: string } | null | undefined) {
  return typeof customer === "string" ? customer : customer?.id || null;
}

function getSubscriptionId(subscription: string | { id: string } | null | undefined) {
  return typeof subscription === "string" ? subscription : subscription?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    }

    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Session id is required." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.user_id !== viewer.id) {
      return NextResponse.json({ error: "This checkout session does not belong to the signed-in user." }, { status: 403 });
    }

    const planKey = session.metadata?.plan_key === "starter_credits" ? "starter_credits" : "pro";
    const result = await billingStore.finalizeCheckoutSession({
      sessionId: session.id,
      userId: viewer.id,
      customerId: getCustomerId(session.customer),
      mode: session.mode,
      subscriptionId: getSubscriptionId(session.subscription),
      subscriptionStatus: session.status || "complete",
      planKey,
      creditAmount: getPlanCreditAmount(planKey)
    });

    if (session.mode === "subscription") {
      await authStore.setUserPlan(viewer.id, "Pro");
    }

    return NextResponse.json({
      ok: true,
      firstTime: result.firstTime,
      plan: session.mode === "subscription" ? "Pro" : viewer.plan,
      credits: result.profile.credits
    });
  } catch (error) {
    console.error("[Xeivora] Stripe checkout completion sync failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sync checkout." },
      { status: 500 }
    );
  }
}
