import { describe, it, expect, vi, beforeEach } from "vitest";

// Tests for PATCH /api/profile route.
// This file transitions from RED (todos) to GREEN (real tests) in Plan 05-03.

const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

// Import is deferred until after mocks are set up
const getHandler = async () => {
  const mod = await import("@/app/api/profile/route");
  return mod.PATCH;
};

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: Supabase update chain resolves with no error
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ update: mockUpdate });
  });

  it("returns 401 when no session/auth cookie present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const PATCH = await getHandler();
    const req = makeRequest({ display_name: "Alice" });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns { success: true } when display_name is updated with valid value", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const PATCH = await getHandler();
    const req = makeRequest({ display_name: "Alice" });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "Alice" })
    );
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
  });

  it("truncates display_name to 64 characters when input exceeds 64 chars", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const PATCH = await getHandler();
    const longName = "A".repeat(100);
    const req = makeRequest({ display_name: longName });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: "A".repeat(64) })
    );
  });

  it("returns { success: true } when avatar_url is updated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const PATCH = await getHandler();
    const req = makeRequest({ avatar_url: "https://example.com/avatar.png" });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: "https://example.com/avatar.png" })
    );
  });

  it("does not allow updating fields other than display_name and avatar_url", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    const PATCH = await getHandler();
    // Pass an unknown field alongside a valid one
    const req = makeRequest({
      display_name: "Alice",
      unknown_field: "injected",
    });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    // The update payload must NOT include unknown_field
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ unknown_field: "injected" })
    );
  });

  it("returns 500 when Supabase update returns an error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockEq.mockResolvedValue({ error: { message: "DB error" } });

    const PATCH = await getHandler();
    const req = makeRequest({ display_name: "Alice" });
    const res = await PATCH(req as never);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ success: false, error: "DB error" });
  });
});
