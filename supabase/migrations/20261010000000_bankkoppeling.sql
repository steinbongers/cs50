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
