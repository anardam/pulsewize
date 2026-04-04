import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Razorpay static method for signature verification
const mockValidateWebhookSignature = vi.fn();
vi.mock("razorpay", () => {
  const MockRazorpay = vi.fn();
  MockRazorpay.validateWebhookSignature = mockValidateWebhookSignature;
  return { default: MockRazorpay };
});

// Mock Supabase service client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

// Track chain calls
let fromCallChains: Record<string, unknown> = {};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      fromCallChains[table] = true;
      return {
        select: mockSelect,
        insert: mockInsert,
        upsert: mockUpsert,
        update: mockUpdate,
      };
    },
  })),
}));

// Set up chain mocks
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  fromCallChains = {};

  // Default: signature valid
  mockValidateWebhookSignature.mockReturnValue(true);

  // Default: event not processed yet
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Default: DB write success
  mockUpsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockInsert.mockResolvedValue({ error: null });

  // Set env vars
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-secret";
});

function makeRequest(body: unknown, options: { signature?: string; eventId?: string; validSig?: boolean } = {}) {
  const rawBody = JSON.stringify(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-razorpay-signature": options.signature ?? "valid-sig",
    "x-razorpay-event-id": options.eventId ?? "evt_unique_001",
  };
  // Override signature validation behavior
  if (options.validSig === false) {
    mockValidateWebhookSignature.mockReturnValueOnce(false);
  }
  return new NextRequest("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers,
    body: rawBody,
  });
}

function chargedPayload(userId = "user-abc", subId = "sub_test") {
  return {
    event: "subscription.charged",
    payload: {
      subscription: {
        entity: {
          id: subId,
          plan_id: "plan_001",
          status: "active",
          current_end: 1800000000,
          notes: { user_id: userId },
        },
      },
    },
  };
}

function haltedPayload(userId = "user-abc", subId = "sub_test") {
  return {
    event: "subscription.halted",
    payload: {
      subscription: {
        entity: {
          id: subId,
          plan_id: "plan_001",
          status: "halted",
          current_end: 1800000000,
          notes: { user_id: userId },
        },
      },
    },
  };
}

function cancelledPayload(userId = "user-abc", subId = "sub_test") {
  return {
    event: "subscription.cancelled",
    payload: {
      subscription: {
        entity: {
          id: subId,
          plan_id: "plan_001",
          status: "cancelled",
          current_end: 1800000000,
          notes: { user_id: userId },
        },
      },
    },
  };
}

function completedPayload(userId = "user-abc", subId = "sub_test") {
  return {
    event: "subscription.completed",
    payload: {
      subscription: {
        entity: {
          id: subId,
          plan_id: "plan_001",
          status: "completed",
          current_end: 1800000000,
          notes: { user_id: userId },
        },
      },
    },
  };
}

async function importRoute() {
  const mod = await import("@/app/api/webhooks/razorpay/route");
  return mod.POST;
}

describe("POST /api/webhooks/razorpay", () => {
  it("returns 403 if signature verification fails", async () => {
    const POST = await importRoute();
    const req = makeRequest(chargedPayload(), { validSig: false });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 200 without re-processing if event_id already in processed_webhook_events", async () => {
    // Simulate event already processed
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null });
    const POST = await importRoute();
    const req = makeRequest(chargedPayload(), { eventId: "evt_duplicate" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Upsert should NOT have been called
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("subscription.charged → upserts subscriptions with plan=pro, status=active, current_period_end set", async () => {
    const POST = await importRoute();
    const req = makeRequest(chargedPayload("user-123", "sub_charged"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        plan: "pro",
        status: "active",
        provider_subscription_id: "sub_charged",
      }),
      expect.objectContaining({ onConflict: "user_id" })
    );
    // current_period_end should be an ISO string
    const upsertArg = mockUpsert.mock.calls[0][0];
    expect(typeof upsertArg.current_period_end).toBe("string");
    expect(upsertArg.current_period_end).toContain("T");
  });

  it("subscription.halted → updates status=halted, plan stays pro (not downgraded)", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValueOnce({ eq: updateEq });

    const POST = await importRoute();
    const req = makeRequest(haltedPayload("user-123", "sub_halted"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "halted" })
    );
    // plan should NOT be in the update payload
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.plan).toBeUndefined();
  });

  it("subscription.cancelled → updates plan=free, status=cancelled", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValueOnce({ eq: updateEq });

    const POST = await importRoute();
    const req = makeRequest(cancelledPayload("user-123", "sub_cancelled"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free", status: "cancelled" })
    );
  });

  it("subscription.completed → updates plan=free, status=completed", async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValueOnce({ eq: updateEq });

    const POST = await importRoute();
    const req = makeRequest(completedPayload("user-123", "sub_completed"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ plan: "free", status: "completed" })
    );
  });

  it("missing notes.user_id → returns 200 (no-op)", async () => {
    const payload = {
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: "sub_nouserid",
            plan_id: "plan_001",
            status: "active",
            current_end: 1800000000,
            notes: {}, // no user_id
          },
        },
      },
    };
    const POST = await importRoute();
    const req = makeRequest(payload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("inserts into processed_webhook_events after successful processing", async () => {
    const POST = await importRoute();
    const req = makeRequest(chargedPayload(), { eventId: "evt_new_123" });
    await POST(req);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "evt_new_123",
        event_type: "subscription.charged",
      })
    );
  });
});
