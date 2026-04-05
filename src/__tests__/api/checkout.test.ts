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

const mockCheckoutCreate = vi.fn();
vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: mockCheckoutCreate,
      },
    },
  })),
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

  it("returns 200 with checkout url for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session_123" });
    const POST = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.url).toBe("https://checkout.stripe.test/session_123");
  });

  it("creates checkout session with metadata.user_id set to user.id", async () => {
    const userId = "user-xyz-456";
    mockGetUser.mockResolvedValue({ data: { user: { id: userId, email: "hello@example.com" } } });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session_999" });
    const POST = await importRoute();
    await POST(makeRequest());
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { user_id: userId },
        subscription_data: { metadata: { user_id: userId } },
      })
    );
  });

  it("uses STRIPE_PRICE_ID env var for line item price", async () => {
    const priceId = "price_test_001";
    process.env.STRIPE_PRICE_ID = priceId;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc", email: "test@example.com" } } });
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.test/session_aaa" });
    const POST = await importRoute();
    await POST(makeRequest());
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [expect.objectContaining({ price: priceId })],
      })
    );
  });

  it("returns 500 with error message if Stripe SDK throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-abc", email: "test@example.com" } } });
    mockCheckoutCreate.mockRejectedValue(
      new Error("Stripe API unavailable")
    );
    const POST = await importRoute();
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBeTruthy();
  });
});
