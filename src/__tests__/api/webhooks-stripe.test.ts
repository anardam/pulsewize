import { beforeEach, describe, expect, it, vi } from "vitest";

const mockConstructEvent = vi.fn();
const mockRetrieveSubscription = vi.fn();
const mockSelectSingle = vi.fn();
const mockUpsert = vi.fn();
const mockInsert = vi.fn();

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(
    new Headers({
      "stripe-signature": "sig_test",
    })
  ),
}));

vi.mock("@/lib/stripe/server", () => ({
  getStripe: vi.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    subscriptions: {
      retrieve: mockRetrieveSubscription,
    },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseService: vi.fn(() => ({
    from: (table: string) => {
      if (table === "processed_webhook_events") {
        return {
          select: () => ({
            eq: () => ({
              single: mockSelectSingle,
            }),
          }),
          insert: mockInsert,
        };
      }

      if (table === "subscriptions") {
        return {
          upsert: mockUpsert,
        };
      }

      return {
        select: () => ({
          eq: () => ({
            single: mockSelectSingle,
          }),
        }),
      };
    },
  })),
}));

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    mockSelectSingle.mockResolvedValue({ data: null });
    mockUpsert.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("syncs a subscription.updated event into subscriptions", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_123",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          metadata: {
            user_id: "user_123",
          },
          items: {
            data: [
              {
                current_period_end: 1_700_000_000,
              },
            ],
          },
        },
      },
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));

    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user_123",
        plan: "pro",
        provider: "stripe",
        provider_subscription_id: "sub_123",
      }),
      { onConflict: "user_id" }
    );
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns 200 for already processed webhook events", async () => {
    mockSelectSingle.mockResolvedValueOnce({ data: { id: "existing" } });
    mockConstructEvent.mockReturnValue({
      id: "evt_existing",
      type: "customer.subscription.updated",
      data: { object: {} },
    });

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(new Request("http://localhost/api/webhooks/stripe", { method: "POST", body: "{}" }));

    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
