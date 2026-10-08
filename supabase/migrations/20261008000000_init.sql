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
