-- =============================================================================
-- Contant geld, vaste groepen, maandfocus en de iOS-widget. Alleen additief.
-- =============================================================================

-- 1. Contant geld: een pinopname gaat in het ingebouwde potje Contant (telt niet
--    als uitgave). Wat je er contant mee betaalt, voeg je zelf toe als losse
--    uitgave (source 'cash', zonder rekening), gekoppeld aan de opname.
alter table public.categories drop constraint if exists categories_system_key_check;
alter table public.categories
  add constraint categories_system_key_check check (system_key in ('voorgeschoten', 'contant'));

alter table public.transactions alter column account_id drop not null;
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (source in ('bank', 'csv', 'cash'));
alter table public.transactions
  add constraint transactions_cash_has_no_account check (source <> 'cash' or account_id is null);
alter table public.transactions
  add column cash_withdrawal_id uuid references public.transactions (id) on delete set null;
create index transactions_cash_withdrawal_idx
  on public.transactions (cash_withdrawal_id)
  where cash_withdrawal_id is not null;

-- 2. Vaste groepen om mee te delen ("Huisgenoten"). Alleen namen, geen contactgegevens.
create table public.share_groups (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  members    text[] not null check (cardinality(members) between 1 and 11),
  created_at timestamptz not null default now()
);
create index share_groups_user_idx on public.share_groups (user_id);
alter table public.share_groups enable row level security;
create policy "share_groups: eigen rijen lezen"
  on public.share_groups for select using ((select auth.uid()) = user_id);
create policy "share_groups: eigen rijen aanmaken"
  on public.share_groups for insert with check ((select auth.uid()) = user_id);
create policy "share_groups: eigen rijen bewerken"
  on public.share_groups for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "share_groups: eigen rijen verwijderen"
  on public.share_groups for delete using ((select auth.uid()) = user_id);

-- 3. Maandafsluiting: één potje om deze maand op te letten.
alter table public.profiles
  add column focus_category_id uuid references public.categories (id) on delete set null,
  add column focus_period_start date;
grant update (focus_category_id, focus_period_start) on public.profiles to authenticated;

-- 4. iOS-widget: een eigen sleutel per gebruiker, alleen als hash opgeslagen.
--    Alleen de service role leest hem (de widget heeft geen inlogsessie).
create table public.widget_tokens (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.widget_tokens enable row level security;
revoke all on public.widget_tokens from anon, authenticated;
