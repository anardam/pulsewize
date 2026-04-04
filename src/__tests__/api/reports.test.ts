import { describe, it, vi, beforeEach } from "vitest";

// RED STATE: GET /api/reports route does not exist yet.
// These tests define the expected contract for Plan 05-02 to implement.
// Import will fail until the route is created — that is expected (RED state).

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      data: [],
      error: null,
      count: 0,
    })),
  })),
}));

describe("GET /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.todo("returns 401 when no session/auth cookie present");

  it.todo("returns { success: true, data: [], meta: { total, page, limit, totalPages } } for authenticated user with no reports");

  it.todo("returns only reports matching the platform query param when platform filter is provided");

  it.todo("returns only reports matching username ilike when search param is provided");

  it.todo("returns paginated results with correct meta.total and meta.totalPages");

  it.todo("returns 400 when page param is not a valid positive integer");
});
