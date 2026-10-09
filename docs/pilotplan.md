# Pilotplan [Appnaam]

Stand: 9 oktober 2026. Eigenaar: Stein.
Dit plan is vooraf vastgelegd. Drempels en beslisregels veranderen we niet meer zodra de pilot loopt.
Bron: `reports/Haalbaarheid potjesapp.md`. Bij een conflict over productkeuzes wint `docs/beslissingen.md`.

## 1. Doel

De pilot test het ritueel, niet het product. De hoofdvraag is:
voelt bijna dagelijks sorteren licht genoeg om vol te houden, en geeft het inzicht?

De pilot is geen lancering. Hij meet de richting van gedrag, geen gewoonte. Een gewoonte vormen duurt gemiddeld 66 dagen.

## 2. Voorwaarde vóór externe testers

Externe testers doen pas mee als beide punten rond zijn:

1. Het productiecontract met Enable Banking is getekend.
2. Enable Banking heeft de rol schriftelijk bevestigd: Enable Banking is de vergunde AIS-dienstverlener tegenover de gebruiker, en of er een melding bij DNB of FIN-FSA nodig is (zie `docs/enable-banking-mail.md`).

Is een van beide er niet, dan start de pilot met de eigen rekeningen van Stein (restricted mode). Werving van externe testers schuift dan op tot beide punten rond zijn. De klok van vier weken start pas bij de eerste externe tester.

Verder nodig vóór externe testers:

- KvK-inschrijving, bij voorkeur een BV.
- Privacytekst (staat op `/privacy`) en korte testersvoorwaarden: bèta, geen financieel advies, koppeling intrekken kan altijd.
- Verwerkersovereenkomsten met Supabase en Vercel.
- Verwerkingsregister, de concept-DPIA (`docs/dpia-concept.md`) en een datalekprocedure (72 uur).
- Werkende export en verwijdering. Die zijn er: `/api/export` en "Account verwijderen" in Instellingen.

## 3. Opzet

- **Duur:** minstens 4 weken per tester, gerekend vanaf de dag van koppelen.
- **Uitnodigen:** 30-50 mensen, met een uitnodigingscode (beheer op `/admin`).
- **Doel:** minstens 20 testers met een geslaagde bankkoppeling.
- **Verwachte uitval vóór koppelen:** 20-40%, door gebrek aan vertrouwen of een bank die niet werkt.
- **Doelgroep:** 18-30 jaar, liefst met meer dan één rekening en geregeld geld voorschieten.
- **Let op:** testers uit de eigen kring scoren altijd hoger dan de markt. Een D7 die net boven de 10-15% van de markt uitkomt, is een no-go-signaal en geen succes.
- **Admins** tellen nooit mee in de cijfers.

## 4. Drempels

Deze drempels zijn heuristieken, geen gepubliceerde normen. Ze zijn letterlijk overgenomen uit het rapport.

| Metric | Go | Grijs (aanpassen en herhalen) | No-go |
|---|---|---|---|
| Uitgenodigden met een geslaagde bankkoppeling | ≥70% | 50-70% | <50% |
| Gekoppelde testers die binnen 7 dagen ≥80% van de kaarten sorteren | ≥60% | 40-60% | <40% |
| Mediane seconden per kaart na de eerste sessie | ≤3 s | 3-6 s | >6 s |
| Afgebroken sessies bij een backlog van >20 kaarten | <30% | 30-50% | >50% |
| Actief in week 2 (≥3 dagen met een sorteeractie) | ≥50% | 30-50% | <30% |
| Actief in week 4 (curve vlakt af en daalt niet lineair) | ≥40% | 25-40% | <25% |
| Opens via de melding van 20:00 per verstuurde melding | ≥25% | 10-25% | <10% |
| iOS-testers met de PWA geïnstalleerd en push aan | ≥70% | 40-70% | <40% |
| Gesimuleerde herkoppeling afgemaakt | ≥80% | 60-80% | <60% |
| Sean Ellis "zeer teleurgesteld" (n≥15) | ≥40% | 25-40% | <25% |
| Splitfunctie minstens 1× gebruikt | ≥30% | 10-30% | <10%: feature heroverwegen, concept niet |
| Bereid te betalen €3,99/maand voor de bankkoppeling (vraag plus nepdeur) | ≥30% | 15-30% | <15% |

## 5. Beslisregels

