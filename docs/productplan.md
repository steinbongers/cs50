# Productplan afwerkronde ([Appnaam])

Stand: 8 oktober 2026, voor de pilot van volgende week. Bij een conflict wint `docs/beslissingen.md`. Waar twee besluiten elkaar daar tegenspreken, geldt het nieuwste: de ring op Overzicht (navigatiebesluit) gaat voor de oudere regel "horizontale balken, geen donut". 4 tegels per rij gaat voor 3 per rij.

## 1. Visie
1. [Appnaam] is de rustigste manier voor 18-30-jarigen om te weten waar hun geld heen gaat: elk kaartje stop je zelf in een potje, met één tik.
2. We delen niets automatisch in en voorspellen niets. Die ene seconde aandacht per betaling ís het product.
3. We winnen van Copilot, Emma en de bank-apps door minder te tonen: alleen getallen die helpen bij een beslissing, in een strak Voorgeschoten-jasje.

## 2. Tone of voice
- **Vorm.** Altijd jij-vorm. De ik-vorm alleen op knoppen die de gebruiker zelf "zegt" ("Ik krijg geld terug").
- **Kort.** Eén gedachte per zin, het liefst onder de 12 woorden. Koppen zonder punt.
- **Vaste woorden:** kaartje, potje, stapel, maand (nooit "periode"), Later, Ongedaan maken, Voorgeschoten, Nog te krijgen, Terugbetaling.
- **Geen jargon.** Niet "transactie", "sessie", "server", "omgeving" of "data", maar "kaartje", "bank", "gegevens".
- **Geen schuld, geen les.** Over budget heet "over je budget", in amber, nooit rood. Nooit "te veel", "helaas" of "pas op".
- **Humor alleen bij succes en lege schermen.** Kort en droog: "Stapel weg. Lekker bezig." Geen grappen bij fouten, geld kwijt of verwijderen.
- **Foutmeldingen** zeggen wat er gebeurde en wat je nu kunt doen, plus "Je gegevens zijn veilig." als dat geruststelt.
- **Bedragen:** `€ 12,50`; uitgaven op de kaart `− € 12,50`, inkomend `+ € 12,50`. Op Overzicht hele euro's (`€ 312`).
- **Knoppen** zijn werkwoorden ("Bank koppelen", "Verwerken"). Annuleren heet altijd "Toch niet".
- **Meldingen:** titel ≤ 40 tekens, tekst ≤ 90 tekens. Nooit bedragen of winkelnamen op het vergrendelscherm.
- **Typografie:** geen uitroeptekens, geen emoji, Nederlandse aanhalingstekens ‘…’. De appnaam altijd via `APP_NAME`.
- **Het principe** leggen we één keer uit, in Welkom en de coach: "Jij beslist waar elk bedrag hoort. Wij vullen niets in."

## 3. Gekozen functies en acceptatiecriteria

### P0: fundament van de afwerkronde

**F1 Slim startscherm**
- `/` gaat naar `/onboarding` als die niet af is. Liggen er open kaartjes, dan naar `/swipen`, anders naar `/overzicht`.
- `manifest.start_url` is `/`. Na het inloggen ga je standaard via `/`.
- De 20:00-melding opent `/swipen`, de melding op salarisdag `/overzicht?maand=1`.
- Het tabblad Swipen krijgt een badge met het aantal open kaartjes: amber, "99+" als maximum, niet zichtbaar bij 0 of als je al op Swipen staat.
- Klaar als: de unittest op de routekeuze slaagt (0 kaartjes en 5 kaartjes), en er geen tussenpagina knippert (redirect op de server).

**F2 Swipen zonder scrollen**
- Op 390×844 passen header, kaart, actieregel en 4 rijen tegels (14 of 15 tegels) zonder scrollen. Op 375×667 ook, in de compacte variant.
- Het bedrag van deze maand blijft op de tegel (dat is een besluit). Alleen in de compacte variant (hoogte ≤ 700 px) valt het weg.
- Later staat in één regel naast "Ik krijg geld terug", direct onder de kaart.
- De hulpregel boven de tegels wordt `sr-only` ("Welk potje?").
- Haptiek: een korte tik bij elke keuze, succes bij een lege stapel. Werkt waar het toestel het ondersteunt.

