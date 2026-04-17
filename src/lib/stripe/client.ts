import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2026-03-25.dahlia",
});

export const PRICE_MYR_CENTS = Number(
  process.env.STRIPE_PRICE_MYR_CENTS ?? 1990,
);
