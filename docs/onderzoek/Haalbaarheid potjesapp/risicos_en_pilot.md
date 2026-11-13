# Productrisico's en pilotontwerp (go/no-go) voor de potjesapp

Scope: een pilot van 1-4 weken met ongeveer 10-50 jonge Nederlandse testers (18-30) van een app met PSD2-bankkoppeling, handmatig sorteren met één tik in potjes (geen auto-categorisatie), kosten splitsen, ringdiagram per maand, budgetten, een streak en een push om 20:00.
Labels: **[Evidence]** = gepubliceerde data of studie. **[Heuristic]** = vuistregel van praktijkmensen of leveranciers. **[Inference]** = mijn eigen afleiding. Onderzocht op 2026-10-09; de meeste bronnen zijn van 2010-2024.

## 1. Welke vroege signalen voorspellen retentie (activatie, aha-moment, D1/D7/D30, DAU/MAU, Sean Ellis 40%, NPS)?

### Takeaway
Er bestaan geen betrouwbare, openbare D1/D7/D30-benchmarks specifiek voor budget-apps. De beschikbare cijfers zijn mobiele gemiddelden over app-installs: D1 ~20-30%, D7 ~8-15%, D30 ~3-6%. Die passen slecht bij een pilot met uitgenodigde, gemotiveerde testers, dus de lat moet daar veel hoger liggen. De bruikbaarste instrumenten voor een pilot met weinig deelnemers zijn: het vlakker worden van de retentiecurve, DAU/MAU of dagen-actief-per-week (≥20% geldt als "goed") en de Sean Ellis-vraag (≥40% "zeer teleurgesteld"). Bij zo'n kleine groep zijn het richtingwijzers, geen bewijs.

