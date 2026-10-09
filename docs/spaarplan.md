# Plan: sparen in [Appnaam]

Status: voorstel voor Stein. Er is nog niets van gebouwd. Dit plan beschrijft hoe geld dat naar
sparen of beleggen gaat, en weer terugkomt, goed in de app komt. Onderaan staan de keuzes die
Stein moet maken.

## 1. Wat er nu misgaat

1. **Sparen telt als uitgegeven.** €100 in "Sparen & beleggen" maakt "uitgegeven" €100 hoger.
   Het geld is niet weg.
2. **Geld uit je spaarrekening telt als inkomen.** Bij inkomend geld zie je alleen
   inkomstenpotjes. €50 terug van je spaarrekening wordt dan inkomen, en je spaarpot wordt niet
   kleiner.
3. **Sparen bij dezelfde bank verdwijnt.** Staat je spaarrekening in de koppeling, dan ziet de app
   de overboeking als "naar jezelf" en slaat hem over. Je sparen komt nergens in beeld.
4. **De app weet niet hoeveel er in een spaarpot zit.** Alleen wat deze maand in het potje ging.
5. **Een spaarpotje herkent de app aan het icoon of aan een spaardoel.** Dat is per ongeluk, niet
   bewust gekozen.

## 2. Het principe

> Geld heeft drie kanten: het komt **binnen**, je **geeft het uit**, of je **zet het opzij**.
> Opzij zetten is geen uitgeven, en opzij gezet geld terughalen is geen inkomen.

Daar volgen vijf regels uit.

- **Drie getallen per maand:** Inkomsten, Uitgegeven, Gespaard. Wat er overblijft is
  inkomsten − uitgegeven − gespaard.
- **Een spaarpotje heeft een stand.** "Er zit € 1.240 in", niet alleen wat er deze maand bij kwam.
- **Uitgeven van spaargeld is echt uitgeven.** Je vakantie kost € 600, ook als je ervoor spaarde.
  De app laat zien dat het uit je spaarpot kwam, zodat de maand verklaard is en niet als mislukt
  voelt.
- **Jij beslist.** De app herkent, stelt een vraag of zet spaarpotjes vooraan, maar kiest niets
  voor je. De enige uitzondering is wat je zelf vastzet (vaste ontvanger, gekoppelde
  spaarrekening).
- **Het moet kloppen met je bank.** Is je spaarrekening gekoppeld, dan vergelijkt de app de stand
  van je spaarpotjes met het echte saldo en zegt wat er nog niet is ingedeeld.

## 3. Soorten potjes

Elk potje krijgt bewust één soort, gekozen bij het maken of bewerken:

| Soort | Voorbeelden | Telt als |
|---|---|---|
| Uitgaven | Boodschappen, Vervoer | Uitgegeven |
| Inkomsten | Salaris, Bijbaan, Zakgeld | Inkomsten |
| **Sparen** | Buffer, Vakantie, Beleggen | **Gespaard** (eigen stand) |

Bestaande potjes worden één keer omgezet. Inkomen blijft inkomen. Een potje met het
spaarvarken-icoon of een spaardoel wordt Sparen ("Sparen & beleggen" dus ook). De rest wordt
Uitgaven. Stein kan dit per potje nog wijzigen.

## 4. Elke situatie, en wat de app doet

### A. Je zet geld op je spaarrekening