**F3 Twaalf standaardpotjes**
- Boodschappen, Eten & drinken, Vervoer, Wonen, Abonnementen, Zorg & verzekeringen, Kleding & verzorging, Uitgaan & vrije tijd, Vakantie, Cadeaus & goede doelen, Sparen & beleggen, Inkomen. Plus Overig en het vaste Voorgeschoten.
- Tegels die naast of onder elkaar staan hebben nooit dezelfde kleur.
- Snelle suggesties in de editor: Studie, Huisdier, Kinderen.
- Een hulpregel per potje: "Ook auto, brandstof en parkeren", enzovoort.
- In de onboarding staan alle potjes aan. Bestaande gebruikers houden hun eigen potjes; er komt geen hernoem-migratie.

**F4 Overzicht zonder loze getallen**
- Het percentage per potje verdwijnt.
- Bovenaan staat de takenstrook "9 kaartjes wachten" met de knop `ACTION_LABEL`. Alleen in de lopende maand en alleen als er kaartjes open zijn.
- Eén vergelijkingschip met het gemiddelde, en maximaal één opvallend potje.
- Een zoekicoon en een link "Alle transacties" naar `/transacties`.

### P1: grotere functies

**F5 Budget per potje met voortgang**
- Instellen in het potje-detail, via de sheet "Wat wil je bijhouden?" met de keuze "Maximaal per maand" of "Sparen voor een doel".
- In de lijst op Overzicht en in het detail een balk van 4 px in de potjeskleur, met daarnaast "Nog € 88".
- Boven 100% wordt de balk amber, met "€ 14 over je budget".
- Ook in vorige maanden zichtbaar; dat is de Jouw-maand-stand.
- Geen budget op de tegels en geen voorgesteld budget.

**F6 Spaardoel op een potje**
- Een doelbedrag. De voortgang is de som van alles wat de gebruiker ooit in dit potje stopte.
- Tekst: "€ 340 van € 1.000 · nog € 660". Gehaald: "Doel gehaald. Netjes."
- Een potje heeft óf een budget óf een doel. Dat geldt niet voor Inkomen en Voorgeschoten.
- Geen einddatum en geen "nog N maanden" (dat zou een voorspelling zijn).

**F7 Zoeken en alle transacties (`/transacties`)**
- Zoeken op tegenpartij, omschrijving en notitie: minimaal 2 tekens, 250 ms vertraging.
- Chips voor potje en maand (lopend plus 3 terug), lijst per dag.
- Tik opent een sheet met "Naar ander potje" (raster van 4) en de notitie.
- Leeg: "Niets gevonden voor ‘albert’. Probeer een deel van de naam."
- Niet: bulk-indelen of suggesties.

**F8 Notitie bij een kaartje**
- Maximaal 140 tekens, nooit verplicht.
- Te bewerken vanuit de banktekst-sheet op Swipen, het potje-detail en `/transacties`.
- Doorzoekbaar en komt mee in de CSV-export.

**F9 Voorgeschoten per persoon**
- "Nog te krijgen" wordt gegroepeerd per naam ("Sanne · € 24 · 3 delen"). Delen zonder naam staan onder "Zonder naam".
- "Alles van Sanne ontvangen" handelt al haar delen in één keer af.
- Bij een deel dat 14 dagen of langer openstaat: "sinds 23 dagen".
- In de Terugbetaling-sheet staan delen met dezelfde naam als de tegenpartij bovenaan, maar niet aangevinkt.
- Antwoord aan Stein: ja, de Terugbetaling-tegel werkt al voor terugbetalingen. Zonder bank vink je een deel af met "Betaald" of "Anders geregeld".

**F10 Maandinzicht: één opvallend potje**
- Het potje met de grootste afwijking ten opzichte van zijn eigen gemiddelde, op dezelfde dag van de maand.
- Alleen als |verschil| ≥ € 25 én ≥ 25%, minstens 1 vorige maand bekend is en het minstens dag 7 is. Tik opent het potje.

**F11 Afwerking**
- Lege staten, skeletons per route, contrast, donkere stand en de copy-verbeteringen per scherm.
- Magic link uit het loginformulier, zoals besloten.
- Account verwijderen na één bevestiging, zoals besloten (geen "VERWIJDER" meer typen).

