-- =============================================================================
-- Spaarpotjes: geld dat je opzij zet is geen uitgave, en geld dat je eruit haalt geen
-- inkomen. Een potje is bewust wel of geen spaarpotje (zie docs/spaarplan.md, fase 1).
-- Alleen additief.
-- =============================================================================
alter table public.categories
  add column if not exists is_savings boolean not null default false;

-- Eenmalig: bestaande potjes met het spaarvarken, een spaardoel of "spaar"/"beleg" in de naam.
update public.categories
set is_savings = true
where system_key is null
  and is_income = false
  and (icon = 'piggy-bank' or goal_amount is not null or name ilike '%spaar%' or name ilike '%beleg%');
