-- =============================================================================
-- Geld terug bijhouden zonder vooraf te verdelen. Een uitgave kan "wacht op geld
-- terug" zijn; binnenkomende terugbetalingen wijzen naar die uitgave. Wat er
-- binnenkomt gaat van het potje af; is alles binnen, dan is de rest van jou.
-- Alleen additief.
-- =============================================================================
alter table public.transactions
  add column awaiting_refund boolean not null default false,
  add column refund_for_id uuid references public.transactions (id) on delete set null;

create index transactions_awaiting_refund_idx
  on public.transactions (user_id)
  where awaiting_refund;
create index transactions_refund_for_idx
  on public.transactions (refund_for_id)
  where refund_for_id is not null;
