# Productbeslissingen

Keuzes van Stein die afwijken van of een aanvulling zijn op de spec. Bijgewerkt: 8 oktober 2026.
Deze lijst is leidend boven de spec waar ze elkaar tegenspreken.

## Uitgangspunten

- **Referenties:** Voorgeschoten, Mollie en de ING-app. Stein houdt van overzicht; "loze getallen",
  zo veel mogelijk data in iemands gezicht en onnodige dingen op het scherm zijn fout. Elk getal
  dat we tonen moet een beslissing van de gebruiker helpen.

- **Uitstraling:** rustig en minimaal. Veel witruimte, kleur alleen voor de hoofdactie en de potjes.
- **Toon:** speels met een knipoog. Je-vorm, kort, af en toe een compliment. Ook in meldingen.
- **Beweging:** iets meer beleving dan het minimum (kaart glijdt weg, tegel veert op, klein
  feestmoment), altijd met respect voor `prefers-reduced-motion`.
- **Potjes:** lijniconen (lucide-react) in de potjeskleur op een zacht kleurvlak. Geen emoji.
- **Thema:** volgt het systeem, met schakelaar (systeem, licht, donker) in het profiel.
- **Naam van de hoofdactie** ("Swipen") krijgt later een eigen naam die bij de appnaam past:
  `ACTION_LABEL` en `ACTION_VERB` in `config/app.ts`.
- **Alleen bankkoppeling.** CSV-import vervalt volledig.

## Hoofdscherm (fase 2): tikken, niet vegen

- Kaart **bovenin**, reageert niet op slepen of vegen. Daaronder alle potjes als knoppen.
- **Knoppen:** gelijke tegels, drie per rij, icoon boven de naam, sterk afgeronde hoeken.
  Allemaal zichtbaar, geen scrollen, vaste volgorde van de gebruiker. Niets voorgeselecteerd.
- Op elke tegel staat klein het **bedrag van deze periode**.
- **'+'-tegel** tussen de potjes om ter plekke een nieuw potje te maken (opent de potje-editor).
- **Later** legt de kaart achteraan de stapel (zelfde ronde). **Ongedaan maken** 4 seconden;
  daarna verplaats je via de detailpagina van het potje.
- **Stapelvolgorde:** oudste eerst; eerder op Later gezette kaarten achteraan.
- Swipe-richtingen (`categories.swipe_direction`) worden niet gebruikt; de kolom blijft leeg.

### De kaart

- **Datum groot** ("Donderdag 8 oktober"). **Tijd** erbij als die uit de banktekst te halen is
  (ING en ABN AMRO zetten die bij pinbetalingen in de omschrijving); anders niets. Enable Banking
  levert zelf alleen datums (`booking_date`, `value_date`, `transaction_date`).
- **Tegenpartij groot**, opgeschoond: hoofdletters normaliseren, filiaalnummers en codes als
  `CCV*`, `BEA` weg, **plaatsnaam behouden**. Ruwe tekst blijft beschikbaar.
- **Bedrag** eronder: uitgaven **neutraal zwart**, inkomend geld **groen**.
- **Omschrijving** opgeschoond (pasvolgnummers, datums, codes weg); tik op de kaart voor de
  volledige banktekst.
- **Saldo na deze transactie** op de kaart, als de bank `balance_after_transaction` meestuurt.

### Geld terugkrijgen (nieuw, kern van de app)

- Op de kaart, **vóór** je een potje kiest, een schakelaar **"Ik krijg een deel terug"**.
- Aangezet: kies **met hoeveel personen** je was (jij + 1, 2, 3 ...). Gelijk delen: **jouw deel
  gaat naar het gekozen potje**, de rest naar het ingebouwde potje **Voorgeschoten**.
- **Namen zijn optioneel** (met suggesties uit eerdere namen).
- Keuze per transactie: **"via mijn rekening"** (deel komt open te staan in Voorgeschoten) of
  **"anders" (WieBetaaltWat, contant)**: dat deel telt niet als uitgave en is direct afgehandeld.
