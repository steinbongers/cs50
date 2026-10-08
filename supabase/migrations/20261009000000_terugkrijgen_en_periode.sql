-- =============================================================================
-- Geld terugkrijgen (Voorgeschoten), salarisdag, kaartdetails.
-- =============================================================================

-- profiles: periode vanaf salarisdag, begeleide eerste kaarten
alter table public.profiles
  add column salary_day smallint check (salary_day between 1 and 31),
  add column coach_step smallint not null default 0;

-- categories: ingebouwd systeempotje (Voorgeschoten), niet te verwijderen in de UI
alter table public.categories
  add column system_key text check (system_key in ('voorgeschoten'));

create unique index categories_system_key_idx
  on public.categories (user_id, system_key)
  where system_key is not null;

-- transactions: ruwe banktekst, tijd, saldo, eigen deel, eigen overboeking
alter table public.transactions
  add column booking_time time,
  add column balance_after numeric(14,2),
  add column raw_counterparty text,
  add column raw_description text,
  -- eigen deel van een uitgave als positief bedrag; null = het hele bedrag is van jou
  add column own_share numeric(12,2) check (own_share is null or own_share >= 0),
  -- overboeking tussen eigen gekoppelde rekeningen: komt niet op de stapel
  add column is_internal_transfer boolean not null default false;

create index transactions_user_internal_idx
  on public.transactions (user_id)
  where is_internal_transfer = true;

-- -----------------------------------------------------------------------------
-- transaction_shares: delen van een uitgave die anderen aan jou terugbetalen
-- -----------------------------------------------------------------------------
create table public.transaction_shares (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  transaction_id          uuid not null references public.transactions (id) on delete cascade,
  person_name             text check (person_name is null or char_length(person_name) <= 60),
  amount                  numeric(12,2) not null check (amount > 0),
  status                  text not null default 'open'
                          check (status in ('open','received','settled_elsewhere')),
  received_transaction_id uuid references public.transactions (id) on delete set null,
  received_at             timestamptz,
  created_at              timestamptz not null default now()
);

create index transaction_shares_user_status_idx on public.transaction_shares (user_id, status);
create index transaction_shares_transaction_idx on public.transaction_shares (transaction_id);
create index transaction_shares_received_idx on public.transaction_shares (received_transaction_id)
  where received_transaction_id is not null;

alter table public.transaction_shares enable row level security;

create policy "transaction_shares: eigen rijen lezen"
  on public.transaction_shares for select using ((select auth.uid()) = user_id);
create policy "transaction_shares: eigen rijen aanmaken"
  on public.transaction_shares for insert with check ((select auth.uid()) = user_id);
create policy "transaction_shares: eigen rijen bewerken"
  on public.transaction_shares for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transaction_shares: eigen rijen verwijderen"
  on public.transaction_shares for delete using ((select auth.uid()) = user_id);
