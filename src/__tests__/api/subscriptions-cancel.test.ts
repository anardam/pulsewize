import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));

const mockStripeUpdate = vi.fn();
vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn(() => ({
    subscriptions: {
      update: mockStripeUpdate,
    },
  })),
}));

import { POST } from "@/app/api/subscriptions/cancel/route";
import { createSupabaseServer } from "@/lib/supabase/server";

function makeRequest() {
  return new Request("http://localhost/api/subscriptions/cancel", { method: "POST" });
}

const mockProSub = {
  provider: "stripe",
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
    mockStripeUpdate.mockResolvedValue({});
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("calls stripe.subscriptions.update with cancel_at_period_end=true", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: mockProSub }) }),
        }),
      }),
    });
    mockStripeUpdate.mockResolvedValue({});
    await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(mockStripeUpdate).toHaveBeenCalledWith("sub_test123", {
      cancel_at_period_end: true,
    });
  });

  it("returns 500 if Stripe SDK throws", async () => {
    (createSupabaseServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: "user1" } } }) },
      from: () => ({
        select: () => ({
          eq: () => ({ single: async () => ({ data: mockProSub }) }),
        }),
      }),
    });
    mockStripeUpdate.mockRejectedValue(new Error("Stripe error"));
    const res = await POST(makeRequest() as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
