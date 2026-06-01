import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth";

const billingStore = require("@/lib/server/billing-store");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const billing = await billingStore.getBillingProfile(viewer.id);
  return NextResponse.json({
    plan: viewer.plan,
    credits: billing.credits,
    stripeCustomerId: billing.stripeCustomerId,
    stripeSubscriptionStatus: billing.stripeSubscriptionStatus,
    stripeSubscriptionId: billing.stripeSubscriptionId
  });
}
