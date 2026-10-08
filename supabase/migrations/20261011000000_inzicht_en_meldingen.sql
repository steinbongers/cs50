-- =============================================================================
-- Jouw maand, pushmeldingen, verloopmelding.
-- =============================================================================

alter table public.profiles
  -- periode-start waarvoor 'Jouw maand' is bekeken
  add column month_review_seen_for date,
  -- hoogstens één dagelijkse melding
  add column last_push_at timestamptz;

alter table public.bank_connections
  add column expiry_notified_at timestamptz;

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text not null,
  p256dh       text not null,
  auth_secret  text not null,  -- 'auth' als kolomnaam breekt de Supabase SQL Editor
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  constraint push_subscriptions_user_endpoint_unique unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: eigen rijen lezen"
  on public.push_subscriptions for select using ((select auth.uid()) = user_id);
create policy "push_subscriptions: eigen rijen aanmaken"
  on public.push_subscriptions for insert with check ((select auth.uid()) = user_id);
create policy "push_subscriptions: eigen rijen bewerken"
  on public.push_subscriptions for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "push_subscriptions: eigen rijen verwijderen"
  on public.push_subscriptions for delete using ((select auth.uid()) = user_id);
