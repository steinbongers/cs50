# Productbeslissingen

Keuzes van Stein die afwijken van of een aanvulling zijn op de spec. Datum: 8 oktober 2026.

## Hoofdscherm (fase 2): tikken, niet vegen

- De transactiekaart staat **bovenin**; de kaart reageert niet op slepen of vegen.
- Daaronder staan **alle potjes als knoppen in rijen** (icoon + naam), allemaal zichtbaar, geen scrollen.
  Eén tik is de keuze. "Ander potje" uit de spec vervalt daardoor.
- **Overslaan** ("Later") en **Ongedaan maken** (4 seconden) zijn knoppen.
- De potjesknoppen staan in de **vaste volgorde van de gebruiker** (onboarding, later herschikbaar).
  Geen "meestgebruikte eerst": dat is een hint van de app en schuurt met het kernprincipe.
- De naam "Swipen" (tab, knop, teksten) krijgt later een **eigen, leuke naam** die bij de appnaam past.
  Daarom staat hij op één plek: `ACTION_LABEL` en `ACTION_VERB` in `config/app.ts`.
- Swipe-richtingen (`categories.swipe_direction`) worden niet meer gebruikt in de UI; de kolom blijft
  bestaan maar is leeg voor nieuwe gebruikers.

## Uiterlijk

- **Uitstraling:** rustig en minimaal. Veel witruimte, kleur alleen voor de hoofdactie en de potjes.
- **Kaart:** tegenpartij groot, bedrag eronder in kleur, datum en omschrijving klein.
- **Potjes:** lijniconen (lucide-react) in de potjeskleur op een zacht kleurvlak, geen emoji.
  De gebruiker kiest het icoon in de onboarding.
- **Overzicht:** top-potjes als horizontale balken, geen donut.
- **Toon:** speels met een knipoog. Je-vorm, kort, af en toe een compliment.
- **Beweging:** iets meer beleving dan het minimum: kaart glijdt weg met een lichte draai, het gekozen
  potje veert kort op, klein feestmoment als alles een potje heeft. Altijd `prefers-reduced-motion`.

## Nog open

- Supabase-project (Pro-organisatie, kost geld): aanmaken of zelf aanleveren?
- GitHub-toegang voor pushen (Claude GitHub App voor `steinbongers/cs50`).
- Primaire knop: `#0075ff` met witte tekst is 4,2:1 (net onder AA). Houden of `#006be8`?
- Accentkleur: Voorgeschoten-amber (`#b76e00`) of iets anders?