### Cited Findings
- **[Evidence, één datapunt]** De oprichter van een budget-app vergeleek zijn eigen app met "finance"-gemiddelden uit de sector. Sector: D1 22,7%, D7 10-15%, D30 5,8%. Eigen app: D1 19,9%, D7 7,8%, D30 4,1%. Volgens de auteur trekken bank-apps het sectorgemiddelde omhoog (Q2 2025). — [The Budgeting App, The Quarterly Q2 2025](https://thebudgetingapp.substack.com/p/the-quarterly-q2-2025)
- **[Heuristic]** PostHog noemt als doel voor mobiele apps D1 26-30% en D7 10-15%. Voor DAU/MAU geldt 20% als "goed" en >25% als "geweldig". MetaMask (crypto-wallet) zat in februari 2022 op ~25% DAU/MAU. — [PostHog, mobile app metrics](https://posthog.com/product-engineers/mobile-app-metrics-kpis); [PostHog DAU/MAU tutorial](https://posthog.com/tutorials/dau-mau-ratio)
- **[Heuristic]** Volgens een analyse ligt de gemiddelde DAU/MAU van SaaS hoger dan die van e-commerce, finance en media, en geldt de 25%-benchmark vooral voor consumenten- en social apps. — [MetricStack, DAU/MAU](https://metricstack.substack.com/p/eleventh-edition)
- **[Evidence, oud, alle categorieën]** Na 30 dagen gebruikte nog maar 3,3% (Android) en 3,2% (iOS) van de gebruikers de app actief (gegevens 2016-2018). — [eMarketer chart](https://www.emarketer.com/chart/229141/mobile-app-performance-metrics-worldwide-1-day-7-day-30-day-retention-rates-2016-2018); [Retail Dive](https://retaildive.com/news/report-app-usage-sinks-after-initial-installation/407551)
- **[Evidence, leverancier]** CleverTap Fintech Benchmark Report (2023): maar 1 op de 5 mensen die een fintech-app installeren, registreert zich in de eerste week. — [CleverTap via ACN Newswire, 27 feb 2023](https://markets.financialcontent.com/pennwell.cabling/article/acnnewswire-2023-2-27-clevertaps-fintech-benchmark-report-only-1-in-5-users-that-install-fintech-apps-sign-up-within-week-one)
- **[Heuristic, enquête onder ~20 growth-experts]** Lenny Rachitsky en Casey Winters, retentie van gebruikers na **6 maanden**: consumer social GOED ~25% / GEWELDIG ~45%; consumer transactional 30% / 50%; consumer SaaS 40% / 70%. Volgens samenvattingen gaat het om het niveau waarop de curve vlak wordt. — [Lenny's Newsletter, "What is good retention" (issue 29, 2020)](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29); [samenvatting](https://uretimbandi.substack.com/p/retention-hedef-koyma-benchmarking)
- **[Heuristic]** De Sean Ellis-test vraagt: "Hoe zou je je voelen als je het product niet meer kon gebruiken?" Bij ≥40% "zeer teleurgesteld" is er een signaal van product-market fit. Ellis kwam op die drempel door ~100 startups te vergelijken. Hij noemt de drempel zelf niet hard: 39% betekent niet dat er geen PMF is. Ondervraag alleen mensen die het kernproduct minstens twee keer en recent hebben gebruikt. — [Wikipedia, Product-market fit](https://en.wikipedia.org/wiki/Product-market_fit); [samenvatting](https://productlessonsravi.substack.com/p/when-do-you-know-if-your-product)
- **[Evidence, casus]** Superhuman scoorde in de eerste meting (begin 2017) 22% zeer teleurgesteld, 52% enigszins teleurgesteld en 26% niet teleurgesteld. Door te segmenteren vond het team een subgroep met een veel hogere score. — [Superhuman/Vohra samenvatting](https://pshimanshu.substack.com/p/heres-what-i-learned-about-product); [TechCrunch](https://techcrunch.com/?p=2176911)
- **[Evidence]** Over NPS: Bain/NPS Prism (december 2024, 22 landen) vindt dat digitale uitdagers duidelijk beter scoren dan traditionele banken. In de openbare samenvatting staan geen absolute NPS-cijfers voor fintech-apps. — [Business Wire, NPS Prism 2024](https://www.businesswire.com/news/home/20241217364098/en/NPS-Prism-by-Bain-Company-Launches-2024-Global-Banking-Benchmarks-Report-Unveiling-Top-Performers-in-Customer-Loyalty-Across-22-Countries)
- **[Evidence]** Over gewoontevorming (Lally, van Jaarsveld, Potts & Wardle, 2010, *EJSP* 40:998-1009): het duurde gemiddeld **66 dagen** (bereik 18-254) voordat de zelf gerapporteerde automatisme een plateau bereikte. Simpele gedragingen werden sneller automatisch. Missen van één dag had geen wezenlijke invloed op het proces. Een vervolgstudie (Keller, Lally e.a., 2021) vond een mediaan van 59 dagen. — [UCL news 2009](https://www.ucl.ac.uk/news/2009/aug/how-long-does-it-take-form-habit); [UCL BSH blog](https://blogs.ucl.ac.uk/bsh/2012/06/29/busting-the-21-days-habit-formation-myth/.); [Wikipedia, Habit](https://en.wikipedia.org/wiki/Habit). Let op: dat één gemiste dag geen effect had, komt uit mijn achtergrondkennis van het artikel. Ik heb het in deze sessie niet in de opgehaalde bronnen teruggezien.

### Inferences
- **[Inference]** Een pilot van 1-4 weken kan geen gewoonte meten, want die vormt zich gemiddeld in ~66 dagen. Hij kan wel meten of het gedrag de juiste kant op gaat: wordt de sorteertijd per sessie korter, hoe vaak opent iemand de app via de push en hoe vaak zelf, en hoe ziet de curve van actieve dagen per week eruit.
- **[Inference]** Uitgenodigde vrienden of studenten scoren altijd ruim boven de cijfers voor publieke installs, omdat er selectie en sociale druk meespeelt. Testers die D7 net boven de ~10-15% van de markt halen, zijn dus een **no-go-signaal**, geen succes. Redelijke pilotlatten: D1 ≥70%, D7 ≥50%, week-2 actief ≥40-50%. Dit zijn heuristieken, er is geen bron voor.
- **[Inference]** Voorgestelde activatiedefinitie: "bank gekoppeld EN ≥1 sorteersessie voltooid (backlog op nul) binnen 48 uur". Als aha-moment ligt voor de hand "het eerste volledig gevulde ringdiagram of het eerste moment dat iemand ziet hoeveel er nog over is in een potje". Valideer dat door te kijken welke vroege acties samengaan met actief zijn in week 2.
- **[Inference]** Bij n<30 zegt NPS weinig, want één persoon verschuift de score met 3-10 punten. Gebruik de Sean Ellis-vraag plus een open vraag ("wat is het belangrijkste voordeel?") en segmenteer zoals Superhuman.

### Gaps
- Ik vond geen openbare, sectorspecifieke D30/D90-retentie voor budget-apps zoals YNAB, Monzo pots of Dutch apps als Dyme of Grassfeld. Het eMarketer-overzicht "finance app 30-day retention by region 2023" zit achter een betaalmuur.
- Ik vond geen openbare DAU/MAU- of NPS-cijfers voor afzonderlijke fintech-apps in de EU of Nederland.

## 2. Specifieke risico's van dit concept

### Takeaway
De grootste risico's waar ik bewijs voor vond, zijn **PSD2-herauthenticatie** (toegang moet nu om de 180 dagen worden verlengd; een verlopen toestemming veroorzaakt meetbaar uitval en churn) en **vertrouwen** (maar ~30% van de Europeanen deelt bankdata met een gerust gevoel, en een aanzienlijke groep deelt alleen met de eigen bank). Sorteermoeheid en angst voor een achterstand zijn zeer plausibel, maar ik vond er geen gepubliceerde cijfers over. Die moet de pilot zelf meten.

### Cited Findings
- **[Evidence]** Op 5 april 2022 publiceerde de EBA haar eindrapport. Daarin wordt de termijn voor SCA-verlenging bij rekeninginformatie verlengd van **90 naar 180 dagen**, en komt er een **verplichte** uitzondering: de bank mag geen SCA eisen wanneer een AISP namens de klant toegang krijgt, "mits aan bepaalde voorwaarden is voldaan". De regels gaan 7 maanden na publicatie in het Publicatieblad gelden. — [EBA press release, 5 april 2022](https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-final-report-amendment-its-technical-standards); [EBA consultation EBA/CP/2021/32](https://www.eba.europa.eu/calendar/consultation-amending-rts-sca-and-csc-under-psd2)
  - Belangrijke nuance: de verplichte uitzondering geldt alleen als de AISP zelf de klant om de 180 dagen opnieuw authenticeert. De eindgebruiker moet dus nog steeds periodiek opnieuw toestemming geven. Dat staat in de reacties op de consultatie: "180 dagen moeten verstrijken voordat SCA kan worden afgedwongen". — [EBA consultation responses](https://www.eba.europa.eu/eba-response/29261)
  - Barclays wees op een overgangsperiode waarin tokens van 90 en van 180 dagen naast elkaar bestaan. — [EBA responses](https://www.eba.europa.eu/eba-response/29261)
- **[Evidence, belanghebbende partij]** Intuit (reactie op de EBA-consultatie): bij banken die elke 24 uur nieuwe toestemming eisen, staan dagelijks **18-20%** van de credentials in een foutstatus. Bij banken met een termijn van 90 dagen is dat **8-13%**. Het verschil van 5-12 punten komt volgens Intuit alleen door verlopen toestemming. — [EBA response](https://www.eba.europa.eu/eba-response/29247) (via zoekresultaten; [overige reacties](https://www.eba.europa.eu/eba-response/29270), [29191](https://www.eba.europa.eu/eba-response/29191), [29196](https://www.eba.europa.eu/eba-response/29196))
- **[Evidence, secundair]** Een respondent citeerde de Britse FCA: de eis om opnieuw te authenticeren veroorzaakt "significant churn", ook bij klanten die tevreden zijn. Accountants melden dat ze klanten achter de broek moeten zitten om opnieuw te authenticeren. Het VK heeft de verplichte herauthenticatie elke 90 dagen inmiddels afgeschaft. — [EBA consultation responses (zoekresultaten)](https://www.eba.europa.eu/eba-response/29247); [eMarketer, consent handling](https://www.emarketer.com/content/open-banking-consent-handling-allay-consumers-security-worries)
- **[Evidence, 2020]** Volgens een ING-enquête in Europa voelt gemiddeld maar ~30% zich op zijn gemak bij het delen van bankdata, zelfs met toestemming. — [eMarketer](https://www.emarketer.com/content/open-banking-consent-handling-allay-consumers-security-worries)
- **[Evidence, 2021]** Volgens Capgemini/Efma wil 86% data delen, maar 36% van hen alleen met de eigen bank en niet met derden. — [eMarketer](https://www.emarketer.com/content/consumers-superior-trust-banks-pivotal-role-us-open-banking)
- **[Evidence, VS]** Maar 14% van de Amerikaanse consumenten vertrouwt fintechs om veilig met hun bankrekening te koppelen (rapport gelinkt aan Mastercard). — [eMarketer](https://www.emarketer.com/content/fintechs-have-ground-make-up-court-of-public-opinion)
- **[Evidence, academisch]** Een Franse studie onder 556 digital-native vrouwen: de meeste consumenten willen niet dat bedrijven die niets met hun bank te maken hebben, hun data kunnen inzien. — [IDEAS/HAL hal-04114940](https://ideas.repec.org/p/hal/journl/hal-04114940.html)
- **[Evidence, 2024]** iOS-PWA en push: sinds iOS 16.4 (2023) ondersteunen webapps op het beginscherm web push en badges. In de bèta van iOS 17.4 schrapte Apple de beginscherm-webapps in de EU vanwege de DMA (februari 2024), maar draaide dat begin maart 2024 terug. Webapps draaien sindsdien op WebKit. — [The Register, 16 feb 2024](https://www.theregister.com/2024/02/16/apple_web_apps/); [The Register, 2 mrt 2024](https://www.theregister.com/2024/03/02/apple_reverses_pwa_decision/); [TechCrunch](https://techcrunch.com/?p=2673309)
- **[Evidence]** Bank-apps als concurrent: de app van ABN AMRO toont transacties en saldo en kan rekeningen bij andere banken tonen. ING (België) adverteert met tools om uitgaven te volgen. Nederlandse apps van derden zoals Grassfeld en ROOV categoriseren automatisch en bieden budgetten. — [App Store, ABN AMRO](https://apps.apple.com/nl/app/abn-amro-creditcard/id557886337); [App Store, ING Banking](https://apps.apple.com/app/ing-banking/id1364967778); [App Store, ROOV](https://apps.apple.com/us/app/id1397413918)

### Inferences
- **[Inference]** Een pilot van 1-4 weken raakt de grens van 90 of 180 dagen niet, dus het **echte uitvalrisico bij herauthenticatie blijft buiten beeld**. Simuleer het daarom: laat een deel van de testers in week 2-3 bewust "opnieuw koppelen" doen en meet hoeveel dat afmaken en hoe lang het duurt. Ook kan een deel van de toestemming expres kort worden ingesteld, als de aggregator (bijvoorbeeld Enable Banking) dat toelaat.
- **[Inference]** Bij iOS-PWA-push moet de app eerst aan het beginscherm zijn toegevoegd. Dat is een extra stap in de trechter die apart gemeten moet worden: % iOS-testers met de app op het beginscherm → % met push aan → % opens via de push van 20:00. De push is de belangrijkste trigger van de dagelijkse lus, dus als deze trechter lekt, faalt de gewoontelus op iOS. Ik vond geen data over de afleverbetrouwbaarheid van iOS-webpush.
- **[Inference]** Sorteermoeheid: een actieve twintiger heeft al snel 3-8 transacties per dag (geen bron). Bij ~3 seconden per kaart is dat minder dan 30 seconden per dag, dus waarschijnlijk geen probleem. Na 5 dagen weg zijn het 15-40 kaarten. Dat is het moment waarop iemand zich schuldig voelt en de app gaat vermijden. Meet daarom het **afbreekpercentage als functie van de backloggrootte bij het openen van een sessie**.
- **[Inference]** Vertragingen in transactiedata: bij PSD2-AIS komen transacties vaak pas binnen na de bijwerking van de bank of als "pending". Als een kaart pas de volgende dag verschijnt, sluit de push om 20:00 slecht aan bij een betaling die net is gedaan. Log daarom de tijd tussen boekdatum en importmoment.

### Gaps
- Ik vond geen gepubliceerd percentage gebruikers dat afhaakt bij een 90- of 180-dagen-herauthenticatie. De FCA-analyse CP21/3 kan cijfers bevatten, maar die heb ik niet opgehaald.
- Ik vond geen Nederlandse enquête over vertrouwen in het delen van bankdata met apps van derden. DNB, AFM of Nibud zijn kandidaat-bronnen.
- Ik vond geen data over "backlog-angst" of sorteermoeheid in handmatige budget-apps.
- Ik heb de huidige inzichtfuncties van de Nederlandse apps van ING, Rabobank en bunq niet kunnen bevestigen.
- Ik heb de vindplaats van de wijzigings-RTS in het Publicatieblad en de exacte ingangsdatum niet bevestigd. Uit mijn geheugen: Gedelegeerde Verordening (EU) 2022/2360, van toepassing vanaf 25 juli 2023. Controleer dit op EUR-Lex.

## 3. Hoe vergelijkbare producten backlog-moeheid beperken zonder auto-categorisatie

### Takeaway
YNAB werkt met een "unapproved"-wachtrij en een goedkeuringsstap. Daarnaast vult de app een categorie voor uit op basis van eerdere categorieën per begunstigde (payee) en zijn er hernoemregels voor payees. Dat suggereert een categorie, maar beslist niet zelf, en is dus een tussenvorm die past bij "één tik". Ik kon de huidige officiële documentatie van YNAB in deze sessie niet ophalen. De bewijsbasis bestaat uit oude forumposts en tools van derden.

### Cited Findings
- **[Evidence, derde partij, 2018]** Geïmporteerde transacties komen als "unapproved / not cleared" binnen. De gebruiker wijst transacties af die hij al handmatig had ingevoerd en keurt de rest goed. — [ynab-bank-importer FAQ](https://github.com/gitviola/ynab-bank-importer/wiki/faq)
- **[Evidence, YNAB-forum, 2014-2015]** Een ontwikkelaar van YNAB raadt "payee rename rules" aan om payees leesbaar te maken. Auto-categorisatie per payee werkt alleen voor nieuwe imports, niet met terugwerkende kracht. — [Steam/YNAB forum](https://steamcommunity.com/app/227320/discussions/0/846959998014529133); [Steam/YNAB forum 2](https://steamcommunity.com/app/227320/discussions/0/604941528486792613/?l=dutch)
- **[Evidence, derde partij]** De tool "Fintech to YNAB" vult de categorie automatisch in op basis van eerdere transacties. — [Docker Hub, fintech-to-ynab](https://hub.docker.com/r/fintechtoynab/fintech-to-ynab)

### Inferences
- **[Inference]** Patronen die passen binnen "geen auto-categorisatie, wel één tik":
  1. **Voorgestelde knop** (het potje van de vorige transactie bij dezelfde tegenpartij wordt gemarkeerd, maar de gebruiker tikt zelf). Dit lijkt op de payee-memory van YNAB.
  2. **Bulkactie per tegenpartij**: "Alle 6 kaarten van Albert Heijn → Boodschappen?"
  3. **Opt-in regel na herhaling**: na 3 keer dezelfde keuze vraagt de app "Altijd zo doen?". Dit is technisch auto-categorisatie, maar de gebruiker stelt het zelf in.
  4. **Backlog-cap / "Later"-bak**: kaarten ouder dan X dagen in één keer naar "Overig/Later", zodat de wachtrij altijd te overzien is.
  5. **Streak die een gemiste dag vergeeft** (bijvoorbeeld een streak-freeze), aansluitend op Lally et al.: één gemiste dag schaadt de gewoontevorming niet wezenlijk.
- **[Inference]** Test in de pilot of testers een kaart met een voorgestelde knop sneller sorteren (mediaan seconden per kaart) dan een kaart zonder voorstel, en of ze het voorstel blind overnemen. Dat zegt iets over de vraag of het idee van "bewust sorteren" overeind blijft.

### Gaps
- De huidige help-artikelen van YNAB over "Approve", "Approve all" en payee-memory heb ik niet opgehaald (de URL gaf een 404). Ik heb dus niet kunnen bevestigen of YNAB op dit moment een knop "alles goedkeuren" heeft.
- Ik vond geen gepubliceerde casestudy die meet hoeveel bulkacties of voorgestelde categorieën de churn bij handmatige budget-apps verminderen.

## 4. Aanbevolen pilotontwerp: steekproef, interviews, events, beslisdrempels en interpretatie bij kleine n

### Takeaway
Met 10-50 testers kun je **grote effecten en duidelijke problemen** zien. Kleine verschillen zie je niet. Ontwerp de pilot daarom als een kwalitatieve studie met harde gedragslogging. Kies vooraf drempels met een "rode zone" (no-go), een "grijze zone" (aanpassen en herhalen) en een "groene zone" (go). Rapporteer elk percentage met een betrouwbaarheidsinterval, en gebruik testrondes van 5-8 interviews per iteratie.

### Cited Findings
- **[Heuristic, omstreden]** Nielsen: ~5 gebruikers vinden gemiddeld ~85% van de usabilityproblemen. In simulaties loopt dat sterk uiteen: één groep van 5 vond maar 55%. Spool & Schroeder (2001) vonden met de eerste 5 testers maar 35%. Krug raadt 3-4 testers per ronde aan, in meerdere rondes. — [UX Psychology](https://uxpsychology.substack.com/p/how-many-participants-do-you-need); [Wikipedia, Think aloud protocol](https://en.wikipedia.org/wiki/Think_aloud_protocol); [CORE, "Why and when five test users aren't enough"](https://core.ac.uk/works/16907959)
- **[Heuristic]** Sean Ellis: stel de PMF-vraag alleen aan mensen die het kernproduct minstens twee keer en recent hebben gebruikt. — [Wikipedia, Product-market fit](https://en.wikipedia.org/wiki/Product-market_fit)
- **[Evidence]** Lally et al. 2010: het automatisme stijgt eerst snel en vlakt dan af, met een gemiddeld plateau rond 66 dagen. — [UCL BSH blog](https://blogs.ucl.ac.uk/bsh/2012/06/29/busting-the-21-days-habit-formation-myth/.)

### Inferences
**Steekproef en statistiek [Inference, standaardstatistiek]**
- 95%-Wilson-interval bij n=20: een gemeten 50% betekent ~30-70%; 80% betekent ~58-92%. Bij n=40 en 50% is het ~35-65%. Conclusie: met 20 testers kun je 80% wel onderscheiden van 40%, maar 60% niet van 70%.
- "Rule of three": als 0 van n testers iets doen, is de bovengrens van het 95%-interval ≈ 3/n. Bij n=20 is dat ≤15%. Daarmee kun je bijvoorbeeld zeggen "de split-feature wordt door <15% gebruikt".
- Werk op n≥20 actieve testers na de koppeling. Reken op 20-40% uitval vóór het koppelen (vertrouwen, bank niet ondersteund). Nodig dus ~30-50 mensen uit.
- Segmenteer naar bank, OS (iOS-PWA vs. Android) en student/werkend. Rapporteer per segment alleen als n≥8.

**Kwalitatief [Inference]**
- Interview 5-8 mensen op dag 2-3 (onboarding, koppelen, vertrouwen), 5-8 aan het eind van week 1 (sorteerervaring, backlog) en alle afhakers via een exitinterview van 10 minuten of een korte vragenlijst. Gebruik een dagboek of een micro-enquête in de app ("Hoe voelde het sorteren vandaag?", 1-5).
- Stel aan het eind de Sean Ellis-vraag, de open vraag "belangrijkste voordeel", de vraag "wat gebruik je nu in plaats hiervan?" (bank-app, Excel, Tikkie) en de vraag "zou je bij de bank opnieuw toestemming geven om door te gaan?".

**Te loggen events [Inference]**
- Trechter: `invite_opened`, `signup_completed`, `onboarding_pots_set`, `bank_connect_started`, `bank_connect_redirect_returned`, `bank_connect_succeeded/failed(reason, bank)`, `first_sync_completed(n_tx)`.
- Sorteren: `sort_session_started(backlog_size, source=push|organic)`, `card_shown`, `card_sorted(pot_id, ms_since_shown, suggestion_shown?, suggestion_accepted?)`, `card_deferred(later)`, `card_undo`, `sort_session_ended(sorted, remaining, abandoned?)`.
- Feature-gebruik: `split_created`, `debt_settled`, `budget_set`, `goal_set`, `overview_viewed`, `ring_chart_tapped`.
- Gewoonte: `push_permission_granted`, `pwa_installed (display-mode standalone)`, `push_sent`, `push_opened`, `streak_incremented/broken`, `app_open(source)`.
- Datakwaliteit: `tx_imported(booking_date, import_ts)` voor vertraging, `consent_expiry_banner_shown`, `reconnect_started/succeeded`.

**Beslisdrempels: voorstel [Heuristic/Inference, niet uit bronnen]**
| Metric | Go (groen) | Grijs (aanpassen) | No-go (rood) |
|---|---|---|---|
| % uitgenodigden met succesvolle bankkoppeling | ≥70% | 50-70% | <50% |
| % gekoppelde testers dat binnen 7 dagen ≥80% van de kaarten sorteert | ≥60% | 40-60% | <40% |
| Mediaan seconden per kaart (na de eerste sessie) | ≤3 s | 3-6 s | >6 s |
| Afbreekpercentage van sessies bij een backlog >20 kaarten | <30% | 30-50% | >50% |
| Actief in week 2 (≥3 dagen met een sorteeractie) | ≥50% | 30-50% | <30% |
| DAU/WAU of actieve dagen per week (mediaan) | ≥4 dagen | 2-4 dagen | <2 dagen |
| Opens via de push van 20:00 / pushes verstuurd | ≥25% | 10-25% | <10% |
| % iOS-testers met PWA geïnstalleerd en push aan | ≥70% | 40-70% | <40% |
| Sean Ellis "zeer teleurgesteld" (bij n≥15 respondenten) | ≥40% | 25-40% | <25% |
| % testers dat de split-feature ≥1× gebruikt | ≥30% (kernfeature) | 10-30% | <10% (feature heroverwegen, geen no-go voor het concept) |
| % dat een gesimuleerde herkoppeling afmaakt | ≥80% | 60-80% | <60% |

- **Interpretatieregels [Inference]**:
  1. Een metric telt pas als "rood" wanneer de bovengrens van het interval onder de drempel ligt. Een "groen" moet minstens het punt-schatting boven de drempel hebben **en** de interviews moeten het bevestigen.
  2. Weeg de curve zwaarder dan een losse momentopname: wordt het aantal actieve dagen per week vlak (goed) of daalt het lineair (slecht)? Lenny: retentie is "goed" waar de curve vlak wordt.
  3. Corrigeer voor nieuwigheid en sociale wenselijkheid: testers uit de eigen kring overschatten zowel Ellis- als NPS-scores.
  4. Bepaal vooraf het kernconcept dat moet slagen: "dagelijks of bijna dagelijks sorteren voelt licht en geeft inzicht". Als dat rood is, is het een no-go, ook al zijn de nevenfeatures groen.
  5. Een pilot van 1-2 weken meet alleen activatie en de vroege curve. Voor een go/no-go op retentie is ≥4 weken nodig, met een check rond dag 28-30.

### Gaps
- Voor de drempels in de tabel is geen bron. Ze zijn afgeleid van de algemene heuristieken hierboven en de mate van precisie die bij kleine n haalbaar is.
- Ik vond geen gepubliceerde pilot-go/no-go-kaders voor fintech-apps in de EU.
- Ik vond geen benchmark voor "seconden per transactie" bij handmatig categoriseren.
