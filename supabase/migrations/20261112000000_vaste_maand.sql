-- =============================================================================
-- Je vaste maand: de gebruiker tikt zelf aan welke kosten en inkomsten elke maand
-- terugkomen. Daarmee rekent de app "Nog over deze maand" uit. Alleen additief.
-- =============================================================================
create table if not exists public.fixed_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  -- 'uit' = vaste kosten, 'in' = vaste inkomsten
  direction        text not null check (direction in ('uit', 'in')),
  -- Genormaliseerde tegenpartij (counterpartyKey), om betalingen van deze maand te herkennen.
  counterparty_key text not null check (char_length(counterparty_key) between 1 and 120),
  name             text not null check (char_length(name) between 1 and 80),
  -- Bedrag per maand, altijd positief.
  amount           numeric(12,2) not null check (amount > 0 and amount <= 1000000),
  created_at       timestamptz not null default now(),
  constraint fixed_items_unique unique (user_id, direction, counterparty_key)
);
create index if not exists fixed_items_user_idx on public.fixed_items (user_id);

alter table public.fixed_items enable row level security;
create policy "fixed_items: eigen rijen lezen"
  on public.fixed_items for select using ((select auth.uid()) = user_id);
create policy "fixed_items: eigen rijen aanmaken"
  on public.fixed_items for insert with check ((select auth.uid()) = user_id);
create policy "fixed_items: eigen rijen bewerken"
  on public.fixed_items for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "fixed_items: eigen rijen verwijderen"
  on public.fixed_items for delete using ((select auth.uid()) = user_id);