- **Voorgeschoten** is een vast, ingebouwd potje dat niet meetelt als uitgave, met een lijst van
  openstaande delen. Op het overzicht: "Nog € 36 te krijgen".
- **Terugbetaling verwerken, beide wegen:** komt er een Tikkie binnen, dan kies je Terugbetaling en
  tik je aan **welk deel van welke persoon** daarmee betaald is (geen bedragen matchen, geen
  afrondmarge). Betaalt iemand buiten de bank om, dan vink je het deel af in Voorgeschoten.
- De app helpt **niet** met terugvragen (geen deelknop, geen koppeling); alleen bijhouden.

### Eerste keer

- Na het koppelen van de bank: **begeleide eerste drie kaarten** (kaart, knoppen, Later,
  Ongedaan maken), daarna nooit meer.

## Overzicht (fase 4)

- Bovenaan: **wat er nog te doen is**, met de hoofdknop. Daaronder de cijfers.
- **Periode loopt vanaf de salarisdag**, die de gebruiker zelf instelt (onboarding en
  instellingen). Valt de dag in het weekend, dan de werkdag ervoor.
- **Vergelijking met het gemiddelde van de laatste drie maanden.** Zolang er minder data is:
  gemiddelde van wat er is, met uitleg ("op basis van 1 maand").
- **Historie bij koppelen:** vanaf de laatste salarisdag.
- **Saldo:** rond pictogram rechtsboven; tik opent een paneel met saldo per rekening.
- Top-potjes als **horizontale balken**, geen donut.
- **Streak:** dagelijks. Een dag telt als de stapel aan het eind van de dag leeg is; dagen zonder
  nieuwe kaartjes tellen gewoon door. Getoond als getal met een **vlammetje**, ook op het overzicht.

## Potjes (fase 4)

- Lijst in de vaste volgorde van de gebruiker, met het **bedrag deze periode**.
- **Budget:** overschrijding rustig: balk wordt amber, tekst "over je budget". Geen rood.
- **Detailpagina:** transactie naar ander potje verplaatsen, budget instellen of aanpassen,
  grafiekje per week of maand.

## Jouw maand (vervangt het weekoverzicht)

- Geen weekoverzicht. **"Jouw maand"** verschijnt op de salarisdag, als kaart bovenaan het
  overzicht tot hij bekeken is, plus een melding.
- Inhoud: totaal uitgegeven t.o.v. je gemiddelde, en **per potje** het bedrag naast je gemiddelde
  en de budgetstand.

## Meldingen

- **Elke avond om 20:00** een pushmelding als er kaartjes liggen; geen melding als er niets is.
- Speelse toon ("9 kaartjes wachten op jou. Twee minuten werk.").
- Verlopende bankkoppeling: banner vanaf 7 dagen vooraf én één melding.

## Bankkoppeling (fase 3)

- **Eén bank per gebruiker, alle rekeningen van die bank.**
- **Eigen overboekingen** tussen gekoppelde rekeningen worden herkend en **automatisch
  overgeslagen** (komen niet op de stapel). Dit is de enige automatische beslissing in de app;
  het is ontdubbeling, geen categorisering.
- Historie vanaf de laatste salarisdag; daarna 2x per dag sync plus handmatig verversen.

## Account en toegang

- **Inloggen:** e-mail en wachtwoord, plus **Inloggen met Apple**. Magic link vervalt als
  zichtbare optie (de callback blijft bestaan voor e-mailbevestiging).
- **Pilot gesloten:** registreren alleen met een **uitnodigingscode**.
- **Account verwijderen:** direct en definitief na één bevestiging.
- Taal: alleen Nederlands.

## Praktisch

- **Kleuren:** hoofdblauw `#0075ff` blijft (bewust, ook al is het contrast met witte tekst 4,2:1);
  accent is het Voorgeschoten-amber.
- **Enable Banking:** account met application ID en private key is er; Stein bankiert bij ING,
  dus ING is de eerste testbank.
- **Apple Developer-account** is er, dus Inloggen met Apple kan.
- **Pilot:** start volgende week; eerst moet de app helemaal af zijn.
- Supabase-project mag door Claude worden aangemaakt.

