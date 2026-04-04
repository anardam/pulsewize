import { describe, it, expect, vi } from "vitest";

// Mock @supabase/ssr before importing the modules under test
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ auth: { signIn: vi.fn() } })),
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}));

// Mock next/headers for the server client
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    })
  ),
}));

describe("createSupabaseBrowser", () => {
  it("returns a client with auth property", async () => {
    const { createSupabaseBrowser } = await import("@/lib/supabase/client");
    const client = createSupabaseBrowser();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});

describe("createSupabaseServer", () => {
  it("returns a client with auth property", async () => {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    const client = await createSupabaseServer();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