| Situatie | Wat de app doet |
|---|---|
| **Spaarrekening bij dezelfde bank, wel gekoppeld** | De bank geeft het rekeningtype mee (`cash_account_type`, bijvoorbeeld `SVGS`). De app herkent "naar je eigen spaarrekening". De overboeking wordt niet meer overgeslagen, maar komt vanzelf in het spaarpotje dat bij die rekening hoort. Je kiest dat één keer. Zo'n kaartje hoef je niet te swipen. Je ziet het wel in je lijst. |
| **Spaarrekening bij dezelfde bank, niet gekoppeld** | Gewoon een kaartje. Herkent de app de tekst ("spaarrekening", "sparen", je eigen naam als tegenpartij), dan staan je spaarpotjes vooraan met de hint "Naar je spaarrekening?". Houd je het potje ingedrukt, dan gaat die rekening voortaan vanzelf (vaste ontvanger, bestaat al). |
| **Spaarrekening bij een andere bank** | Hetzelfde als hierboven: kaartje, hint, en eventueel een vaste ontvanger. |
| **Automatisch sparen door de bank** (afronden, vast bedrag per week) | Dat zijn veel kleine overboekingen. Eén keer vastzetten via de vaste ontvanger, daarna gaat het vanzelf. |
| **Spaarpotjes van de bank** (bunq-potjes, ING Sparen, ABN-doelen) | Elk potje is bij de bank een eigen rekening. Bij koppelen kies je per rekening het spaarpotje in de app. |

### B. Je haalt geld van je spaarrekening

| Situatie | Wat de app doet |
|---|---|
| **Van je gekoppelde spaarrekening** | Gaat vanzelf uit het gekoppelde spaarpotje. De stand daalt. Het telt niet als inkomen. |
| **Ander inkomend geld** (niet herkend) | Bij inkomend geld zie je naast je inkomstenpotjes ook je spaarpotjes, met het label "Uit je spaarpot". Kies je er een, dan daalt de stand. |
| **Je haalt het eruit voor een aankoop** (vakantie, laptop) | De aankoop zelf is een gewone uitgave in Vakantie of Elektronica. In het maandoverzicht staat dan: "Uitgegeven € 1.900, waarvan € 600 uit je spaarpot." |
| **Je haalt het eruit om de maand rond te krijgen** | Zelfde regel. Overzicht toont rustig "€ 200 uit je buffer gehaald", zonder oordeel. |

### C. Beleggen

| Situatie | Wat de app doet |
|---|---|
| **Naar een broker** (DEGIRO, Trade Republic, Bux, Meesman, Brand New Day, Peaks, Scalable) | Herkend aan de tegenpartij. Spaarpotjes staan vooraan met de hint "Naar beleggen?". Telt als Gespaard. |
| **Verkoop of uitkering terug naar je rekening** | Als B: uit het spaarpotje Beleggen. |
| **Koerswinst of -verlies** | Ziet de app niet: alleen wat je erin en eruit deed. Zeg dat eerlijk: "Ingelegd: € 2.400." Geen nep-rendement. |

### D. Rente en bijzonderheden

- **Rente op je gekoppelde spaarrekening** komt in het spaarpotje en staat apart als "Rente".
  Het is wel inkomen, maar zit niet in "vrij te besteden".
- **Een Tikkie die je direct doorzet naar sparen** bestaat uit twee kaartjes: de Tikkie gaat via
  Terugbetaling naar de uitgave, de overboeking naar sparen.
- **Erin en eruit in dezelfde maand** telt netto: € 300 erin en € 100 eruit is "Gespaard € 200".
- **Eén spaarrekening voor meerdere doelen.** Een storting kun je met **Verdelen** over meerdere
  spaarpotjes zetten (wordt nu gebouwd voor de creditcard).
- **Eigen overboeking tussen twee betaalrekeningen** blijft overgeslagen. Dat is geen sparen.

## 5. De stand van een spaarpotje

```
Stand = startsaldo + alles erin − alles eruit
```

- **Startsaldo.** Bij het maken van een spaarpotje vraagt de app: "Staat hier al geld op?"
  (mag €0). Zonder startsaldo begint de stand bij de eerste storting in de app.
- **Controle met je bank.** Is de spaarrekening gekoppeld, dan staat in het spaarpotje:
  "Volgens je bank € 1.240. Je spaarpotjes samen € 1.200. € 40 nog niet ingedeeld (rente?)",
  met een knop om het verschil in een spaarpotje te zetten.