## Gebouwd in fase 5

- Registreren met **uitnodigingscode** (tabel `invite_codes`, beheer op `/admin`); ook bij Apple-login.
- **Inloggen met Apple** naast e-mail en wachtwoord (Supabase Apple-provider nodig).
- **Privacytekst** op `/privacy`, **CSV-export** via `/api/export`, **account verwijderen** direct en
  definitief (service role verwijdert de gebruiker; alles hangt eraan met on delete cascade).
- **Adminpagina** met alleen geaggregeerde cijfers: actieve gebruikers per week, retentie per cohort
  (week 1, 2, 4, 8, 12), gelabeld binnen 7 dagen, tijd per swipe, undo's, bankkoppelingen.
- **PWA**: manifest en iconen (placeholder-potje in het hoofdblauw tot er een logo is).
- Potjes herschikken en gearchiveerde potjes terugzetten op `/potjes/beheren`.
- Meting `app_open` één keer per browsersessie.

## Nog open

- GitHub-toegang voor pushen (Stein installeert de Claude GitHub App).
- Appnaam en de naam van de hoofdactie (Stein denkt na).
- Supabase-project: in de Pro-organisatie (~$10 per maand) of in een nieuwe Free-organisatie.
- Echt logo en app-icoon zodra de naam er is.

## Distributie (8 oktober 2026)

- **Pilot: webapp via Safari, "Zet op beginscherm".** Snelste weg voor Stein en de testers; pushmeldingen werken zo ook op iPhone.
- **Later: App Store.** Stein heeft een Apple Developer-account en wil de app uiteindelijk in de App Store. Plan: een Capacitor-schil om de bestaande webapp (laadt de live versie), met pushmeldingen via Apple's pushdienst in plaats van webpush, eigen appicoon en splash. Bouwen en uploaden naar TestFlight gebeurt op Steins Mac in Xcode.
- **Volgorde:** eerst de appnaam en bundel-id vastleggen, dan de schil als aparte fase. Vercel moet dan naar Pro (Hobby is niet voor commercieel gebruik).

## Navigatie: drie tabbladen (8 oktober 2026)

- **Overzicht, Swipen, Instellingen.** Stein vond het oude overzicht overdreven en wil eenvoud.
- **Overzicht** = je maand: een ring met de uitgaven per potje, daaronder dezelfde potjes als lijst
  (tik voor het potje-detail), één regel tegenover je gemiddelde, en "Nog te krijgen" als er delen openstaan.
  Met pijltjes blader je tot drie maanden terug; dat vervangt de losse Jouw-maand-kaart
  (de melding op salarisdag opent de afgelopen maand).
- **Instellingen** bundelt: je account (naam, salarisdag, data downloaden, account verwijderen),
  potjes beheren, bankkoppeling, meldingen en weergave, over de app met versie, privacy en copyright,
  service en contact, uitloggen.
- Het tabblad Potjes en Profiel vervallen; oude links sturen door.

## Besluiten voor de afwerkronde (8 oktober 2026, avond)

- **Startscherm slim:** liggen er kaartjes, dan opent de app op Swipen; is de stapel leeg, dan op Overzicht.
- **Tegels compact:** 4 per rij, zodat de kaart en alle potjes zonder scrollen op één scherm passen.
- **12 standaardpotjes:** Boodschappen, Eten & drinken, Vervoer, Wonen, Abonnementen, Zorg & verzekeringen,
  Kleding & verzorging, Uitgaan & vrije tijd, Vakantie, Cadeaus & goede doelen, Sparen & beleggen, Inkomen,
  plus Overig en het vaste Voorgeschoten. Studie, Huisdier en Kinderen als snelle suggesties in de potje-editor.
- **Reikwijdte:** afwerken én grotere nieuwe functies, zolang ze het principe versterken (zelf indelen,
  niets automatisch). Doel: mooi, strak, simpel en concurrerend.
- **Terugbetalingen:** blijven via de tegel Terugbetaling (inkomend geld afboeken tegen openstaande delen).