1. **Rood** alleen als ook de bovengrens van het 95%-interval onder de no-go-drempel ligt. Bij 20 testers is een gemeten 50% ruwweg 30-70%. Kleine verschillen zijn dus geen bewijs.
2. **Groen** vraagt twee dingen: een puntschatting boven de go-drempel én bevestiging in de interviews.
3. **Alles daartussen is grijs:** aanpassen en herhalen.
4. **Veto van het kernconcept.** Het kernconcept is: "bijna dagelijks sorteren voelt licht en geeft inzicht". Daar horen bij: sorteren binnen 7 dagen, seconden per kaart, afbreken bij backlog, actief in week 2 en week 4, en wat de interviews hierover zeggen. Is het kernconcept rood, dan is de pilot een no-go, ook als de nevenfuncties groen zijn.
5. **Nevenfuncties** (splitfunctie, betaalbereidheid, meldingen) sturen het ontwerp en het verdienmodel, niet het go/no-go van het concept. Splitfunctie onder 10% betekent: feature heroverwegen, concept niet.
6. Het interval rekenen we uit met de Wilson-methode. We noteren altijd "7 van 9" naast het percentage.

## 6. Meetmomenten

| Moment | Wat | Wie |
|---|---|---|
| Dag 0 | Koppeling gelukt of niet. Bij niet: waarom (bank, vertrouwen, fout). | Iedereen die uitgenodigd is |
| Dag 2-3 | Interview, 15 minuten | 5-8 testers |
| Eind week 1 | Interview, 15-20 minuten | 5-8 andere testers |
| Week 2-3 | Gesimuleerde herkoppeling | Deel van de testers (zie 7) |
| Dag 28-30 | Eindmeting: week-4-activiteit, Sean Ellis-vraag, betaalbereidheid | Alle gekoppelde testers |
| Bij afhaken | Exitgesprek, 10 minuten | Elke afhaker |

Wie afhaakt: geen actief gebruik meer gedurende 7 dagen, of account verwijderd. Bij een verwijderd account vragen we alleen per mail of iemand wil praten. We bewaren geen gegevens die naar die persoon wijzen.

Vraag in elk gesprek wat de tester nu in plaats van de app gebruikt. Is het antwoord "mijn bank-app", dan is dat de echte concurrent.

## 7. Gesimuleerde herkoppeling (week 2-3)

Bankkoppelingen verlopen. Echte testers lopen daar in vier weken niet tegenaan, dus we simuleren het.

- Kies in week 2-3 ongeveer de helft van de gekoppelde testers.
- Vraag hen via een bericht om opnieuw te koppelen via Instellingen, Bankkoppeling.
- Meet hoeveel dat binnen 3 dagen afmaken (events `bank_connect_started` met `reconnect: true` en `bank_reconnect`).
- Noteer waar het misgaat: bankscherm, inloggen bij de bank, terugkeer naar de app.
- Drempel: zie de tabel, regel "Gesimuleerde herkoppeling afgemaakt".

## 8. Wat we loggen

De app logt alleen enums, aantallen, duren, buckets en id's. Nooit bedragen, tegenpartijen, omschrijvingen, notities of namen (`lib/events.ts`).

Voor de drempels gebruiken we:

- Koppeling: `bank_connect_started`, `bank_connected`, `bank_connect_failed`.
- Sorteren en tijd per kaart: `swipe` (met `duration_ms`), `skip`, `undo`, `swipe_session_complete`.
- Actieve dagen: dagen met minstens één `swipe`.
- Meldingen: `push_sent` en `push_opened`, per tag.
- PWA en push op iOS: `push_permission` plus een vraag in het interview.
- Splitfunctie: `swipe` met `split_persons`, en `share_settled`.
- Herkoppeling: `bank_connect_started` met `reconnect: true` en `bank_reconnect`.
- Afhakers na verwijderen: `churn_log` (zonder user_id).

Nog te loggen of uit te rekenen vóór de start:

- Grootte van de backlog bij elke sessiestart en of de sessie is afgebroken. `app_open` heeft nu alleen een bucket (`0`, `1-5`, `6-20`, `20+`). Voor de drempel "backlog >20" volstaat die bucket. Een afgebroken sessie is een sessie met `20+` bij openen zonder `swipe_session_complete` die dag.
- Verschil tussen boekdatum en importmoment (`booking_date` tegenover `created_at` van de transactie). Dit rekenen we geaggregeerd uit, zonder inhoud.
- Nepdeur voor betalen: een knop "Bankkoppeling houden voor €3,99 per maand" die niets afrekent en alleen telt wie tikt. Nog niet gebouwd. Zonder nepdeur meten we alleen de vraag.

## 9. Sean Ellis-vraag

Stel deze vraag op dag 28-30, aan iedereen die minstens één keer gesorteerd heeft. Telt alleen mee bij n≥15.

> Hoe zou je je voelen als je [Appnaam] vanaf morgen niet meer kon gebruiken?
>
> - Zeer teleurgesteld
> - Een beetje teleurgesteld
> - Niet teleurgesteld (ik heb er niet veel aan)
> - Niet van toepassing, ik gebruik [Appnaam] niet meer

Vervolgvragen (open):

