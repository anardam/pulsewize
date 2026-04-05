import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { isAdminEmail } from "@/lib/admin";
import { createRequestId, logError, logInfo } from "@/lib/observability";

interface RequestBody {
  userId?: string;
  action?: "grant_pro" | "set_free";
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
    const body = (await request.json()) as RequestBody;
    const userId = body.userId?.trim();
    const action = body.action;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing userId or action" },
        { status: 400 }
      );
    }

    let serviceSupabase: ReturnType<typeof createSupabaseService>;
    try {
      serviceSupabase = createSupabaseService();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Admin service configuration is missing",
        },
        { status: 500 }
      );
    }

    if (action === "grant_pro") {
      const { error } = await serviceSupabase.from("subscriptions").upsert(
        {
          user_id: userId,
          plan: "pro",
          provider: null,
          provider_subscription_id: null,
          status: "active",
          current_period_end: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        throw error;
      }
    } else {
      const { error } = await serviceSupabase
        .from("subscriptions")
        .update({
          plan: "free",
          provider: null,
          provider_subscription_id: null,
          status: "active",
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    }

    logInfo("admin.subscription.updated", {
      requestId,
      adminUserId: user.id,
      adminEmail: user.email,
      targetUserId: userId,
      action,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("admin.subscription.failed", error, {
      requestId,
      adminUserId: user.id,
      adminEmail: user.email,
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Admin action failed",
      },
      { status: 500 }
    );
  }
}
