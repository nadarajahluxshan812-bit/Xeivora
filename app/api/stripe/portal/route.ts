import { NextResponse } from "next/server";

import { BILLING_APP_URL, getStripe, isStripeConfigured } from "@/lib/stripe";
import { getViewer } from "@/lib/auth";

const billingStore = require("@/lib/server/billing-store");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    }

    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const billingProfile = await billingStore.getBillingProfile(viewer.id);
    if (!billingProfile.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found for this account." }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: billingProfile.stripeCustomerId,
      return_url: `${BILLING_APP_URL}/settings`
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Xeivora] Stripe portal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to open the billing portal." },
      { status: 500 }
    );
  }
}