1. Wat is voor jou het belangrijkste voordeel van [Appnaam]?
2. Wat zou je gebruiken als [Appnaam] er niet meer was?
3. Wat moeten we verbeteren?

## 10. Vraag over betalen

Stel deze vraag op dag 28-30, na de Sean Ellis-vraag.

> Stel dat de bankkoppeling na de pilot € 3,99 per maand kost. Sorteren met de hand blijft gratis. Wat doe je dan?
>
> - Ik betaal € 3,99 per maand
> - Ik betaal liever € 29,99 per jaar
> - Ik zou het voor minder doen, namelijk: € …
> - Ik betaal niet

"Bereid te betalen" telt als een van de eerste twee antwoorden. Als de nepdeur er is, rapporteren we beide cijfers apart.

## 11. Interviewgids

Kort, open vragen, niet sturen. Vraag naar wat iemand deed, niet wat iemand vindt dat hij zou doen. Geen bedragen of winkelnamen noteren.

**Dag 2-3 (eerste indruk)**

1. Vertel eens hoe het koppelen van je bank ging.
2. Wanneer heb je de app geopend? Waarom toen?
3. Laat eens zien hoe je een paar kaartjes indeelt. (Kijk mee, zeg niets.)
4. Twijfelde je ergens over welk potje? Wat deed je toen?
5. Wat verraste je?
6. Wat gebruik je nu nog meer om je geld bij te houden?

**Eind week 1 (ritme)**

1. Op welke dagen heb je ingedeeld? Wat ging er goed, wat niet?
2. Hoe voelde het als er veel kaartjes lagen?
3. Wat doet de melding van 20:00 met je?
4. Heb je geld voorgeschoten deze week? Hoe hield je dat bij?
5. Weet je nu iets over je geld dat je vorige week niet wist? Wat?
6. Als je één ding mocht veranderen, wat zou het zijn?

**Exitgesprek (elke afhaker)**

1. Wanneer merkte je dat je de app niet meer opende?
2. Wat gebeurde er rond die tijd?
3. Wat had je terug laten komen?
4. Wat gebruik je nu in plaats van de app?
5. Mogen we je over een paar maanden nog eens benaderen?

**Na elk gesprek** noteert Stein binnen een uur: drie citaten, één ding dat het kernconcept steunt, één ding dat het ondermijnt, en wat de tester in plaats van de app gebruikt.

## 12. Weekchecklist

**Week 0 (voorbereiding)**

- [ ] Contract Enable Banking getekend en rol schriftelijk bevestigd. Zo niet: alleen eigen rekeningen.
- [ ] KvK, testersvoorwaarden, verwerkersovereenkomsten, DPIA en datalekprocedure klaar.
- [ ] Uitnodigingscodes aangemaakt op `/admin`.
- [ ] Ontbrekende metingen uit hoofdstuk 8 gebouwd of bewust geschrapt.
- [ ] Dit plan gedateerd en niet meer gewijzigd.

**Elke week**

- [ ] Op `/admin`: koppelingen, actieve dagen, tijd per kaart, Later en undo, meldingen.
- [ ] Afhakers van deze week gebeld of gemaild voor een exitgesprek.
- [ ] Mislukte koppelingen en syncfouten (`bank_connect_failed`, `sync_failed`) bekeken.
- [ ] Geen transactie-inhoud in logs van Vercel of Supabase (steekproef).
- [ ] Notities van gesprekken bijgewerkt.

**Week 1**

- [ ] 5-8 interviews op dag 2-3.
- [ ] 5-8 interviews aan het eind van week 1.
- [ ] Koppelpercentage en "≥80% gesorteerd binnen 7 dagen" genoteerd.

**Week 2-3**

- [ ] Gesimuleerde herkoppeling gestart bij ongeveer de helft van de testers.
- [ ] Actief in week 2 genoteerd.
- [ ] Afgebroken sessies bij een backlog van >20 kaarten genoteerd.

**Week 4 (dag 28-30)**

- [ ] Sean Ellis-vraag en betaalvraag verstuurd.
- [ ] Actief in week 4 genoteerd, met de vorm van de curve.
- [ ] Alle metrics met 95%-interval in de tabel gezet.
- [ ] Beslisregels toegepast. Uitkomst en reden vastgelegd in `docs/beslissingen.md`.

## 13. Adminpagina

De adminpagina (`/admin`) krijgt een sectie **Go/no-go**. Die toont per metric uit de tabel de puntschatting, "x van n", het 95%-interval en de kleur volgens de beslisregels. Metrics die uit interviews komen (Sean Ellis, betaalbereidheid, PWA op iOS) vult Stein met de hand in of ze staan als "uit interviews". Tot die sectie er is, rekent Stein de tabel uit met de bestaande cijfers op `/admin`.
