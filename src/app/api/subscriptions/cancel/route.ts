import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

export async function POST() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider, provider_subscription_id, plan, status")
    .eq("user_id", user.id)
    .single();

  if (!sub?.provider_subscription_id) {
    return NextResponse.json(
      { success: false, error: "No active subscription found" },
      { status: 404 }
    );
  }

  if (sub.plan !== "pro") {
    return NextResponse.json(
      { success: false, error: "No active Pro subscription" },
      { status: 400 }
    );
  }

  try {
    if (sub.provider !== "stripe") {
      throw new Error("Only Stripe subscriptions can be cancelled from this flow");
    }

    const stripe = getStripe();
    await stripe.subscriptions.update(sub.provider_subscription_id, {
      cancel_at_period_end: true,
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancellation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
