-- =============================================================================
-- Ingebouwd potje "Geld terug": terugbetalingen waarvan je niet zegt waarvoor.
-- Telt als minder uitgegeven in je totaal, maar bij geen enkel potje. Alleen additief.
-- =============================================================================
alter table public.categories drop constraint if exists categories_system_key_check;
alter table public.categories
  add constraint categories_system_key_check check (system_key in ('voorgeschoten', 'contant', 'terug'));
