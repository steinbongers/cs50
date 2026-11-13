# UX-doorlichting: drukte per scherm (12 november 2026)

Paden relatief aan de repo. `page.tsx` zonder map is `app/(app)/overzicht/page.tsx`; `sort-screen.tsx` staat in
`app/(app)/swipen/`. Regelnummers zijn van commit 0217282 en kunnen verschuiven. Waar dit botst met `BRIEF.md`,
wint de BRIEF.

Kern: de klacht zit vooral op Overzicht (25 tot 40 bedragen in één scroll) en op Swipen (bedrag op elke tegel plus
vijf nevenknoppen).

## 1. Overzicht

Inventaris, van boven naar beneden:
- Kopregel met streak en saldoknop (`page.tsx:263-270`), maandtitel met ondertitel, zoeken en bladeren
  (`:278-307`), schakelaar Uitgaven/Inkomsten (`:314`).
- Takenstrook "9 kaartjes wachten" met knop (`:342-352`).
- "Contant over" (`:368`).
- "Nog over" met groot bedrag plus drie bedragen eronder (`:370`, `components/overview/month-left-card.tsx:37-38,46`).
- "Uitgegeven" in 36 px, balk, legenda met tot zeven percentages (`:386`, `components/overview/spend-bar.tsx:128-154`).
- Spaarregel (`:388`), "geld terug zonder potje" (`:389-393`), vergelijkingschip met "Op basis van" (`:394-409`),
  opvallend potje (`:414-427`).
- FocusCard (`:429-431`) en WeekReviewCard met zes bedragen (`:433`).
- Potjeslijst: per rij balk, bedrag en budgetlabel (`:435-477`).
- Sparen: per rij stand, balk, doellabel, mutatie en "wanneer" (`:479`, `components/overview/savings-section.tsx:46-64`).
- Nog te krijgen (`:481`), Vaste lasten (`:483-500`), Meer inzicht (`:505-517`), Alle kaartjes (`:519-525`),
  Vernieuwen (`:527`).

Het ene getal: "Nog over". Zonder ingestelde vaste maand: "Uitgegeven".

Voorstel:
- Blijft: maandtitel, takenstrook, Nog over, Uitgegeven met balk, de chip, potjeslijst, Sparen, Nog te krijgen,
  Meer inzicht.
- `MonthLeftCard`: de detailregel met drie bedragen weg.
- `SpendBar`: de hele legenda weg; de potjeslijst eronder is de legenda. Tikken op de balk blijft.
- Onder het totaal alleen de chip. Weg: spaarregel, geld-terug-regel, basisregel en opvallend potje.
- `FocusCard` weg van Overzicht; het potje staat al in de lijst.
- `WeekReviewCard` verhuist naar `/overzicht/inzicht`, bovenaan.
- Potjesrij: `PotjeProgress` alleen bij een budget; het budgetlabel alleen bij "over".
- Sparen: per rij alleen naam en stand; balk, doellabel en mutatie staan in het potje-detail.
- Kopregel `:263-270`: zie BRIEF punt 5 (streak blijft, liefst in de maandkop).
- De rij "Vaste lasten" verbergen zodra de vaste maand is ingesteld.
- De link "Alle kaartjes" onderaan weg; het zoek-icoon doet dit al.

## 2. Swipen

Inventaris:
- Kop: "€ 412 over · Nog 9" (`sort-screen.tsx:1117-1119`) en voortgangsbalk (`:1122-1128`).
- Kaart: datum en tijd, badge, naam, bedrag, omschrijving, "Saldo daarna" (`app/(app)/swipen/transaction-card.tsx:118-164`).
- Onder de kaart: "Ik krijg een deel terug" (`:1161-1178`), "Vast" (`:1190-1206`), "Niet meetellen" (`:1208-1214`).
- Kop "Welk potje?" en tegels met op elke tegel een maandbedrag (`app/(app)/swipen/category-tiles.tsx:217-226`).
- Onderin: Verdelen (`:1286-1302`) en Later (`:1304-1313`).

De ene actie: een potje tikken. Het enige getal is het bedrag op de kaart.

Voorstel (zie BRIEF punt 4 en 9; er komt geen "Meer"-sheet):
- Kop: alleen "Nog 9".
- Kaart: tijd (`transaction-card.tsx:120`) en "Saldo daarna" (`:162-164`) weg, mits `raw-sheet.tsx` het saldo toont.
- Tegels: bedrag weg, icoon en naam blijven. "Uit je spaarpot" blijft.

## 3. Potje-detail (`app/(app)/potjes/[id]/potje-detail.tsx`)

Rijsuffix (`:36-44`) inkorten tot "wacht op geld terug" of "jouw deel"; de bedragen staan in de sheet. De
weekgrafiek blijft (BRIEF punt 7).

## 4. Meer inzicht (`app/(app)/overzicht/inzicht/page.tsx`)

Zes kaarten, elk met titel, ondertitel en voetnoot (`:154-334`). Geen kaarten weg (BRIEF punt 6); ondertitels en
voetnoten volgens de teksttabel. `WeekReviewCard` komt bovenaan.

## 5. Vaste lasten en Je vaste maand

- `app/(app)/overzicht/vaste-lasten/page.tsx` (automatisch herkend) en `components/fixed/fixed-picker.tsx` (zelf
  aangetikt) zijn dubbel. Met ingestelde vaste maand linkt Overzicht niet meer naar de eerste.
- `FixedPicker`: het ene getal is "Over per maand" (`:272`); de regel "erin, eruit" (`:270`) weg.

## 6. Instellingen (`app/(app)/instellingen/page.tsx`)

Ongeveer 19 rijen, bijna allemaal met een hint. Profiel (`:49`), Geld met vijf rijen (`:51-82`), "Meldingen en
weergave" met acht rijen (`:84-91`, waarvan drie uit `components/native/payment-settings.tsx:99-117`), Gegevens
(`:93-109`), Over (`:111-126`), Uitloggen, Account verwijderen.

Voorstel:
- Hints weg, behalve de statuswaarde bij Bank en de foutmeldingen.
- "Meldingen en weergave" splitsen in "Meldingen" (push, na elke betaling, verberg bedrag, Apple Pay instellen) en
  "App" (thema, trillen, vergrendeling, widget).
- "Account verwijderen" in de groep Gegevens, naast downloaden en Privacy. Alle AVG-rechten blijven zichtbaar.

## 7. Laten staan

Transacties (behalve teksten), onboarding (behalve teksten en de `FixedPicker`-voet), bankkoppeling (behalve
teksten) en `components/layout/bottom-nav.tsx`.
