/**
 * POST /api/webhook — Stripe webhook receiver.
 * Configure in Stripe Dashboard: endpoint = <SITE_URL>/api/webhook
 * Events: checkout.session.completed
 */
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { adminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing_sig_or_secret" }, { status: 400 });
  }
  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_signature", message: (err as Error).message },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const readingId = session.metadata?.reading_id;
    if (readingId) {
      const supabase = adminClient();
      await supabase
        .from("readings")
        .update({
          status: "paid",
          stripe_payment_intent: (session.payment_intent as string) ?? null,
        })
        .eq("id", readingId);
    }
  }

  return NextResponse.json({ received: true });
}
