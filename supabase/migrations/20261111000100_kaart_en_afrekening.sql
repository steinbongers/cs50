-- =============================================================================
-- Apple Pay: met welke kaart is er betaald, en de maandafrekening van de creditcard.
-- Alleen additief. Draai deze ná 20261111000000_meldingen_widget.sql.
-- =============================================================================

-- Naam van de kaart zoals hij in Apple Wallet staat ("ING Betaalpas", "Visa Card"). Geen kaartnummer.
alter table public.transactions
  add column if not exists wallet_card text check (wallet_card is null or char_length(wallet_card) <= 60);

-- Creditcardbetaling via Apple Pay die al is verrekend met een maandafrekening van de kaart:
-- de afschrijving bij de bank waar hij in zat. Zo telt hij bij de volgende afrekening niet opnieuw mee.
alter table public.transactions
  add column if not exists card_settlement_id uuid references public.transactions (id) on delete set null;
create index if not exists transactions_card_settlement_idx
  on public.transactions (card_settlement_id) where card_settlement_id is not null;

-- Welke kaartnamen de gebruiker als creditcard of betaalpas heeft aangemerkt: { "Visa Card": "credit" }.
alter table public.profiles add column if not exists wallet_cards jsonb not null default '{}'::jsonb;
grant update (wallet_cards) on public.profiles to authenticated;
