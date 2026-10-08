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

## Controles

- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm run build` — productiebuild

## Structuur

- `app/` — routes (App Router). `(auth)` publieke pagina's, `(app)` de app-shell met onderbalk,
  `onboarding/` de eerste keer.
- `components/ui/` — basiscomponenten (Button, Card, Sheet, ProgressBar, …).
- `lib/` — Supabase-clients, auth (DAL), formattering, potjes.
- `supabase/migrations/` — SQL-migraties met Row Level Security.
- `docs/design.md` — design tokens en herkomst van het kleurenpalet.
