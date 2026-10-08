-- Eenmalige opzet voor een nieuw Supabase-project.
-- Samengevoegd uit supabase/migrations op 2026-10-08. Plak dit in de SQL Editor en voer het in één keer uit.
-- Bij nieuwe migraties: alleen het nieuwe bestand uitvoeren, niet dit bestand opnieuw.

-- ===== 20261008000000_init.sql =====
-- =============================================================================
-- Fundament: datamodel met Row Level Security.
-- Iedere gebruiker ziet en bewerkt uitsluitend zijn eigen rijen.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text check (display_name is null or char_length(display_name) <= 60),
  created_at            timestamptz not null default now(),
  onboarding_done       boolean not null default false,
  notifications_enabled boolean not null default false
);

alter table public.profiles enable row level security;

create policy "profiles: eigen rij lezen"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "profiles: eigen rij aanmaken"
  on public.profiles for insert
  with check ((select auth.uid()) = id);

create policy "profiles: eigen rij bewerken"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Maak automatisch een profiel aan bij registratie.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- categories (potjes)
-- -----------------------------------------------------------------------------
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 40),
  icon            text not null default 'tag' check (char_length(icon) between 1 and 40),
  color           text not null default 'blauw' check (color in (
                    'blauw','indigo','paars','roze','rood','oranje','geel','groen','mint','grijs')),
  sort_order      integer not null default 0,
  swipe_direction text check (swipe_direction in ('left','right','up','down')),
  monthly_budget  numeric(12,2) check (monthly_budget is null or monthly_budget >= 0),
  is_income       boolean not null default false,
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Per gebruiker hoogstens één actief potje per swipe-richting.
create unique index categories_one_per_direction
  on public.categories (user_id, swipe_direction)
  where swipe_direction is not null and archived = false;

create index categories_user_sort_idx on public.categories (user_id, sort_order);

alter table public.categories enable row level security;

create policy "categories: eigen rijen lezen"
  on public.categories for select using ((select auth.uid()) = user_id);
create policy "categories: eigen rijen aanmaken"
  on public.categories for insert with check ((select auth.uid()) = user_id);
create policy "categories: eigen rijen bewerken"
  on public.categories for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories: eigen rijen verwijderen"
  on public.categories for delete using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- bank_connections
-- -----------------------------------------------------------------------------
create table public.bank_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  provider    text not null check (provider in ('enablebanking','csv')),
  aspsp_name  text,
  session_id  text,
  valid_until timestamptz,
  status      text not null default 'active' check (status in ('active','expiring','expired','revoked')),
  created_at  timestamptz not null default now()
);

create index bank_connections_user_idx on public.bank_connections (user_id);

alter table public.bank_connections enable row level security;

create policy "bank_connections: eigen rijen lezen"
  on public.bank_connections for select using ((select auth.uid()) = user_id);
create policy "bank_connections: eigen rijen aanmaken"
  on public.bank_connections for insert with check ((select auth.uid()) = user_id);
create policy "bank_connections: eigen rijen bewerken"
  on public.bank_connections for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bank_connections: eigen rijen verwijderen"
  on public.bank_connections for delete using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- accounts (rekeningen)
-- -----------------------------------------------------------------------------
create table public.accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  connection_id  uuid not null references public.bank_connections (id) on delete cascade,
  external_uid   text,
  iban_masked    text,
  name           text,
  currency       text not null default 'EUR',
  last_balance   numeric(14,2),
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);

create unique index accounts_connection_external_uid_idx
  on public.accounts (connection_id, external_uid)
  where external_uid is not null;

create index accounts_user_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

create policy "accounts: eigen rijen lezen"
  on public.accounts for select using ((select auth.uid()) = user_id);
create policy "accounts: eigen rijen aanmaken"
  on public.accounts for insert with check ((select auth.uid()) = user_id);
create policy "accounts: eigen rijen bewerken"
  on public.accounts for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "accounts: eigen rijen verwijderen"
  on public.accounts for delete using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
create table public.transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  account_id     uuid not null references public.accounts (id) on delete cascade,
  external_id    text,
  dedupe_hash    text not null,
  booking_date   date not null,
  amount         numeric(12,2) not null,          -- negatief = uitgave
  currency       text not null default 'EUR',
  counterparty   text,
  description    text,
  category_id    uuid references public.categories (id) on delete set null,
  categorized_at timestamptz,
  skipped_count  integer not null default 0,
  source         text not null check (source in ('bank','csv')),
  created_at     timestamptz not null default now(),
  constraint transactions_user_dedupe_unique unique (user_id, dedupe_hash)
);

create index transactions_user_date_idx on public.transactions (user_id, booking_date desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id);
create index transactions_user_uncategorized_idx
  on public.transactions (user_id, booking_date desc)
  where category_id is null;

alter table public.transactions enable row level security;

