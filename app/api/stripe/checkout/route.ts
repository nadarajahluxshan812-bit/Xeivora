import { NextRequest, NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";
import { BILLING_APP_URL, buildCheckoutLineItem, getPlanConfig, getStripe, isStripeConfigured } from "@/lib/stripe";

const billingStore = require("@/lib/server/billing-store");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    }

    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const { planKey } = (await request.json()) as { planKey?: "pro" | "starter_credits" };
    if (!planKey || (planKey !== "pro" && planKey !== "starter_credits")) {
      return NextResponse.json({ error: "A valid plan is required." }, { status: 400 });
    }

    const stripe = getStripe();
    const plan = getPlanConfig(planKey);
    const billingProfile = await billingStore.getBillingProfile(viewer.id);

    let customerId = billingProfile.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.email,
        name: viewer.name,
        metadata: { xeivora_user_id: viewer.id }
      });
      customerId = customer.id;
      await billingStore.upsertBillingProfile(viewer.id, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_update: {
        address: "auto",
        name: "auto"
      },
      mode: plan.mode,
      payment_method_types: ["card"],
      line_items: [buildCheckoutLineItem(planKey)],
      success_url: `${BILLING_APP_URL}/pricing?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BILLING_APP_URL}/pricing?payment=cancelled`,
      metadata: {
        user_id: viewer.id,
        plan_key: planKey
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      tax_id_collection: { enabled: true }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[Xeivora] Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
