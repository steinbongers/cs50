# finance-app

Mobiele web-app (PWA) waarmee je elke banktransactie zelf in een potje stopt.
Gebouwd met Next.js (App Router), TypeScript, Tailwind CSS en Supabase; bankdata via Enable Banking.

De app heeft nog geen naam: zie `config/app.ts` (`APP_NAME`, en `ACTION_LABEL` voor de hoofdactie).
Productkeuzes staan in `docs/beslissingen.md`; die zijn leidend boven de oorspronkelijke spec.

## Lokaal draaien

1. `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul minimaal de Supabase-waarden in.
3. Voer de migraties uit op je Supabase-project (`supabase/migrations/*.sql`, op volgorde), via de
   SQL-editor of `supabase db push`.
4. Optioneel: `npm run seed` maakt een testgebruiker met 60 neptransacties.
5. `npm run dev` en open http://localhost:3000

Zonder `SUPABASE_SECRET_KEY` staat de uitnodigingscode-controle uit, zodat je lokaal vrij kunt registreren.

## Controles

- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm test` — unittests (tekst opschonen, salarisperiode, verdeling, bankmapping, inzichten, pilotcijfers)
- `npm run build` — productiebuild

## Deploy naar Vercel

1. Maak een Supabase-project (regio `eu-central-1`) en voer de migraties uit.
   Zet in Authentication → URL configuration de site-URL en `https://<domein>/auth/callback` als redirect.
   Voor Inloggen met Apple: zet de Apple-provider aan met je Services ID, team ID, key ID en private key.
2. Maak een Vercel-project aan op deze repo en zet de environment variables uit `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL` (bijvoorbeeld `https://app.voorbeeld.nl`)
   - `ADMIN_EMAILS` (wie `/admin` mag zien), `CRON_SECRET` (willekeurige lange string)
   - `ENABLE_BANKING_APP_ID`, `ENABLE_BANKING_PRIVATE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (maak ze met `npx web-push generate-vapid-keys`)
3. Registreer bij Enable Banking de redirect-URL `https://<domein>/api/bank/callback`.
4. De planning draait in GitHub Actions (`.github/workflows/cron.yml`), omdat Vercel Hobby maar één cron per dag
   toestaat. Zet in GitHub onder Settings → Secrets and variables → Actions het secret `CRON_SECRET` (zelfde waarde
   als in Vercel) en, als de app niet op `financeapppilot.vercel.app` staat, de variable `APP_URL`. De workflow roept
   `/api/cron/sync` (06:00 en 18:00 UTC) en `/api/cron/notify` (18:00 en 19:00 UTC, stuurt alleen om 20:00 Nederlandse
   tijd) aan met `Authorization: Bearer $CRON_SECRET`. Let op: GitHub zet geplande workflows uit na 60 dagen zonder
   commits; een commit zet ze weer aan.
5. Registreer jezelf met een adres uit `ADMIN_EMAILS`; die adressen hebben geen uitnodigingscode nodig.
   Maak daarna via `/admin` uitnodigingscodes en deel ze als `/registreren?code=PILOT-XXXX`.

## Bankkoppeling (Enable Banking)

Transacties worden uitsluitend server-side opgehaald met een RS256-JWT (kid = application ID).
IBAN's slaan we alleen gemaskeerd en gehasht op; de hash dient om overboekingen tussen eigen
rekeningen te herkennen. Toestemming verloopt na ~90 dagen; de app waarschuwt 7 dagen vooraf.

## Structuur

- `app/` — routes. `(auth)` publieke pagina's, `(app)` de app-shell met onderbalk, `onboarding/`,
  `bank/`, `admin/`, `api/` (bankcallback, crons, export).
- `components/` — UI-componenten (ui, categories, bank, overview, push, auth, layout).
- `lib/` — Supabase-clients, auth (DAL), Enable Banking, bank-sync, inzichten, push, formattering.
- `supabase/migrations/` — SQL-migraties met Row Level Security.
- `scripts/` — seed-script en icoongenerator.
- `docs/design.md` — design tokens; `docs/beslissingen.md` — productkeuzes.
