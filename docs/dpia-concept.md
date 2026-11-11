# Concept-DPIA pilot [Appnaam]

> **Concept. Dit is geen juridisch advies.** Dit document is een eerste opzet van een gegevensbeschermingseffectbeoordeling (DPIA, art. 35 AVG) voor de pilot. Een jurist of privacyspecialist moet het toetsen en aanvullen voordat externe testers meedoen. De open punten staan in hoofdstuk 11.

Stand: 11 november 2026 (bijgewerkt voor meldingen per betaling, Apple Pay via Opdrachten en de grote widget; zie hoofdstuk 2a). Verwerkingsverantwoordelijke: [Bedrijfsnaam], KvK [nummer], vertegenwoordigd door Stein.
Gebaseerd op de code in deze repository (migraties in `supabase/migrations/`, `lib/events.ts`, `lib/bank/`, `app/api/export/route.ts`, `app/(app)/instellingen/actions.ts`).

## 1. Waarom een DPIA

- Het gaat om financiële gegevens van een deels kwetsbare doelgroep (18-30 jaar, vaak krap bij kas).
- Transactiedata kan indirect bijzondere persoonsgegevens verraden: gezondheid (apotheek, zorg), geloof (kerk, goede doelen), vakbondslidmaatschap.
- De gegevens gaan ook over derden: namen en rekeningnummers van tegenpartijen, en namen van mensen aan wie de gebruiker geld voorschiet.
- Gegevens komen via een nieuwe technologie (PSD2-koppeling via een derde).

Het rapport adviseert een DPIA bij lancering als verplicht te behandelen. Voor de pilot maken we deze korte versie.

## 2. Beschrijving van de verwerking

[Appnaam] is een webapp (PWA) waarin de gebruiker elke betaling zelf in een potje stopt. De app deelt niets automatisch in.

1. De gebruiker registreert zich met een uitnodigingscode, met e-mail en wachtwoord of met Inloggen met Apple.
2. De gebruiker koppelt één bank via Enable Banking. Enable Banking haalt als vergunde AIS-dienstverlener de rekeninggegevens op en geeft ze met toestemming van de gebruiker aan de app door.
3. De app haalt transacties op vanaf de laatste salarisdag, daarna twee keer per dag (planning via GitHub Actions) en als de gebruiker zelf ververst.
4. Overboekingen tussen eigen gekoppelde rekeningen herkent de app via een hash van het rekeningnummer en slaat ze over.
5. De gebruiker deelt elke betaling in, kan een deel als voorgeschoten markeren (met optioneel een naam) en een terugbetaling afboeken.
6. Om 20:00 stuurt de app een pushmelding als er kaartjes liggen. De melding bevat geen bedragen of winkelnamen.
7. De app logt gebruiksmetingen zonder transactie-inhoud. Stein ziet alleen geaggregeerde cijfers op `/admin`.

### 2a. Nieuw per 11 november 2026: melding na elke betaling

8. **Apple Pay via Opdrachten.** De gebruiker kan in de iOS-app Opdrachten zelf een automatisering "Transactie" instellen. Bij elke Apple Pay-betaling geeft iOS dan de **winkelnaam en het bedrag** door aan de iPhone-app, die ze naar de server stuurt (`/api/native/device/applepay`). De server slaat ze op als voorlopige transactie (`source = 'applepay'`) met datum en tijd van ontvangst. Kaartnummer, kaartnaam en locatie worden niet doorgegeven of opgeslagen. Dit staat standaard uit: zonder de automatisering gebeurt er niets, en de gebruiker stopt door de automatisering te verwijderen.
9. **Samenvoegen met de bank.** Levert de bank dezelfde betaling later (zelfde bedrag, binnen drie dagen, winkel lijkt), dan blijft de bankregel en verdwijnt de voorlopige. De Wallet-winkelnaam blijft bewaard op de bankregel (`wallet_merchant`).
10. **Voorstel van een potje.** De melding en de grote widget stellen het potje voor dat de gebruiker zelf het vaakst koos bij dezelfde winkel in de laatste 90 dagen. Er wordt niets ingedeeld zonder een tik van de gebruiker. Geen model, geen gegevens van andere gebruikers, geen derde partij: het is een telling over de eigen transacties.
11. **Meldingen met knoppen.** Na een Apple Pay-betaling toont de iPhone zelf een lokale melding. Na een bankophaalronde (nu vier keer per dag) stuurt de server een melding via Apple (APNs). Die meldingen kunnen bedrag, winkel en voorgesteld potje bevatten, maar alleen als iOS de tekst verbergt tot de iPhone ontgrendeld is of de gebruiker dat zelf heeft aangezet (zie risico 10). De avondmelding blijft zonder bedragen.
12. **Grote widget.** Toont op het beginscherm de oudste open betaling (winkel, bedrag, datum) met potjes als knoppen. Haalt die op via `/api/widget` met een apparaatsleutel.

