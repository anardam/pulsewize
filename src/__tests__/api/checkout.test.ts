import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock next/headers (used by createSupabaseServer)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// Mock the Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

// Mock the Razorpay client
const mockSubscriptionsCreate = vi.fn();
vi.mock("@/lib/razorpay/client", () => ({
  razorpay: {
    subscriptions: { create: mockSubscriptionsCreate },
  },
}));

async function importRoute() {
  const mod = await import("@/app/api/checkout/route");
  return mod.POST;
}

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/checkout", { method: "POST" });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const POST = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 200 with subscriptionId for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockSubscriptionsCreate.mockResolvedValue({ id: "sub_abc123" });
    const POST = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.subscriptionId).toBe("sub_abc123");
  });

  it("creates subscription with notes.user_id set to user.id", async () => {
    const userId = "user-xyz-456";
    mockGetUser.mockResolvedValue({ data: { user: { id: userId } } });
    mockSubscriptionsCreate.mockResolvedValue({ id: "sub_999" });
    const POST = await importRoute();
    await POST(makeRequest());
    expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ notes: { user_id: userId } })
    );
  });

  it("uses RAZORPAY_PLAN_ID env var for plan_id", async () => {
    const planId = "plan_test_001";
    process.env.RAZORPAY_PLAN_ID = planId;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
    mockSubscriptionsCreate.mockResolvedValue({ id: "sub_aaa" });
    const POST = await importRoute();
    await POST(makeRequest());
    expect(mockSubscriptionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: planId })
    );
  });

  it("returns 500 with error message if Razorpay SDK throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc" } } });
    mockSubscriptionsCreate.mockRejectedValue(
      new Error("Razorpay API unavailable")
    );
    const POST = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });
});
