import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { razorpay } from "@/lib/razorpay/client";

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

  // Fetch the user's Razorpay subscription ID
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id, plan, status")
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
    // cancel at cycle end = true → user keeps Pro until period end
    await razorpay.subscriptions.cancel(sub.provider_subscription_id, true);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cancellation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