## 4. Ontwerpregels (maten)
- **Raster:** 4/8. Zijmarge 16 (`px-4`), tussen secties 24, binnen kaarten 16, tussenruimte in rasters 6 (`gap-1.5`).
- **Radius:** kaart 20 (`rounded-card`), grote kaart 24, knop 14, tegel 16 (`rounded-2xl`), chips en schakelaars `rounded-full`.
- **Typografie (Inter, 400/500/600):**
  - grote titel 28/34 `tracking-[-0.02em]`
  - titel 22/28
  - kop 17/22
  - body 15/20
  - klein 13/18
  - tegel- en tablabel 11/13 medium
  - bedragen altijd `tabular-nums font-semibold`
- **Swipen op 390×844 (±687 px beschikbaar):**
  - header 48: titelregel h-7 plus `ProgressBar h-1`
  - kaart `h-[168px] p-4 rounded-card-lg`
    - datum 15 medium
    - tegenpartij 22/28 semibold `line-clamp-1`
    - bedrag 28/34
    - voetregel 13 muted
  - actieregel `h-11`
  - tegels `grid-cols-4 gap-1.5`, `h-20` (80):
    - `pt-2`
    - icoonrondje `size-7` met icoon 16 / stroke 1.75
    - naam `text-[11px] leading-[13px] font-medium line-clamp-2 hyphens-auto`
    - bedrag `text-[10px] leading-3 tabular-nums text-text-muted`
  - Optelsom: 48+12+168+12+44+12+338 = 634. Er blijft 53 px over voor de Ongedaan-maken-pil (40).
- **Compacte variant (`compact:` = `@media (max-height:700px)`):** kaart 136, tegel `h-16` zonder bedrag. Optelsom ±518 van 583.
- **Meer dan 16 tegels:** tegel `h-[72px]`. Meer dan 20: de pagina scrolt en de kaart blijft `sticky`.
- **Tikvlak** altijd ≥ 44×44. Druk: `active:scale-[0.96]` in 100 ms. Keuze: veer 1 → 1,06 → 1 in 320 ms.
- **Overzicht:**
  - kopregel `h-11`: streakchip links, zoeken en saldo `size-11` rechts
  - maandtitel 28/34 met chevrons `size-11`
  - ring 200 px, stroke 20, 2 px tussen segmenten
  - lijstrijen `min-h-14`, met budgetbalk `h-1 mt-1.5`
- **Instellingen (iOS):**
  - groepskop 13 medium muted
  - rij `min-h-[52px]`, icoontegel `size-[30px] rounded-[8px]`
  - schakelaar 51×31
  - gevaarlijke acties los onderaan
- **Animatie:**
  - kleur 150 ms, in- en uitklappen 200 ms, sheets 280 ms
  - reduced motion: alleen fades van 120 ms, geen confetti
- **Kleur:**
  - hoofdblauw `#0075ff` blijft
  - `--text-muted` licht wordt `#6b7183`, zodat kleine tekst AA haalt
  - donker: `--surface #1a1d24` plus een inset-rand van 1 px `rgba(255,255,255,.06)`

## 5. Inzichten voor de gebruiker (elk getal hoort bij een beslissing)
1. **Waar ging mijn geld heen:** ring en lijst met bedragen per potje. Geen procenten; een percentage staat alleen in de ring als je een segment aantikt.
2. **Ten opzichte van je gemiddelde:** "€ 42 minder dan je gemiddelde tot nu toe".
   - Binnen 10%: "Precies rond je gemiddelde."
   - Bij weinig historie: "· op basis van 1 maand".
   - Verborgen bij 0 vorige maanden (dan: "Je eerste maand. Vanaf volgende maand zie je hier je gemiddelde.") of vóór dag 3.
3. **Budgetstand per potje:** "Nog € 88" of "€ 14 over je budget".
4. **Spaardoel:** "€ 340 van € 1.000 · nog € 660".
5. **Nog te krijgen:** totaal en per persoon, met de leeftijd vanaf 14 dagen.
6. **Eén opvallend potje** per maand (F10).
- Bewust niet: aantal transacties, gemiddelde per transactie, spaarquote, scores, "je geeft X% uit aan".