Schaal van de pilot: 30-50 uitgenodigden, doel minstens 20 gekoppelde testers, minstens 4 weken.

## 3. Gegevenscategorieën

Afgeleid uit de migraties. Alle tabellen hebben `user_id` met `on delete cascade` naar `auth.users`, tenzij anders vermeld.

| Tabel | Gegevens | Opmerking |
|---|---|---|
| `auth.users` (Supabase Auth) | E-mailadres, wachtwoordhash, bij Apple een Apple-id (eventueel een doorstuuradres), inlogmomenten | Beheerd door Supabase |
| `profiles` | Weergavenaam (optioneel, max. 60 tekens), salarisdag, onboardingstatus, meldingen aan of uit, tijdstip laatste melding, gebruikte uitnodigingscode | |
| `categories` | Namen, iconen, kleuren, budget en spaardoel van potjes | Een zelfgekozen potjesnaam kan iets gevoeligs zeggen |
| `bank_connections` | Banknaam, sessie-id van Enable Banking, geldig tot, status, tijdstippen van sync, laatste foutmelding | Sessie-id wordt bij ontkoppelen leeggemaakt |
| `accounts` | Rekeningnaam, **IBAN alleen gemaskeerd** (`NL** **** 4300`), **sha256-hash van de IBAN**, valuta, laatste saldo, actief | De volledige IBAN wordt niet opgeslagen (`lib/bank/mapping.ts`) |
| `transactions` | Boekdatum, tijd (als die in de omschrijving staat), bedrag, eigen deel, valuta, tegenpartij (opgeschoond en ruw), omschrijving (opgeschoond en ruw), saldo na de transactie, potje, moment van indelen, aantal keer Later, eigen overboeking ja/nee, notitie (max. 140 tekens), bron, dedupe-hash | Bevat gegevens van derden (namen van tegenpartijen). Het tegenrekeningnummer wordt alleen gehasht vergeleken met de eigen rekeningen en niet opgeslagen. Staat een rekeningnummer in de omschrijving van de bank, dan staat het wel in `raw_description` (open punt) |
| `transaction_shares` | Naam van de persoon (optioneel, max. 60 tekens), bedrag, status, koppeling met de terugbetaling | Gegevens van derden |
| `native_devices` | Per gekoppelde iPhone: een willekeurige installatie-id, **sha256-hash van de apparaatsleutel**, APNs-token, omgeving, de iOS-stand "Voorvertoning tonen", tijdstippen, vervaldatum | Alleen de service role leest deze tabel. Geen toestelnaam, model of locatie. De sleutel zelf staat alleen in de Keychain van de iPhone. Weg bij uitloggen, ontkoppelen of verwijderen van het account |
| `transactions` (aanvulling) | Bron `applepay`, `wallet_merchant` (winkelnaam uit Apple Wallet), `notified_at` (melding verstuurd) | Winkelnaam en bedrag komen van de iPhone van de gebruiker zelf, niet van Apple's servers |
| `profiles` (aanvulling) | Meldingen per betaling aan of uit, details op het vergrendelscherm aan of uit | Standaard: details verborgen |
| `push_subscriptions` | Push-endpoint, sleutels (`p256dh`, `auth_secret`), user agent, tijdstippen | Endpoint verwijst naar de pushdienst van Apple, Google of Mozilla |
| `events` | Eventtype, payload, tijdstip | Alleen enums, aantallen, duren, buckets en id's van transacties en potjes. Nooit bedragen, tegenpartijen, omschrijvingen, notities of namen (`lib/events.ts`). Zoektermen worden niet gelogd, alleen een bucket van het aantal resultaten |
| `invite_codes` | Code, notitie, aantal keer gebruikt, verloopdatum | Geen `user_id`. De notitie kan een naam van een uitgenodigde bevatten; alleen de service role leest deze tabel |
| `churn_log` | Week van registratie (maandag), aantal dagen tot verwijderen | Bewust zonder `user_id`. Bij 20 testers is herleiden niet uit te sluiten (open punt) |
| `category_rules` | Tegenpartij-patroon en potje | Tabel bestaat, wordt in de pilot niet gebruikt |

