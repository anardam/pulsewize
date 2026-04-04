import { describe, it, expect, vi } from "vitest";

// This import WILL FAIL until 04-04 wires the route — RED state is correct.
import { POST } from "@/app/api/analyze/route";

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: vi.fn(() => ({
    auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-123" } } })) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => ({ data: { plan: "free", status: "active" } })),
      maybeSingle: vi.fn(() => ({ data: null })),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(() => ({ data: { allowed: true }, error: null })),
  })),
}));

vi.mock("@/lib/claude-api", () => ({
  analyzeWithApi: vi.fn(() => ({ success: true, report: { username: "testuser" } })),
}));

vi.mock("@/lib/ai/orchestrator", () => ({
  runMultiAgentAnalysis: vi.fn(() => ({ success: true, report: { username: "testuser" } })),
}));

vi.mock("@/lib/scrapers/registry", () => ({
  getScraper: vi.fn(() => ({
    scrape: vi.fn(() => ({
      success: true,
      profile: { username: "testuser", platform: "instagram", fullName: "Test User", biography: "test", followersCount: 1000, followingCount: 500, postsCount: 50, isPrivate: false, isVerified: false, profilePicUrl: "" },
    })),
  })),
}));

vi.mock("@/lib/nlp", () => ({
  analyzeCaption: vi.fn(() => null),
}));

vi.mock("@/lib/trends", () => ({
  getTrendDirection: vi.fn(() => null),
}));

describe("analyze route — Free vs Pro branching (AI-02)", () => {
  it("free user calls analyzeWithApi, not runMultiAgentAnalysis", async () => {
    const { analyzeWithApi } = await import("@/lib/claude-api");
    const { runMultiAgentAnalysis } = await import("@/lib/ai/orchestrator");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ platform: "instagram", handle: "testuser", username: "testuser" }),
    });
    await POST(req as never);

    expect(vi.mocked(analyzeWithApi)).toHaveBeenCalled();
    expect(vi.mocked(runMultiAgentAnalysis)).not.toHaveBeenCalled();
  });

  it("pro user calls runMultiAgentAnalysis, not analyzeWithApi", async () => {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServer).mockReturnValue({
      auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-pro" } } })) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({ data: { plan: "pro", status: "active" } })),
        maybeSingle: vi.fn(() => ({ data: null })),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(() => ({ data: { allowed: true }, error: null })),
    } as never);

    const { analyzeWithApi } = await import("@/lib/claude-api");
    const { runMultiAgentAnalysis } = await import("@/lib/ai/orchestrator");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ platform: "instagram", handle: "testuser", username: "testuser" }),
    });
    await POST(req as never);

    expect(vi.mocked(runMultiAgentAnalysis)).toHaveBeenCalled();
    expect(vi.mocked(analyzeWithApi)).not.toHaveBeenCalled();
  });
});

describe("analyze route — 1-hour cache (AI-06)", () => {
  it("returns cached report without calling AI when fresh cache exists", async () => {
    const cachedReport = { username: "testuser", analyzedAt: new Date().toISOString() };
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServer).mockReturnValue({
      auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-123" } } })) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({ data: { plan: "free", status: "active" } })),
        maybeSingle: vi.fn(() => ({ data: { report: cachedReport } })),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(() => ({ data: { allowed: true }, error: null })),
    } as never);

    const { analyzeWithApi } = await import("@/lib/claude-api");

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ platform: "instagram", handle: "testuser", username: "testuser" }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body.cached).toBe(true);
    expect(vi.mocked(analyzeWithApi)).not.toHaveBeenCalled();
  });

  it("calls AI when cache is empty", async () => {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    vi.mocked(createSupabaseServer).mockReturnValue({
      auth: { getUser: vi.fn(() => ({ data: { user: { id: "user-123" } } })) },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() => ({ data: { plan: "free", status: "active" } })),
        maybeSingle: vi.fn(() => ({ data: null })),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      })),
      rpc: vi.fn(() => ({ data: { allowed: true }, error: null })),
    } as never);

    const { analyzeWithApi } = await import("@/lib/claude-api");
    vi.mocked(analyzeWithApi).mockClear();

    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ platform: "instagram", handle: "testuser", username: "testuser" }),
    });
    await POST(req as never);

    expect(vi.mocked(analyzeWithApi)).toHaveBeenCalled();
  });
});
