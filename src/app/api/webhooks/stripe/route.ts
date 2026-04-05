import Stripe from "stripe";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe/server";
import { createSupabaseService } from "@/lib/supabase/service";

function mapStripeStatus(status: Stripe.Subscription.Status): {
  plan: "free" | "pro";
  status: string;
} {
  if (status === "canceled" || status === "incomplete_expired" || status === "unpaid") {
    return { plan: "free", status };
  }

  if (status === "past_due") {
    return { plan: "pro", status: "halted" };
  }

  return { plan: "pro", status: "active" };
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  if (!userId) {
    return;
  }

  const currentPeriodEnd =
    subscription.items.data[0]?.current_period_end ?? null;

  const supabase = createSupabaseService();
  const mapped = mapStripeStatus(subscription.status);

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: mapped.plan,
      provider: mapped.plan === "pro" ? "stripe" : null,
      provider_subscription_id: mapped.plan === "pro" ? subscription.id : null,
      status: mapped.status,
      current_period_end:
        mapped.plan === "pro" && currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Invalid webhook signature",
      { status: 400 }
    );
  }

  const supabase = createSupabaseService();
  const eventId = event.id;
  const { data: existing } = await supabase
    .from("processed_webhook_events")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    return new Response("Already processed", { status: 200 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") {
        const stripe = getStripe();
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await syncSubscription(subscription);
      }
      break;
    }
    default:
      break;
  }

  await supabase.from("processed_webhook_events").insert({
    event_id: eventId,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  });

  return new Response("OK", { status: 200 });
}
