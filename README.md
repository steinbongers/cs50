# finance-app

Mobiele web-app (PWA) waarmee je elke banktransactie zelf naar een potje swipet.
Gebouwd met Next.js (App Router), TypeScript, Tailwind CSS en Supabase.

De app heeft nog geen naam: zie `config/app.ts` (`APP_NAME`).

## Lokaal draaien

1. Installeer afhankelijkheden: `npm install`
2. Kopieer `.env.example` naar `.env.local` en vul de Supabase-waarden in.
3. Voer de migraties uit op je Supabase-project (`supabase/migrations/*.sql`), bijvoorbeeld
   via de SQL-editor of `supabase db push`.
4. Optioneel: `npm run seed` maakt een testgebruiker met 60 neptransacties.
5. Start: `npm run dev` en open http://localhost:3000

## Bankkoppeling (Enable Banking)

1. Maak in het Enable Banking control panel een applicatie aan en upload je certificaat.
2. Zet `ENABLE_BANKING_APP_ID` en `ENABLE_BANKING_PRIVATE_KEY` (PEM, newlines als `\n`) in de env.
3. Registreer de redirect-URL `https://<jouw-domein>/api/bank/callback` bij de applicatie.
4. Vercel Cron (`vercel.json`) roept `/api/cron/sync` twee keer per dag aan met `Authorization: Bearer $CRON_SECRET`.

Transacties worden server-side opgehaald; IBAN's slaan we alleen gemaskeerd en gehasht op.

## Controles

- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm test` — unittests (tekst opschonen, salarisperiode, verdeling)
- `npm run build` — productiebuild

## Structuur

- `app/` — routes (App Router). `(auth)` publieke pagina's, `(app)` de app-shell met onderbalk,
  `onboarding/` de eerste keer.
- `components/ui/` — basiscomponenten (Button, Card, Sheet, ProgressBar, …).
- `lib/` — Supabase-clients, auth (DAL), formattering, potjes.
- `supabase/migrations/` — SQL-migraties met Row Level Security.
- `docs/design.md` — design tokens en herkomst van het kleurenpalet.
- `docs/beslissingen.md` — productkeuzes die leidend zijn boven de spec.
