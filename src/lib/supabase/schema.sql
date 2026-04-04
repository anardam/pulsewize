-- InstaAnalyse Database Schema
-- Phase 1: Foundation
-- Apply via: Supabase Dashboard > SQL Editor > New query > paste > Run
-- Source: D-11, D-12, D-13 from CONTEXT.md; patterns from RESEARCH.md

-- =============================================================================
-- PROFILES: extends auth.users with display name
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users can read own row" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles: users can update own row" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- =============================================================================
-- REPORTS: saved analysis results
-- =============================================================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'instagram',
  username TEXT NOT NULL,
  report_data JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS reports_user_id_idx ON reports(user_id);
CREATE INDEX IF NOT EXISTS reports_analyzed_at_idx ON reports(analyzed_at DESC);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports: users can read own rows" ON reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "reports: users can insert own rows" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports: users can delete own rows" ON reports
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- SUBSCRIPTIONS: plan and payment state
-- =============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  provider TEXT CHECK (provider IN ('stripe', 'razorpay')),
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions: users can read own row" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
-- NOTE: No UPDATE/INSERT/DELETE for users — subscriptions are only modified
-- by server-side webhook handlers using the service_role key (Phase 3).

-- =============================================================================
-- USAGE: monthly analysis counters
-- =============================================================================
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  analyses_used INTEGER NOT NULL DEFAULT 0 CHECK (analyses_used >= 0),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, billing_month)
);

CREATE INDEX IF NOT EXISTS usage_user_month_idx ON usage(user_id, billing_month);

ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage: users can read own rows" ON usage
  FOR SELECT USING (auth.uid() = user_id);
-- NOTE: No UPDATE/INSERT/DELETE for users — usage is only modified
-- by the check_and_increment_usage() SECURITY DEFINER RPC below.

-- =============================================================================
-- TRIGGER: auto-create profile + free subscription on signup
-- =============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO subscriptions (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- =============================================================================
-- RPC: atomic usage check-and-increment (replaces rate-limit.ts)
-- SECURITY DEFINER: runs as the function owner (postgres), bypassing RLS.
-- This is intentional — users cannot modify usage rows directly.
-- Called from: src/app/api/analyze/route.ts
-- Returns: { allowed: boolean, analyses_used: number, limit: number }
-- =============================================================================
CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_month DATE := date_trunc('month', now())::DATE;
  v_result JSONB;
  v_updated_count INTEGER;
BEGIN
  -- Ensure a usage row exists for this month (idempotent)
  INSERT INTO usage (user_id, billing_month, analyses_used)
  VALUES (p_user_id, v_current_month, 0)
  ON CONFLICT (user_id, billing_month) DO NOTHING;

  -- Atomic increment — only succeeds if under limit
  UPDATE usage
  SET analyses_used = analyses_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id
    AND billing_month = v_current_month
    AND analyses_used < p_limit
  RETURNING analyses_used INTO v_updated_count;

  IF v_updated_count IS NULL THEN
    -- Limit reached — return current count without incrementing
    SELECT jsonb_build_object(
      'allowed', false,
      'analyses_used', analyses_used,
      'limit', p_limit
    ) INTO v_result
    FROM usage
    WHERE user_id = p_user_id AND billing_month = v_current_month;
  ELSE
    v_result := jsonb_build_object(
      'allowed', true,
      'analyses_used', v_updated_count,
      'limit', p_limit
    );
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- PROCESSED_WEBHOOK_EVENTS: idempotency log for Razorpay webhook events
-- Phase 3: Payments and Gating (PAY-05, D-11)
-- Apply via: Supabase Dashboard > SQL Editor > New query > paste > Run
-- =============================================================================
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,       -- x-razorpay-event-id header value
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- No RLS needed — this table is only written by the webhook handler
-- using the service_role key. Users never read or write this table directly.

-- =============================================================================
-- Phase 4 Migration (backfilled): add report_type to reports table
-- =============================================================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'analysis';
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
-- Valid values: 'analysis', 'calendar', 'comparison', 'hashtags'

-- =============================================================================
-- Phase 5 Migration: add avatar_url to profiles table
-- NOTE: Do NOT run the report_type migration if Phase 4 already applied it.
-- Apply avatar_url manually via Supabase Dashboard SQL editor.
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