Bijzondere persoonsgegevens worden niet bewust verwerkt, maar kunnen uit transacties af te leiden zijn.

## 4. Doelen

1. **De kerndienst leveren:** transacties tonen, laten indelen, potjes, budgetten, spaardoelen en voorgeschoten bedragen bijhouden.
2. **Eigen overboekingen herkennen**, zodat die niet op de stapel komen.
3. **Meldingen sturen** over open kaartjes, de maand, een verlopende koppeling en (iPhone-app) elke nieuwe betaling, met knoppen om hem direct in te delen.
3a. **Een potje voorstellen** in die melding en op de widget, op basis van de eigen eerdere keuzes van de gebruiker. Altijd met bevestiging door de gebruiker.
4. **De pilot evalueren** met geaggregeerde, inhoudsloze gebruiksmetingen (`docs/pilotplan.md`).
5. **Toegang beperken** tot uitgenodigde testers.

Niet: gegevens verkopen, delen met adverteerders, profileren voor krediet, of indelen zonder handeling van de gebruiker. Het voorstel (3a) is geen geautomatiseerde besluitvorming in de zin van art. 22 AVG: er volgt niets uit zonder tik, en het heeft geen rechtsgevolg. Wel te toetsen door de jurist (open punt 15).

## 5. Grondslag

| Doel | Grondslag (voorstel) |
|---|---|
| Kerndienst, eigen overboekingen, uitnodiging | Uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG) |
| Pushmeldingen | Toestemming van de gebruiker via het toestemmingsscherm van de browser, aan en uit te zetten in Instellingen (art. 6 lid 1 sub a) of uitvoering van de overeenkomst |
| Apple Pay via Opdrachten | Toestemming (art. 6 lid 1 sub a): de gebruiker stelt de automatisering zelf in op zijn iPhone, na uitleg in de app over wat er wordt doorgegeven. Intrekken: de automatisering verwijderen. Alternatief: uitvoering van de overeenkomst. Te bevestigen door de jurist |
| Meldingen per betaling en voorstel | Toestemming via het meldingenscherm van iOS en de schakelaar in Instellingen |
| Pilotmetingen | Gerechtvaardigd belang (art. 6 lid 1 sub f), met een belangenafweging. In de pilot is meten ook onderdeel van de testersvoorwaarden |
| Gegevens van derden (tegenpartijen, namen bij Voorgeschoten) | Gerechtvaardigd belang (art. 6 lid 1 sub f) |
| Ophalen van bankgegevens | Uitdrukkelijke PSD2-toestemming van de gebruiker bij Enable Banking, naast de AVG-grondslag |
| Mogelijk afleidbare bijzondere gegevens | Geen doel en geen verwerking als zodanig. Open punt of art. 9 AVG toch een uitzondering vraagt |

## 6. Ontvangers en verwerkers

| Partij | Rol (voorstel) | Wat | Waar |
|---|---|---|---|
| Supabase | Verwerker | Database, authenticatie, alle gegevens uit hoofdstuk 3 | Regio Frankfurt (EU) |
| Vercel | Verwerker | Hosting van de app, server-side code, logs van verzoeken | Functies in `fra1` (Frankfurt). Vercel is een Amerikaans bedrijf; edge-netwerk en logs kunnen buiten de EU vallen (open punt) |
| Enable Banking Oy (Finland) | Zelfstandig vergunde AISP onder FIN-FSA. AVG-rol nog te bevestigen | Haalt bankgegevens op en levert ze aan de app | EU |
| GitHub (Actions) | Verwerker of subverwerker, te bevestigen | Roept vier keer per dag `/api/cron/sync` en twee keer `/api/cron/notify` aan met `CRON_SECRET`. Krijgt geen gebruikersgegevens, alleen de HTTP-status en aantallen. De repository en de logs zijn openbaar; de routes geven daarom nooit iets anders terug dan aantallen of een foutmelding | VS |
| Apple (APNs, meldingen naar de iPhone-app) | Ontvanger | Het APNs-token van het toestel en de inhoud van de melding. Die kan bedrag, winkel en voorgesteld potje bevatten (versleuteld onderweg, door Apple afgeleverd). Staat de voorvertoning op "Altijd" en heeft de gebruiker details niet aangezet, dan bevat de melding geen van drieën | Wereldwijd, vaak VS |
| Apple (Opdrachten en Wallet op de iPhone) | Geen ontvanger van onze gegevens | De automatisering draait op het toestel. Apple geeft winkel en bedrag aan de app; wij sturen niets terug naar Apple | Op het toestel |
| Pushdiensten (Apple, Google, Mozilla) | Ontvanger | Pushbericht en endpoint. Berichten bevatten geen bedragen of winkelnamen | Wereldwijd, vaak VS |
| Apple (Inloggen met Apple) | Zelfstandig verantwoordelijke | Inloggegevens van wie die optie kiest | VS |
| De bank van de gebruiker | Zelfstandig verantwoordelijke | Toestemmingsscherm, levering aan Enable Banking | EU |