create policy "transactions: eigen rijen lezen"
  on public.transactions for select using ((select auth.uid()) = user_id);
create policy "transactions: eigen rijen aanmaken"
  on public.transactions for insert with check ((select auth.uid()) = user_id);
create policy "transactions: eigen rijen bewerken"
  on public.transactions for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "transactions: eigen rijen verwijderen"
  on public.transactions for delete using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- category_rules (fase 4, alleen na expliciete bevestiging van de gebruiker)
-- -----------------------------------------------------------------------------
create table public.category_rules (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  counterparty_match text not null check (char_length(counterparty_match) between 1 and 120),
  category_id        uuid not null references public.categories (id) on delete cascade,
  created_at         timestamptz not null default now(),
  constraint category_rules_user_match_unique unique (user_id, counterparty_match)
);

alter table public.category_rules enable row level security;

create policy "category_rules: eigen rijen lezen"
  on public.category_rules for select using ((select auth.uid()) = user_id);
create policy "category_rules: eigen rijen aanmaken"
  on public.category_rules for insert with check ((select auth.uid()) = user_id);
create policy "category_rules: eigen rijen bewerken"
  on public.category_rules for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "category_rules: eigen rijen verwijderen"
  on public.category_rules for delete using ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- events (pilotmetingen)
-- -----------------------------------------------------------------------------
create table public.events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (char_length(type) between 1 and 60),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_user_created_idx on public.events (user_id, created_at desc);
create index events_type_created_idx on public.events (type, created_at desc);

alter table public.events enable row level security;

-- Gebruikers mogen alleen eigen events toevoegen en lezen; de adminpagina
-- leest geaggregeerd via de service role.
create policy "events: eigen rijen lezen"
  on public.events for select using ((select auth.uid()) = user_id);
create policy "events: eigen rijen aanmaken"
  on public.events for insert with check ((select auth.uid()) = user_id);

-- ===== 20261009000000_terugkrijgen_en_periode.sql =====
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

-- ===== 20261010000000_bankkoppeling.sql =====
-- =============================================================================
-- Bankkoppeling via Enable Banking: IBAN-hash voor eigen-overboekingen,
-- handmatige sync-limiet.
-- =============================================================================

alter table public.accounts
  -- sha256 van de volledige IBAN; de IBAN zelf slaan we niet op
  add column iban_hash text;

create index accounts_user_iban_hash_idx on public.accounts (user_id, iban_hash)
  where iban_hash is not null;

alter table public.bank_connections
  add column last_manual_sync_at timestamptz,
  add column last_synced_at timestamptz,
  add column last_error text;

-- ===== 20261011000000_inzicht_en_meldingen.sql =====
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
  auth         text not null,
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

-- ===== 20261012000000_pilot.sql =====
-- =============================================================================
-- Pilot: uitnodigingscodes, app-open events, verwijderen.
-- =============================================================================

create table public.invite_codes (
  code       text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  note       text,
  max_uses   integer not null default 1 check (max_uses > 0),
  uses       integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Alleen de service role (adminpagina en registratie) werkt met codes.
alter table public.invite_codes enable row level security;

alter table public.profiles
  add column invite_code text references public.invite_codes (code) on delete set null;

-- De trigger neemt de code uit de registratie-metadata mee.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ===== 20261013000000_toegang_afdwingen.sql =====
-- =============================================================================
-- Gesloten pilot afdwingen in de database zelf, en rekeningen deactiveren.
-- =============================================================================

-- 1. De uitnodigingscode op het profiel is niet door de gebruiker te wijzigen.
--    Tabelbrede update-rechten vervangen door kolomrechten (zonder invite_code).
revoke update on public.profiles from authenticated;
grant update (
  id,
  display_name,
  onboarding_done,
  notifications_enabled,
  salary_day,
  coach_step,
  month_review_seen_for,
  last_push_at
) on public.profiles to authenticated;

-- 2. Een code in de registratie-metadata wordt bij het aanmaken van het account
--    atomair gecontroleerd én verbruikt. Ongeldig of op: registratie mislukt.
--    Zonder code wordt het profiel gewoon aangemaakt; de app laat zo'n account
--    alleen binnen als het e-mailadres in ADMIN_EMAILS staat (zie lib/auth.ts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_used text;
begin
  v_code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');

  if v_code is not null then
    update public.invite_codes
       set uses = uses + 1
     where code = v_code
       and uses < max_uses
       and (expires_at is null or expires_at > now())
    returning code into v_used;

    if v_used is null then
      raise exception 'Ongeldige uitnodigingscode';
    end if;
  end if;

  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    v_code
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Rekeningen die bij een herkoppeling niet meer terugkomen, worden
--    gedeactiveerd in plaats van verwijderd (transacties blijven bewaard).
alter table public.accounts
  add column active boolean not null default true;
