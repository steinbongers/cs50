-- =============================================================================
-- Pilot: uitnodigingscodes, app-open events, verwijderen.
-- =============================================================================

create table public.invite_codes (
  code       text primary key check (code ~ '^[A-Z0-9-]{4,32}$'),
  note       text,
  max_uses   integer not null default 1 check (max_uses > 0),
  uses       integer not null default 0 check (uses >= 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Alleen de service role (adminpagina en registratie) werkt met codes.
alter table public.invite_codes enable row level security;

alter table public.profiles
  add column invite_code text references public.invite_codes (code) on delete set null;

-- De trigger neemt de code uit de registratie-metadata mee.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
