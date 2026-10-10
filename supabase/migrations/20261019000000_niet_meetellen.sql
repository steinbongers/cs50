-- =============================================================================
-- Ingebouwd potje "Telt niet mee": een kaartje dat je bewust buiten je maand,
-- Overzicht en potjes houdt (borg, zakelijk, geld voor een ander). Alleen additief.
-- =============================================================================
alter table public.categories drop constraint if exists categories_system_key_check;
alter table public.categories
  add constraint categories_system_key_check
  check (system_key in ('voorgeschoten', 'contant', 'terug', 'verdeeld', 'negeer'));
