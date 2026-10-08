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

- Op de kaart, **vóór** je een potje kiest, een schakelaar **"Ik krijg geld terug"**.
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
