-- =============================================================================
-- Afwerkronde: notitie per transactie, spaardoel per potje, en een anonieme
-- churn-log voor verwijderde accounts. Alleen additief.
-- =============================================================================

-- 1. Korte eigen notitie bij een transactie (maximaal 140 tekens).
alter table public.transactions
  add column note text check (note is null or char_length(note) <= 140);

-- 2. Spaardoel per potje (los van het maandbudget).
alter table public.categories
  add column goal_amount numeric(12,2) check (goal_amount is null or goal_amount > 0);

-- 3. Churn-log: bewust zonder user_id, zodat er na verwijderen niets naar een
--    persoon terug te leiden is. Alleen de service role schrijft en leest.
create table public.churn_log (
  id                bigint generated always as identity primary key,
  cohort_week       date not null,
  days_since_signup integer not null check (days_since_signup >= 0),
  created_at        timestamptz not null default now()
);

alter table public.churn_log enable row level security;
-- Geen policies: anon en authenticated kunnen er niets mee.
revoke all on public.churn_log from anon, authenticated;

-- Kolomrechten: 20261013000000_toegang_afdwingen.sql beperkt alleen updates op
-- public.profiles. Op transactions en categories gelden tabelbrede rechten, dus
-- de nieuwe kolommen zijn al bij te werken (binnen de bestaande RLS-policies).
