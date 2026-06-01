import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getPlanCreditAmount, getStripe, isStripeConfigured } from "@/lib/stripe";

const authStore = require("@/lib/server/auth-store");
const billingStore = require("@/lib/server/billing-store");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined) {
  return typeof customer === "string" ? customer : customer?.id || null;
}

function getSubscriptionId(subscription: string | Stripe.Subscription | null | undefined) {
  return typeof subscription === "string" ? subscription : subscription?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured yet." }, { status: 503 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Stripe webhook secret is not configured yet." }, { status: 503 });
    }

    const signature = (await headers()).get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const stripe = getStripe();
    const rawBody = await request.text();
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (!(await billingStore.markProcessedEvent(event.id))) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) {
          break;
        }

        const planKey = session.metadata?.plan_key === "starter_credits" ? "starter_credits" : "pro";
        const result = await billingStore.finalizeCheckoutSession({
          sessionId: session.id,
          userId,
          customerId: getCustomerId(session.customer),
          mode: session.mode,
          subscriptionId: getSubscriptionId(session.subscription),
          subscriptionStatus: session.status || "complete",
          planKey,
          creditAmount: getPlanCreditAmount(planKey)
        });

        if (session.mode === "subscription") {
          await authStore.setUserPlan(userId, "Pro");
        }

        console.log("[Xeivora] Stripe checkout completed:", session.id, result.firstTime ? "processed" : "already processed");
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const profile = await billingStore.setSubscriptionStatusByCustomer(
          getCustomerId(subscription.customer),
          subscription.id,
          subscription.status
        );
        if (profile?.userId) {
          await authStore.setUserPlan(profile.userId, subscription.status === "active" ? "Pro" : "Starter");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const profile = await billingStore.clearSubscriptionByCustomer(getCustomerId(subscription.customer));
        if (profile?.userId) {
          await authStore.setUserPlan(profile.userId, "Starter");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = getCustomerId(invoice.customer);
        await billingStore.setSubscriptionStatusByCustomer(customerId, null, "past_due");
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = getCustomerId(invoice.customer);
        const profile = await billingStore.setSubscriptionStatusByCustomer(customerId, null, "active");
        if (profile?.userId) {
          await authStore.setUserPlan(profile.userId, "Pro");
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Xeivora] Stripe webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook verification failed." },
      { status: 400 }
    );
  }
}