## Integratie golf 2 (8 oktober 2026, nacht)

- **Via de bank of buiten de bank is niet voorgeselecteerd.** Met "Ik krijg een deel terug" aan kies je zelf;
  tik je zonder keuze op een potje, dan vraagt de app eerst die keuze. Het aantal personen begint op 2
  (een teller kan niet leeg zijn). Stein kan terug naar "via de bank" als standaard.
- **Zoeken (F7):** `/transacties` met zoekveld, chips voor maand en potje, en per kaartje de banktekst,
  een notitie en "Naar ander potje". Kaartjes die nog op de stapel liggen verplaats je daar niet;
  die deel je in op Swipen. Gemeten wordt alleen een bucket van het aantal resultaten, nooit de zoekterm.
- **Na de onboarding** gaat de knop op het klaar-scherm naar `/`; het slimme startscherm kiest.
- **Badge op Swipen** ververst als je de stapel verlaat (niet tijdens het swipen, zodat de stapel stil blijft).
- **Meting:** `bank_connect_failed` logt één keer in de bank-callback; handmatig afgevinkte delen loggen
  `share_settled {how: 'manual_check'}`; `month_viewed` blijft `{ months_back }`.


## Afwerkronde, na QA (8 oktober 2026)

Keuzes die het team maakte bij het verwerken van QA en review. Stein kan ze terugdraaien.

- **'Kaartje', niet 'transactie', ook bij zoeken.** De vaste woordenlijst gaat voor de letterlijke tekst in F4:
  de link op Overzicht en de kop van `/transacties` heten "Alle kaartjes". De route blijft `/transacties`.
- **Terugbetaling staat achteraan het raster** (vóór '+'), niet vooraan. Zo staat elk potje altijd op dezelfde
  plek, ook bij inkomend geld. Het blijft een tegel, zoals besloten.
- **Een ontbrekende keuze is geen fout.** "Kies eerst: via de bank of buiten de bank." verschijnt in een amberkleurige
  hint, niet in de rode foutpil. Rood blijft voor echte fouten.
- **Opvallend potje alleen met een eigen gemiddelde.** Een potje dat in de vorige maanden leeg was (of nieuw is)
  valt niet op; er is niets om mee te vergelijken. Op een lege maand staat er ook geen opvaller.
- **Welkom:** "Beginnen" is de hoofdknop; de Apple-knop heet "Doorgaan met Apple" (werkt voor nieuw en bestaand).
- **Klaar-scherm zonder bank:** "Klaar. Nog één stap" met "Bank koppelen" en "Eerst rondkijken", in plaats van de
  belofte dat er kaartjes komen.

- **Schakelaar heet "Ik krijg een deel terug"** (9 oktober 2026) en staat onderaan het hoofdscherm, naast Later.
- **Vergevingsgezinde streak** (9 oktober 2026). Eén gemiste dag per 7 dagen breekt de reeks niet; een klein
  sneeuwvlokje op Overzicht laat zien dat er een dag is opgevangen. Dagen zonder kaartjes tellen mee. De streak
  beloont sorteren, niet uitgeven. Meldingen wisselen per dag, nooit met schuldgevoel; bij meer dan 15 kaartjes:
  "Doe er een paar, de rest kan morgen ook nog."
- **Vaste ontvangers** (9 oktober 2026, Stein). Een potje ingedrukt houden (0,55 s) zet dit kaartje erin én legt
  vast dat deze ontvanger voortaan altijd in dit potje gaat. Open kaartjes van die ontvanger gaan meteen mee,
  nieuwe kaartjes bij de bank-sync. Dit is de enige automatische indeling, en alleen omdat de gebruiker het zelf
  vraagt. De richting telt: geld terug van dezelfde winkel gaat niet vanzelf mee. Weghalen kan in Instellingen >
  Vaste ontvangers; wat al is ingedeeld blijft dan staan. Direct na het instellen zet Ongedaan maken alles terug.
- **Ook de andere van deze winkel.** Na een gewone keuze biedt de pil onderin "Ook 3 andere" aan als dezelfde
  ontvanger nog op de stapel ligt. De gebruiker tikt zelf; nooit bij een verdeling of terugbetaling.