Stein heeft als admin toegang tot `/admin` (alleen aggregaten) en via de service role in principe tot alle data. Er is geen ander personeel.

## 7. Bewaartermijnen (voorstel)

| Gegevens | Termijn |
|---|---|
| Account, transacties, potjes, delen, events, pushabonnementen | Zolang het account bestaat. Bij verwijderen direct weg via `on delete cascade` |
| Na ontkoppelen van de bank | Transacties blijven bewaard (bewuste keuze, de gebruiker ziet dit). Sessie-id wordt gewist, status wordt `revoked` |
| Einde pilot | Voorstel: binnen 30 dagen na het einde vragen we testers of ze doorgaan. Wie niet reageert, wordt na nog 30 dagen verwijderd. Nog te besluiten |
| `churn_log` | Tot het einde van de pilotanalyse, uiterlijk 12 maanden |
| `invite_codes` | Tot het einde van de pilot |
| Back-ups bij Supabase | Volgens het plan van Supabase (dagelijkse back-ups, beperkte termijn). Een verwijderd account kan tot die termijn in een back-up staan (open punt) |
| Logs bij Vercel | Volgens het plan van Vercel (beperkte dagen) |

## 8. Rechten van betrokkenen

Gecontroleerd in de code.

| Recht | Hoe |
|---|---|
| Informatie (art. 13) | Privacytekst op `/privacy`. Moet nog aangevuld worden met verwerkingsverantwoordelijke, grondslagen, bewaartermijnen, GitHub, pushdiensten, Apple en het klachtrecht bij de AP |
| Inzage en overdraagbaarheid (art. 15, 20) | Instellingen, "data downloaden": `/api/export` levert een CSV met alle transacties (datum, tijd, bedrag, eigen deel, tegenpartij, omschrijving, ruwe banktekst, potje, notitie, saldo) en alle voorgeschoten delen. Profiel, potjesinstellingen, rekeningen en events zitten er niet in; die geven we op verzoek per mail |
| Rectificatie (art. 16) | Naam, salarisdag, potjes en notities zijn in de app aan te passen. Banktekst komt van de bank en is niet aan te passen |
| Verwijdering (art. 17) | "Account verwijderen" in Instellingen. Na één bevestiging: anonieme regel in `churn_log`, intrekken van de sessie bij Enable Banking, verwijderen van de gebruiker via de service role. Alle tabellen volgen via `on delete cascade` (`app/(app)/instellingen/actions.ts`) |
| Intrekken toestemming bank | "Bank ontkoppelen" in de app trekt de sessie in bij Enable Banking. Ook via de bank zelf |
| Meldingen uit | In Instellingen; verwijdert alle pushabonnementen. Meldingen per betaling hebben een eigen schakelaar. Uitloggen ontkoppelt de iPhone (apparaatsleutel en APNs-token weg) |
| Apple Pay-doorgifte stoppen | De automatisering verwijderen in Opdrachten. Voorlopige Apple Pay-regels zijn gewone transacties: ze zitten in de export en verdwijnen met het account |
| Bezwaar (art. 21) tegen metingen | Nu alleen per mail. Een schakelaar om metingen uit te zetten is er niet (open punt) |
| Derden (tegenpartijen, namen bij Voorgeschoten) | Kunnen hun rechten niet zelf in de app uitoefenen. Verzoeken per mail aan [supportadres] |

