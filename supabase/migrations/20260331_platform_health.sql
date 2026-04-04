create table if not exists public.platform_health (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null unique,
  status      text not null check (status in ('ok', 'degraded', 'down')),
  checked_at  timestamptz not null default now(),
  error_msg   text
);
-- No RLS needed — public read, cron-only write via service role key
