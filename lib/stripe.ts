import Stripe from "stripe";

export type StripePlanKey = "pro" | "starter_credits";

let stripeSingleton: Stripe | null = null;

function readAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://xeivora.com"
  ).replace(/\/$/, "");
}

export const BILLING_APP_URL = readAppUrl();

export const PLANS = {
  free: {
    key: "free",
    name: "Starter",
    price: 0,
    features: ["20 messages per day", "Gemini Flash model", "Basic memory", "Web access"]
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: 19,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    mode: "subscription" as const,
    features: [
      "Unlimited messages",
      "All AI models",
      "Full context preservation",
      "Persistent memory",
      "File uploads",
      "Auto model switching",
      "Priority routing"
    ]
  },
  starter_credits: {
    key: "starter_credits",
    name: "Starter Credits",
    price: 4.99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    credits: 500,
    mode: "payment" as const,
    features: ["500 AI interactions", "All models included", "Never expires"]
  }
} as const;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured yet.");
  }

  stripeSingleton ||= new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true
  });

  return stripeSingleton;
}

export function getPlanConfig(planKey: StripePlanKey) {
  const plan = PLANS[planKey];
  if (!plan) {
    throw new Error("Unknown Stripe plan.");
  }

  return plan;
}

export function getPlanCreditAmount(planKey: StripePlanKey) {
  return planKey === "starter_credits" ? PLANS.starter_credits.credits : 0;
}

export function buildCheckoutLineItem(planKey: StripePlanKey): Stripe.Checkout.SessionCreateParams.LineItem {
  const plan = getPlanConfig(planKey);

  if (plan.priceId) {
    return {
      price: plan.priceId,
      quantity: 1
    };
  }

  if (planKey === "pro") {
    return {
      price_data: {
        currency: "gbp",
        recurring: { interval: "month" },
        unit_amount: 1900,
        product_data: {
          name: "Xeivora Pro",
          description: "Unlimited AI access with persistent memory, routing, and continuity."
        }
      },
      quantity: 1
    };
  }

  return {
    price_data: {
      currency: "gbp",
      unit_amount: 499,
      product_data: {
        name: "Xeivora Starter Credits",
        description: "500 one-time AI interactions for pay-as-you-go usage."
      }
    },
    quantity: 1
  };
}
