-- =============================================================================
-- Gesloten pilot afdwingen in de database zelf, en rekeningen deactiveren.
-- =============================================================================

-- 1. De uitnodigingscode op het profiel is niet door de gebruiker te wijzigen.
--    Tabelbrede update-rechten vervangen door kolomrechten (zonder invite_code).
revoke update on public.profiles from authenticated;
grant update (
  id,
  display_name,
  onboarding_done,
  notifications_enabled,
  salary_day,
  coach_step,
  month_review_seen_for,
  last_push_at
) on public.profiles to authenticated;

-- 2. Een code in de registratie-metadata wordt bij het aanmaken van het account
--    atomair gecontroleerd én verbruikt. Ongeldig of op: registratie mislukt.
--    Zonder code wordt het profiel gewoon aangemaakt; de app laat zo'n account
--    alleen binnen als het e-mailadres in ADMIN_EMAILS staat (zie lib/auth.ts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_used text;
begin
  v_code := nullif(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')), '');

  if v_code is not null then
    update public.invite_codes
       set uses = uses + 1
     where code = v_code
       and uses < max_uses
       and (expires_at is null or expires_at > now())
    returning code into v_used;

    if v_used is null then
      raise exception 'Ongeldige uitnodigingscode';
    end if;
  end if;

  insert into public.profiles (id, display_name, invite_code)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), ''),
    v_code
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Rekeningen die bij een herkoppeling niet meer terugkomen, worden
--    gedeactiveerd in plaats van verwijderd (transacties blijven bewaard).
alter table public.accounts
  add column active boolean not null default true;