## 9. Risico's

Kans en impact: laag, middel, hoog. Restrisico na maatregelen.

| # | Risico | Kans | Impact | Maatregelen | Restrisico |
|---|---|---|---|---|---|
| 1 | Een gebruiker ziet data van een ander | Laag | Hoog | RLS op alle tabellen met `(select auth.uid()) = user_id`. `invite_codes` en `churn_log` zonder policies voor gewone gebruikers. Kolomrechten op `profiles` (uitnodigingscode niet te wijzigen) | Laag |
| 2 | Lek van de service-rolsleutel geeft toegang tot alles | Laag | Hoog | Sleutel (`SUPABASE_SECRET_KEY`) alleen server-side (`server-only`), nooit in de browser. Alle geheimen in omgevingsvariabelen bij Vercel, niet in de code. Admin alleen voor e-mailadressen in `ADMIN_EMAILS` | Laag-middel |
| 3 | Lek van de privésleutel van Enable Banking | Laag | Hoog | `ENABLE_BANKING_PRIVATE_KEY` alleen in omgevingsvariabelen. Toegang is alleen-lezen (AIS), geen betalingen | Laag |
| 4 | Misbruik van de cron-routes | Middel | Middel | `CRON_SECRET` als Bearer-token, als secret in GitHub en Vercel. Routes doen niets zonder geldig token | Laag |
| 5 | Transactiedata in logs | Middel | Middel | Events bevatten geen inhoud. De app logt zelf geen transactiedata naar de console (te bevestigen bij elke release). Steekproef op logs in Vercel en Supabase elke week. `bank_connections.last_error` bevat alleen een foutmelding van de sync (controleren dat daar geen banktekst in komt) | Laag-middel |
| 6 | Gegevens van derden (tegenpartijen, namen) | Hoog | Laag-middel | Alleen wat de bank meestuurt. Tegenrekeningnummers alleen gehasht gebruikt, niet opgeslagen. Namen bij Voorgeschoten optioneel. Niet gedeeld, niet verkocht | Laag |
| 7 | Afleiden van bijzondere gegevens uit transacties | Middel | Hoog | Geen automatische categorisering of profilering. Alleen de gebruiker zelf ziet zijn transacties. Aggregaten op `/admin` zonder inhoud | Middel |
| 8 | Herleiden van personen uit pilotcijfers bij kleine aantallen | Middel | Laag | Admins tellen niet mee, "Nog te weinig data" bij n<5, `churn_log` zonder `user_id` | Laag-middel |
| 9 | Koppeling blijft langer actief dan nodig | Middel | Laag | PSD2 staat maximaal 180 dagen toe. De app vraagt nu 90 dagen (`CONSENT_DAYS = 90` in `app/bank/actions.ts`). Ontkoppelen en verwijderen trekken de sessie in. Verloopmelding 7 dagen vooraf | Laag |
| 10 | Melding op het vergrendelscherm verraadt bedrag, winkel of potje (bijvoorbeeld een apotheek) | Middel | Middel | Privacy by default: details staan alleen in de melding als iOS ze verbergt tot de iPhone ontgrendeld is ("Voorvertoning: Indien ontgrendeld", de iOS-standaard). De app leest die stand uit; bij "Altijd" gaat er een melding zonder bedrag, winkel en potje, tenzij de gebruiker "Verberg bedrag op vergrendelscherm" zelf uitzet. De avondmelding bevat nooit bedragen. De widget markeert bedrag en winkel als privacygevoelig (grijze balk op een vergrendeld scherm) | Laag-middel |
| 15 | Iemand anders deelt betalingen in via een melding of de widget (telefoon in andere handen) | Laag | Laag | Knoppen in meldingen vragen Face ID of toegangscode op een vergrendelde iPhone. De schade is beperkt: een betaling in een verkeerd potje, in de app terug te zetten. Geen geldverkeer mogelijk | Laag |
| 16 | Lek of misbruik van de apparaatsleutel (widget, Apple Pay-actie, knoppen) | Laag | Middel | Sleutel in de iOS-Keychain, alleen op dit toestel, niet in back-ups naar andere toestellen. Op de server alleen de hash. Vervalt na 30 dagen, wordt bij elke keer openen vervangen, weg bij uitloggen. Kan alleen: widgetgegevens lezen (open kaartjes, vrij bedrag, oudste open betaling), een Apple Pay-betaling aanmelden en een open betaling indelen. Geen toegang tot de rest van het account. "Klopt" vraagt daarbovenop een actiesleutel voor precies die betaling (HMAC, 48 uur) | Laag |
| 17 | Valse of dubbele Apple Pay-regels (automatisering draait twee keer, of iemand met de sleutel stuurt onzin) | Laag | Laag | Herhaling binnen twee minuten telt als één. Hoogstens 100 per dag. Bedrag en winkelnaam worden gevalideerd en ingekort. Een Apple Pay-regel zonder bankregel blijft zichtbaar als "Apple Pay" en is te verwijderen via een potje of het account | Laag |
| 18 | Het voorstel stuurt de gebruiker (nudging) of legt gevoelige patronen bloot | Laag | Laag-middel | Het voorstel is alleen een telling over de eigen keuzes, zichtbaar voor de gebruiker zelf. Niets wordt ingedeeld zonder tik. Geen profiel, geen score, niet gedeeld | Laag |
| 11 | Overnemen van een account | Laag | Hoog | Supabase Auth, wachtwoord of Apple. Gesloten pilot met codes | Laag-middel |
| 12 | Doorgifte buiten de EU (Vercel, GitHub, pushdiensten, Apple) | Middel | Middel | EU-regio's voor data en functies. GitHub krijgt geen gebruikersdata. Doorgifte via het EU-VS Data Privacy Framework of standaardcontractbepalingen (te controleren) | Middel |
| 13 | Verkeerde PSD2-rol, waardoor de app zonder vergunning AIS levert | Middel | Hoog | Toestemmingsscherm van Enable Banking zichtbaar laten. Schriftelijke bevestiging van de rol vóór externe testers (`docs/enable-banking-mail.md`) | Laag na bevestiging |
| 14 | Datalek zonder goede afhandeling | Laag | Hoog | Datalekprocedure met melding binnen 72 uur aan de AP. Nog op te stellen | Middel tot die er is |

