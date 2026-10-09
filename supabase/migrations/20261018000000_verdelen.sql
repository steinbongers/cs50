-- =============================================================================
-- Eén afschrijving verdelen over meerdere potjes (bijvoorbeeld de creditcard-
-- afrekening). De afschrijving gaat in het ingebouwde potje "Verdeeld" (telt niet
-- mee); de delen zijn losse regels (source 'split', zonder rekening) die naar de
-- afschrijving wijzen en elk in hun eigen potje tellen. Alleen additief.
-- =============================================================================
alter table public.categories drop constraint if exists categories_system_key_check;
alter table public.categories
  add constraint categories_system_key_check
  check (system_key in ('voorgeschoten', 'contant', 'terug', 'verdeeld'));

alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions
  add constraint transactions_source_check check (source in ('bank', 'csv', 'cash', 'split'));
alter table public.transactions drop constraint if exists transactions_cash_has_no_account;
alter table public.transactions
  add constraint transactions_cash_has_no_account check (source not in ('cash', 'split') or account_id is null);

alter table public.transactions
  add column if not exists split_parent_id uuid references public.transactions (id) on delete cascade;
create index if not exists transactions_split_parent_idx
  on public.transactions (split_parent_id)
  where split_parent_id is not null;