- **Doel met datum** (optioneel): "€ 600 voor 1 juni". De app rekent "€ 85 per maand" uit en
  zegt rustig of je op schema ligt ("Op schema" of "Nog € 40 per maand extra om het te halen").
  Geen rood, geen schuld.

## 6. Overzicht

Boven de ring komen drie getallen naast elkaar:

```
Inkomsten   Uitgegeven   Gespaard
 € 2.150     € 1.480      € 300
                    Over: € 370
```

- **De ring** blijft alleen over uitgaven. Spaarpotjes staan er niet in.
- **Nieuw blok "Sparen":** per spaarpotje de stand, een voortgangsbalk naar het doel en "+ € 150
  deze maand" (of "− € 200").
- **In "Meer inzicht" (wordt nu gebouwd):** een lijn met je totale spaarstand over de laatste
  12 maanden, en een staaf per maand voor gespaard (erin min eruit).
- **Vrij tot de 25e:** een vaste overboeking naar sparen telt mee als komende vaste last, als
  "Sparen (vast)". Wat je al opzij zette, is niet meer vrij.

## 7. Wat er in de database verandert

| Wijziging | Waarvoor |
|---|---|
| `categories.kind` (`expense` / `income` / `savings`) | Bewuste soort; vervangt de gok op icoon of doel. `is_income` blijft voorlopig bestaan voor oude code. |
| `categories.savings_start_balance` | Startsaldo van een spaarpotje |
| `categories.goal_date` | Doel met datum |
| `accounts.account_type` (uit `cash_account_type`) | Spaarrekening herkennen |
| `accounts.savings_category_id` | Gekoppelde spaarrekening → spaarpotje |
| `transactions.is_internal_transfer` blijft | Maar een overboeking naar een eigen *spaar*rekening wordt niet meer overgeslagen. Hij gaat vanzelf in het gekoppelde spaarpotje. |

In de berekening (`lib/insights/compute.ts`) komt er naast `spendOf` en `incomeOf` (wordt nu
gebouwd) ook `savedOf`. Een spaarpotje telt nooit mee in uitgegeven of inkomsten.

## 8. Bouwvolgorde

1. **Fase 1 (de basis, ±1 dag):** soort per potje plus de eenmalige omzetting. Sparen telt niet
   meer als uitgegeven. Spaarpotjes staan bij inkomend geld ("Uit je spaarpot"). Overzicht met de
   drie getallen en het blok Sparen met de stand.
2. **Fase 2 (koppelen, ±1 dag):** spaarrekening herkennen aan het rekeningtype, rekening →
   spaarpotje, eigen spaaroverboekingen vanzelf indelen, startsaldo, controle met de bank.
3. **Fase 3 (doelen, ±½ dag):** doel met datum, "€ X per maand", "waarvan € X uit je spaarpot"
   en de spaargrafiek.
4. **Fase 4 (herkennen, ±½ dag):** tekstherkenning voor spaarrekeningen en brokers met hints, en
   rente apart.

## 9. Wat de pilot meet

- Hoeveel testers maken een spaarpotje, en hoeveel geven er een doel?
- Klopt de stand met de bank (verschil < €1) bij testers met een gekoppelde spaarrekening?
- Hoe vaak wordt "Uit je spaarpot" gekozen, en haken zulke testers vaker af? Dit zegt iets over
  de toon.

## 10. Keuzes voor Stein

1. **Gekoppelde spaarrekening:** overboekingen vanzelf in het spaarpotje (mijn advies), of toch
   als kaartje op de stapel?
2. **"Vrij tot de 25e":** vaste spaaroverboekingen aftrekken als vaste last (mijn advies), of
   alleen wat al is overgemaakt?
3. **Rente:** in het spaarpotje (mijn advies), of in een inkomstenpotje?
4. **Beleggen:** een eigen soort ("Beleggen", stand = ingelegd), of gewoon een spaarpotje (mijn
   advies, eenvoudiger)?
5. **Startsaldo:** vragen bij het maken van een spaarpotje (mijn advies), of overslaan?
