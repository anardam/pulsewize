import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { razorpay } from "@/lib/razorpay/client";

export async function POST(): Promise<NextResponse> {
  // 1. Auth check
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

  // 2. Create Razorpay subscription
  // IMPORTANT: uses subscription_id (not order_id) — subscriptions and orders are separate flows
  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: process.env.RAZORPAY_PLAN_ID!,
      total_count: 120, // 10 years of monthly cycles
      quantity: 1,
      customer_notify: 1, // Razorpay sends payment receipts
      notes: { user_id: user.id }, // CRITICAL: webhook uses this to find the Supabase user
    });

    return NextResponse.json({ success: true, subscriptionId: subscription.id });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to create subscription";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