## 10. Conclusie (concept)

Met de maatregelen hierboven lijkt het restrisico voor een gesloten pilot van 30-50 testers aanvaardbaar. Voorafgaande raadpleging van de AP (art. 36) lijkt voor de pilot niet nodig, maar dat moet de jurist bevestigen. Vóór een publieke lancering komt een volledige DPIA.

## 11. Open punten voor de jurist

1. AVG-rol van Enable Banking: verwerker of zelfstandig verantwoordelijke, en welke afspraken nodig zijn.
2. PSD2-rol: is [Bedrijfsnaam] data-ontvanger of agent, en is een melding bij DNB of FIN-FSA nodig.
3. Grondslag voor pilotmetingen (gerechtvaardigd belang of toestemming) en of een schakelaar om metingen uit te zetten nodig is.
4. Grondslag voor gegevens van derden, en of art. 9 AVG een uitzondering vraagt voor afleidbare bijzondere gegevens.
5. Of een gehashte IBAN (sha256 zonder zout) voldoende is. Een IBAN is te raden; de hash blijft een persoonsgegeven.
6. Of rekeningnummers van derden in de ruwe omschrijving (`raw_description`) een probleem zijn.
7. Of de CSV-export volledig genoeg is voor art. 15 en 20, of dat profiel, potjes, rekeningen en events erbij moeten.
8. Doorgifte naar de VS: Vercel, GitHub, Apple, pushdiensten. Welke waarborgen gelden.
9. Bewaartermijnen na de pilot en in back-ups.
10. Of `churn_log` en `invite_codes.note` echt anoniem of geminimaliseerd genoeg zijn.
11. Inhoud van de privacytekst en de testersvoorwaarden.
12. Verwerkersovereenkomsten met Supabase, Vercel en eventueel GitHub.
13. Verwerkingsregister (art. 30) en datalekprocedure (art. 33 en 34).
14. Of voorafgaande raadpleging van de AP nodig is.
15. Het voorstel van een potje: bevestigen dat dit geen profilering met rechtsgevolg is (art. 22) en of de privacytekst het zo voldoende uitlegt.
16. Grondslag voor de Apple Pay-doorgifte via Opdrachten (toestemming of overeenkomst) en of het instelscherm in de app als informatie volstaat.
17. Apple als ontvanger van meldingsinhoud via APNs: rol en doorgifte naar de VS.
