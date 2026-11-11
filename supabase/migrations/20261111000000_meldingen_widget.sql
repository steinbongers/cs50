-- =============================================================================
-- Melding na elke betaling (Apple Pay en bank) en de grote widget met knoppen.
-- Zie docs/plan-meldingen-en-widget.md. Alleen additief.
-- =============================================================================

-- 1. Apple Pay: een voorlopige uitgave uit de Opdrachten-automatisering "Transactie".
--    Zonder rekening; zodra de bank dezelfde betaling levert, gaat hij op in die bankregel.
alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (source in ('bank', 'csv', 'cash', 'split', 'applepay'));
alter table public.transactions drop constraint if exists transactions_cash_has_no_account;
alter table public.transactions
  add constraint transactions_cash_has_no_account check (source not in ('cash', 'split', 'applepay') or account_id is null);

-- Winkelnaam zoals Wallet hem doorgaf; blijft op de bankregel staan na het samenvoegen,
-- zodat het voorstel ook de volgende Apple Pay-betaling bij die winkel herkent.
alter table public.transactions add column if not exists wallet_merchant text;
-- Moment waarop voor deze betaling een melding met knoppen is verstuurd (hoogstens één keer).
alter table public.transactions add column if not exists notified_at timestamptz;

create index if not exists transactions_applepay_open_idx
  on public.transactions (user_id, booking_date)
  where source = 'applepay';

-- 2. Gekoppelde iPhones: één rij per installatie van de app. De sleutel waarmee de widget,
--    de Apple Pay-actie en de meldingsknoppen zich melden, staat hier alleen als sha256-hash.
--    Alleen de service role leest en schrijft deze tabel.
create table if not exists public.native_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  installation_id text not null,
  key_hash        text not null unique,
  apns_token      text,
  apns_env        text check (apns_env in ('production', 'sandbox')),
  -- iOS-stand "Voorvertoning tonen" voor deze app: always, when_unlocked of never.
  previews        text not null default 'when_unlocked' check (previews in ('always', 'when_unlocked', 'never')),
  created_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  expires_at      timestamptz not null,
  constraint native_devices_user_installation_unique unique (user_id, installation_id)
);
create index if not exists native_devices_user_idx on public.native_devices (user_id);
alter table public.native_devices enable row level security;
revoke all on public.native_devices from anon, authenticated;

-- 3. Privacy by default: bedrag, winkel en potje staan niet op het vergrendelscherm,
--    tenzij de gebruiker dat zelf aanzet. Meldingen per betaling kunnen apart uit.
alter table public.profiles add column if not exists lock_screen_details boolean not null default false;
alter table public.profiles add column if not exists payment_notifications boolean not null default true;
grant update (lock_screen_details, payment_notifications) on public.profiles to authenticated;