## 6. Metingen voor Stein (/admin, geaggregeerd)
- **Weergave.** Admins zitten nooit in de cijfers. Altijd "7 van 9" naast het percentage. Bij n < 5: "Nog te weinig data".
- **Bovenaan vier noordster-tegels**, met een stip: blauw = doel gehaald, amber = niet gehaald.
  - **Activatie** = onboarding af + bank gekoppeld + ≥ 10 kaartjes binnen 72 uur. Doel ≥ 60%.
  - **W4-retentie.** Doel ≥ 40%.
  - **Binnen 7 dagen ingedeeld.** Doel ≥ 85%.
  - **Mediaan tijd per kaart**, zonder coachkaarten en zonder terugbetalingen. Doel < 4 s.
- **Trechter:** registratie → potjes → salarisdag → bank gestart → bank gekoppeld → coach af. Met één zin over de grootste uitval.
- **Gewoonte:** mediaan aantal actieve dagen per week (doel ≥ 4) en de verdeling van de streak.
- **Twijfel:** Later per swipe (doel < 15%) en het undo-percentage.
- **Potjes:**
  - aandeel van het bedrag in Overig (boven 15% passen de standaardpotjes niet);
  - gebruik van de snelle suggesties;
  - eigen potjesnamen die ≥ 2 gebruikers kozen;
  - aandeel gebruikers met een budget of doel.
- **Delen:** aandeel actieve gebruikers met ≥ 1 deel in 4 weken, en het aandeel delen dat binnen 14 dagen is afgehandeld.
- **Meldingen:** per tag geopend / verstuurd. Doel ≥ 25%.
- **Startscherm:** verdeling van de starttab (Swipen of Overzicht) en van het aantal open kaartjes bij openen.
- **Churn:** `churn_log` (zonder user_id), zodat verwijderde accounts niet stil uit de retentie verdwijnen.
- **Privacy:** events bevatten alleen enums, aantallen, duren en buckets. Nooit bedragen, tegenpartijen of namen.

## 7. Gekozen standaarden waar Stein nog moet beslissen
- **Bedrag op de tegel:** blijft. Alleen op schermen ≤ 700 px hoog valt het weg.
- **Vaste lasten:** worden niet gebouwd in deze ronde (vraag 2).
- **Nog vrij tot je salaris:** niet gebouwd, want het lijkt op een prognose (vraag 3).
- **Grijze tekst:** iets donkerder voor de leesbaarheid (vraag 4).
- **Herinneringen voor open delen en de melding "Er kwam geld binnen":** komen er niet (vraag 5).
- **Bankcopy:** geen hard "90 dagen" meer. We tonen "Geldig tot {datum}" uit de koppeling.

## 8. Definition of done
1. Alle pakketten zijn af. Een functie zit er volledig in of niet, nooit half.
2. Swipen op 390×844 scrolt niet met 14 en met 15 tegels, en op 375×667 ook niet. Getest in licht en donker en met reduced motion.
3. Nergens automatisch indelen, voorselecteren of voorspellen. De enige uitzondering blijft het overslaan van eigen overboekingen.
4. Elk getal op het scherm hoort bij een beslissing. Geen procenten als decoratie.
5. Tikvlakken ≥ 44 px. VoiceOver-labels op de tegels ("Boodschappen, € 312 deze maand"), de kaart en de badge. De focusring is zichtbaar.
6. Migraties zijn additief en hebben RLS met `(select auth.uid())`. Ze staan ook in `pilot-setup.sql`, en `lib/supabase/types.ts` is bijgewerkt.
7. Unittests voor de standaardset, de routekeuze, budget en doel, het opvallende potje, de zoekfilter en de mediaan. `tsc`, `lint`, `test` en `build` zijn groen.
8. Overal `APP_NAME`, `ACTION_LABEL` en `ACTION_VERB`; nergens een verzonnen naam.
9. `docs/beslissingen.md`, `docs/design.md` en `README.md` zijn bijgewerkt.

## 9. Bewust NIET
- Automatisch categoriseren, voorselecties, AI-suggesties, regels ("altijd AH → Boodschappen") of bulk-indelen.
- Voorspellingen: saldoprognose, "je komt tekort", "nog N maanden tot je doel".
- Betaalverzoeken, Tikkie-links, deelknoppen of herinneringen sturen naar anderen.
- Budget op de tegels, grafiekenmuren, percentages in lijsten.
- Contant geld toevoegen, meerdere banken, een weekoverzicht.
- Een appnaam of eigen naam voor de hoofdactie verzinnen.
- De opruimmigratie (`category_rules`, `swipe_direction`, `source='csv'`) schuift door naar na de pilotstart.
