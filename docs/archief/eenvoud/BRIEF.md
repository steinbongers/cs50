# BRIEF: de app rustiger en makkelijker (12 november 2026)

Aanleiding (Stein): "ik vind de app er nu best ingewikkeld uit zien met alle cijfers etc overal. Maak het
overzichtelijker en makkelijker, ook de uitleg erbij."

Twee doorlichtingen liggen ernaast: `docs/archief/eenvoud/ux.md` (schermen) en `docs/archief/eenvoud/copy.md` (teksten, met
herschrijftabel en woordenlijst). Deze BRIEF beslist waar die twee botsen of te ver gaan. Bij twijfel wint de BRIEF.

## Doel

Per scherm één getal of één actie waar het om draait. Uitleg: hooguit één korte zin, en overal dezelfde woorden.

## Harde regels

- Geen nieuwe functies. Alleen weglaten, verplaatsen, samenvoegen, herschrijven.
- Geen wijzigingen aan de database, migraties, API-routes, rekenregels of bankkoppeling. Alleen wat je ziet.
- Niets weghalen wat nodig is voor de werking of voor AVG-rechten (gegevens downloaden, account verwijderen, privacy).
- Routes blijven heten zoals ze heten (`/swipen` blijft `/swipen`).
- Nederlands, je-vorm, geen em-streepjes, geen jargon.
- De repo is openbaar: geen sleutels, tokens of echte transactiegegevens in code, tests of commits.
- Werk alleen in je eigen bestanden (zie de verdeling). Niet committen, niet pushen; de projectleider doet dat.
- Raak `ios/App/App.xcodeproj` niet aan.
- Tests die op een oude tekst controleren pas je mee aan. Verwijder geen test omdat hij lastig is.

## Beslissingen van de projectleider

1. **Woorden.** Neem de woordenlijst uit `copy.md` over: Nog over (vóór de eerste hele maand: Over per maand),
   Vaste kosten / Vaste inkomsten, Altijd in dit potje, Telt niet mee, Kaartje, Geld terug, Spaarpotje, Maand.
   Het woord "vrij" verdwijnt uit beeld.
2. **Tabblad blijft "Swipen".** De hernoeming naar "Indelen" (`config/app.ts` `ACTION_LABEL`) doen we NIET; dat is
   een keuze voor Stein. In lopende tekst mag "indelen" wel.
3. **`APP_NAME` blijft `[Appnaam]`.** Schrijf teksten zo dat de naam niet nodig is (bijv. Apple Pay stap 4: "Zoek
   Betaling indelen").
4. **De knop "Vast" op Swipen blijft zichtbaar onder het kaartje** (Stein vroeg daar gisteren om). Hij krijgt
   alleen het nieuwe label "Elke maand" en de nieuwe meldingsteksten. Dus GEEN "Meer"-sheet; Verdelen, Later en
   Niet meetellen blijven staan waar ze staan.
5. **De streak blijft**, maar zonder eigen kopregel: streak en saldoknop gaan naast het zoek-icoon in de maandkop
   als dat past; past het niet netjes, laat de kopregel dan staan.
6. **Meer inzicht:** geen grafieken weghalen. Alleen ondertitels en voetnoten inkorten volgens `copy.md`, en
   `WeekReviewCard` komt hier bovenaan (verhuisd van Overzicht).
7. **Potje-detail:** de weekgrafiek blijft. Alleen rijsuffixen inkorten.
8. **Overzicht** volgt `ux.md` punt 1 verder helemaal: detailregel uit `MonthLeftCard`, legenda uit `SpendBar`,
   onder het totaal alleen de vergelijkingschip, `FocusCard` weg van Overzicht, één getal per potjes- en spaarrij,
   rij "Vaste lasten" verbergen zodra de vaste maand is ingesteld, link "Alle kaartjes" onderaan weg.
9. **Swipen:** bedragen van de tegels af (ook de animatie die erbij hoort mag weg, "Uit je spaarpot" blijft); kop
   alleen "Nog N"; op de kaart tijd en "Saldo daarna" weg, mits het saldo nog in de ruwe gegevens (`raw-sheet.tsx`)
   te vinden is, anders daar toevoegen.
10. **Instellingen:** hints weg behalve statuswaarden en foutmeldingen; groepen "Meldingen" en "App"; "Account
    verwijderen" in de groep Gegevens. "Hulp en contact" blijft op de hoofdpagina staan.
11. **Apple Pay instellen:** de zes stappen volgens `copy.md` deel 4. De drie "vragen voor de bouwer" daar zijn
    nieuwe functies en doen we nu niet.
12. **Widget (Swift):** alleen de teksten aanpassen, geen logica. Dit kan niet getest worden; houd het bij
    letterlijke vervanging van strings.
13. Ongebruikte componenten en imports na het weghalen opruimen, zodat lint groen blijft.

## Verdeling (geen overlap in bestanden)

- **Bouwer A, Overzicht:** `app/(app)/overzicht/**`, `components/overview/**`, `components/insights/**`,
  `components/fixed/**`, `app/(app)/potjes/**`.
- **Bouwer B, Swipen:** `app/(app)/swipen/**`, `app/(app)/transacties/**`, `components/transactions/**`,
  `components/refunds/**`.
- **Bouwer C, Instellingen en instap:** `app/(app)/instellingen/**`, `app/bank/**`, `app/onboarding/**`,
  `components/native/**`, `components/push/**`, `components/bank/**`, `lib/push/payment-copy.ts`,
  `lib/bank/import-from.ts`, `ios/App/Widget/*.swift`.

Staat een tekst uit de tabel in een bestand buiten je deel, laat hem dan staan en meld het in je verslag.

## Klaar is

`npm run typecheck`, `npm run lint` en `npm test` groen voor jouw bestanden, en een kort verslag: wat is gedaan,
wat bewust niet, en wat je niet kon controleren.
