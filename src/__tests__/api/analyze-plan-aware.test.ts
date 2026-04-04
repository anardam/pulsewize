/**
 * Unit tests for isPro determination logic in the analyze route.
 * Tests the subscription plan-aware usage limit logic in isolation.
 * Phase 3: Payments and Gating (PAY-03)
 */

// Extract the isPro logic as a pure function to unit test it.
// This mirrors what the route does: read subData and derive isPro and usageLimit.

interface SubData {
  plan: string;
  status: string;
}

function determineUsageLimit(subData: SubData | null): {
  isPro: boolean;
  usageLimit: number;
} {
  const isPro =
    subData?.plan === "pro" &&
    (subData?.status === "active" ||
      subData?.status === "authenticated" ||
      subData?.status === "halted"); // halted: keep Pro access (payment grace period)

  const usageLimit = isPro ? 999999 : 3;

  return { isPro, usageLimit };
}

describe("determineUsageLimit — isPro logic", () => {
  // Test 1: Pro user with status 'active' gets usageLimit = 999999
  it("Pro user with status 'active' gets usageLimit = 999999", () => {
    const subData: SubData = { plan: "pro", status: "active" };
    const { isPro, usageLimit } = determineUsageLimit(subData);
    expect(isPro).toBe(true);
    expect(usageLimit).toBe(999999);
  });

  // Test 2: Pro user with status 'halted' gets usageLimit = 999999
  it("Pro user with status 'halted' (grace period) gets usageLimit = 999999", () => {
    const subData: SubData = { plan: "pro", status: "halted" };
    const { isPro, usageLimit } = determineUsageLimit(subData);
    expect(isPro).toBe(true);
    expect(usageLimit).toBe(999999);
  });

  // Test 3: Free user (plan = 'free') gets usageLimit = 3
  it("Free user (plan = 'free') gets usageLimit = 3", () => {
    const subData: SubData = { plan: "free", status: "active" };
    const { isPro, usageLimit } = determineUsageLimit(subData);
    expect(isPro).toBe(false);
    expect(usageLimit).toBe(3);
  });

  // Test 4: User with no subscription row gets usageLimit = 3 (null subData)
  it("User with no subscription row (null) falls back to free tier (usageLimit = 3)", () => {
    const { isPro, usageLimit } = determineUsageLimit(null);
    expect(isPro).toBe(false);
    expect(usageLimit).toBe(3);
  });

  // Test 5: isPro is false when plan = 'pro' but status = 'cancelled'
  it("isPro is false when plan = 'pro' but status = 'cancelled'", () => {
    const subData: SubData = { plan: "pro", status: "cancelled" };
    const { isPro, usageLimit } = determineUsageLimit(subData);
    expect(isPro).toBe(false);
    expect(usageLimit).toBe(3);
  });

  // Bonus: Pro with 'authenticated' status also gets unlimited access
  it("Pro user with status 'authenticated' gets usageLimit = 999999", () => {
    const subData: SubData = { plan: "pro", status: "authenticated" };
    const { isPro, usageLimit } = determineUsageLimit(subData);
    expect(isPro).toBe(true);
    expect(usageLimit).toBe(999999);
  });
});
