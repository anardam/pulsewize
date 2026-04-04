import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

// Mock Razorpay client
vi.mock("@/lib/razorpay/client", () => ({
  razorpay: {
    subscriptions: {
      cancel: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/subscriptions/cancel/route";
import { createSupabaseServer } from "@/lib/supabase/server";
import { razorpay } from "@/lib/razorpay/client";

function makeRequest() {
  return new Request("http://localhost/api/subscriptions/cancel", { method: "POST" });
}

const mockProSub = {
  provider_subscription_id: "sub_test123",
  plan: "pro",
  status: "active",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/subscriptions/cancel", () => {
  it("returns 401 if user is not authenticated", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    });
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 404 if no subscription row exists", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      }),
    });
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(404);
  });

  it("returns 400 if plan is not pro", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { provider_subscription_id: "sub_test123", plan: "free", status: "active" },
            }),
          }),
        }),
      }),
    });
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("returns 200 with success:true when cancellation succeeds", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: mockProSub }) }),
        }),
      }),
    });
    (razorpay.subscriptions.cancel as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("calls razorpay.subscriptions.cancel with cancelAtCycleEnd=true", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: mockProSub }) }),
        }),
      }),
    });
    (razorpay.subscriptions.cancel as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(razorpay.subscriptions.cancel).toHaveBeenCalledWith("sub_test123", true);
  });

  it("returns 500 if Razorpay SDK throws", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: mockProSub }) }),
        }),
      }),
    });
    (razorpay.subscriptions.cancel as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Razorpay error"));
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
