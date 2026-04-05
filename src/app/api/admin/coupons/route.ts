import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { getStripe } from "@/lib/stripe/server";
import { createRequestId, logError, logInfo } from "@/lib/observability";

interface CouponRequestBody {
  code?: string;
  percentOff?: number;
  duration?: "once" | "forever" | "repeating";
  durationInMonths?: number;
  maxRedemptions?: number;
}

export async function POST(request: NextRequest): Promise<Response> {
  const requestId = createRequestId();
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as CouponRequestBody;
    const code = body.code?.trim().toUpperCase();
    const percentOff = body.percentOff;
    const duration = body.duration ?? "once";
    const durationInMonths = body.durationInMonths;
    const maxRedemptions = body.maxRedemptions;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Promotion code is required" },
        { status: 400 }
      );
    }

    if (!percentOff || percentOff < 1 || percentOff > 100) {
      return NextResponse.json(
        { success: false, error: "Percent off must be between 1 and 100" },
        { status: 400 }
      );
    }

    if (duration === "repeating" && (!durationInMonths || durationInMonths < 1)) {
      return NextResponse.json(
        { success: false, error: "Repeating coupons need durationInMonths" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration,
      duration_in_months: duration === "repeating" ? durationInMonths : undefined,
      max_redemptions: maxRedemptions,
      metadata: {
        created_by: user.email ?? user.id,
      },
    });

    const promotionCode = await stripe.promotionCodes.create({
      promotion: {
        type: "coupon",
        coupon: coupon.id,
      },
      code,
      max_redemptions: maxRedemptions,
      metadata: {
        created_by: user.email ?? user.id,
      },
    });

    logInfo("admin.coupon.created", {
      requestId,
      adminUserId: user.id,
      adminEmail: user.email,
      couponId: coupon.id,
      promotionCodeId: promotionCode.id,
      code,
      percentOff,
      duration,
    });

    return NextResponse.json({
      success: true,
      couponId: coupon.id,
      promotionCode: promotionCode.code,
    });
  } catch (error) {
    logError("admin.coupon.failed", error, {
      requestId,
      adminUserId: user.id,
      adminEmail: user.email,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Coupon creation failed",
      },
      { status: 500 }
    );
  }
}