- **Inkomend geld toont alleen inkomstenpotjes** (Stein). Plus Terugbetaling (bij open delen) en '+'; een nieuw
  potje vanaf een inkomend kaartje is meteen een inkomstenpotje. Heeft iemand geen inkomstenpotje, dan staan alle
  potjes er, zodat het kaartje ergens heen kan.
- **Geld terug** (Stein). Op elk inkomend kaartje staat de tegel "Geld terug". Kies je een uitgavepotje, dan gaat
  het bedrag daar van af (minder uitgegeven). Kies je "Zonder potje", dan gaat het in het ingebouwde potje Geld
  terug: het gaat van je totaal af, van geen enkel potje, en telt nooit als inkomen. Overzicht noemt het bedrag
  onder de ring. Terugbetaling (open delen afstrepen) blijft een eigen tegel.

## Geld terug bijhouden (9 oktober 2026, Stein)

- **"Ik krijg een deel terug" = bijhouden, niet verdelen.** Aan betekent: de hele uitgave gaat in het potje en
  wacht op geld terug ("Je houdt bij wat er terugkomt. Je eigen deel volgt vanzelf."). Geen aantal personen, geen
  via of buiten de bank, geen namen of groepen meer op Swipen. Je eigen deel hoef je dus niet vooraf te bepalen.
- **Terugbetaling wijst naar de uitgave.** De tegel Terugbetaling staat er ook als er alleen uitgaven wachten.
  Bovenaan de sheet "Hoort bij een uitgave" (meest waarschijnlijke eerst: naam die overeenkomt, dan de nieuwste),
  met "€ 30 van € 90 terug". Kies je er een, dan vraagt de app of alles binnen is, met de som erbij: "Ja, de rest
  is van mij", "Er komt nog meer" of "Een deel kwam buiten de bank terug". Het geld gaat in hetzelfde potje als de
  uitgave, dus daar van af. Is er al genoeg terug, dan staat afronden voorop; de gebruiker tikt zelf.
- **Buiten de bank terug: zelf schatten.** Bij "Een deel kwam buiten de bank terug" vul je in hoeveel je zelf
  uitgaf (voorgevuld met bedrag min wat er via de bank terugkwam, tussen € 0 en het hele bedrag). Het potje telt
  daarna precies die schatting (`own_share` = schatting + wat via de bank terugkwam). Ongedaan maken wist hem weer.
- **Nog te krijgen op Overzicht** toont wachtende uitgaven apart als aantal ("Wacht nog op geld terug: 2 uitgaven"),
  zonder bedrag: er is niets afgesproken, dus we verzinnen geen getal. Per uitgave "Alles binnen", met dezelfde
  twee wegen (de rest is van mij, of zelf schatten).
- **Oude verdelingen blijven werken.** Open delen van vroeger staan nog in Nog te krijgen en onder de wachtende
  uitgaven in de Terugbetaling-sheet, en zijn daar af te strepen. Nieuwe delen ontstaan niet meer.
- **Groepen** verdwijnen uit Instellingen (ze waren alleen voor verdelen). De pagina `/instellingen/groepen` blijft
  bestaan maar is niet meer gelinkt.
- Verplaats je een wachtende uitgave naar een ander potje, dan gaan de gekoppelde terugbetalingen mee.
- **Terugbetaling per uitgave, niet per persoon** (Stein). Bij Terugbetaling tik je de uitgave aan zoals hij heette
  ("Sijf · € 240"). Oude verdelingen met open delen per persoon worden bij het openen van Swipen of Overzicht
  vanzelf omgezet naar bijhouden per uitgave (behalve als er al iets buiten de bank verrekend is).
- **"Ik krijg een deel terug" is een klein knopje direct onder de kaart** (Stein), niet meer onderin: met veel
  potjes hoefde je anders te scrollen. Onderin staat alleen nog Later (en bij een pinopname Verdelen en Nog contant).
  De regel onder de kaart is er altijd, zodat de tegels nooit verspringen.
