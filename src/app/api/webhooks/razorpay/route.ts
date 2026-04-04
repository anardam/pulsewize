import { NextRequest } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@supabase/supabase-js";
import type { RazorpayWebhookPayload } from "@/lib/razorpay/types";

// CRITICAL: Do NOT use createSupabaseServer here — we need service_role key to bypass RLS.
// The subscriptions table has no user-facing UPDATE policy.
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Read raw body — MUST use request.text() before JSON.parse()
  //    Signature is HMAC over raw bytes; re-stringifying parsed JSON can differ.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  // NOTE on D-11: CONTEXT.md D-11 says "deduplicate by payment_id" — the correct
  // Razorpay header for event-level idempotency is x-razorpay-event-id (not a payment_id).
  // x-razorpay-event-id is unique per webhook delivery attempt and is the canonical
  // deduplication key per Razorpay docs. This supersedes the imprecise D-11 wording.
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";

  // 2. Verify signature
  const isValid = Razorpay.validateWebhookSignature(
    rawBody,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET!
  );
  if (!isValid) {
    return new Response("Forbidden", { status: 403 });
  }

  // 3. Parse body (after verification)
  const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  const { event } = payload;

  // 4. Idempotency check — return 200 immediately if already processed
  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();
  if (existing) {
    return new Response("Already processed", { status: 200 });
  }

  // 5. Extract subscription entity
  const sub = payload.payload?.subscription?.entity;
  if (!sub) return new Response("OK", { status: 200 });

  const userId = sub.notes?.user_id;
  if (!userId) return new Response("OK", { status: 200 });

  // 6. State machine: mirror Razorpay subscription state to Supabase
  if (event === "subscription.charged") {
    // Successful payment — grant Pro access
    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        plan: "pro",
        provider: "razorpay",
        provider_subscription_id: sub.id,
        status: "active",
        current_period_end: new Date(sub.current_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } else if (event === "subscription.halted") {
    // Payment failed after retries — keep plan=pro (grace period), only update status
    // Per RESEARCH.md: do NOT downgrade to free on halted
    await supabase
      .from("subscriptions")
      .update({ status: "halted", updated_at: new Date().toISOString() })
      .eq("provider_subscription_id", sub.id);
  } else if (
    event === "subscription.cancelled" ||
    event === "subscription.completed"
  ) {
    // Subscription ended — downgrade to free
    await supabase
      .from("subscriptions")
      .update({
        plan: "free",
        status: event === "subscription.cancelled" ? "cancelled" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", sub.id);
  }
  // Other events (activated, pending_deactivated, etc.) are informational — no state change needed

  // 7. Record as processed (idempotency log)
  await supabase.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: event,
    processed_at: new Date().toISOString(),
  });

  return new Response("OK", { status: 200 });
}
