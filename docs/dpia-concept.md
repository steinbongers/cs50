# Concept-DPIA pilot [Appnaam]

> **Concept. Dit is geen juridisch advies.** Dit document is een eerste opzet van een gegevensbeschermingseffectbeoordeling (DPIA, art. 35 AVG) voor de pilot. Een jurist of privacyspecialist moet het toetsen en aanvullen voordat externe testers meedoen. De open punten staan in hoofdstuk 11.

Stand: 9 oktober 2026. Verwerkingsverantwoordelijke: [Bedrijfsnaam], KvK [nummer], vertegenwoordigd door Stein.
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
| `push_subscriptions` | Push-endpoint, sleutels (`p256dh`, `auth_secret`), user agent, tijdstippen | Endpoint verwijst naar de pushdienst van Apple, Google of Mozilla |
| `events` | Eventtype, payload, tijdstip | Alleen enums, aantallen, duren, buckets en id's van transacties en potjes. Nooit bedragen, tegenpartijen, omschrijvingen, notities of namen (`lib/events.ts`). Zoektermen worden niet gelogd, alleen een bucket van het aantal resultaten |
| `invite_codes` | Code, notitie, aantal keer gebruikt, verloopdatum | Geen `user_id`. De notitie kan een naam van een uitgenodigde bevatten; alleen de service role leest deze tabel |
| `churn_log` | Week van registratie (maandag), aantal dagen tot verwijderen | Bewust zonder `user_id`. Bij 20 testers is herleiden niet uit te sluiten (open punt) |
| `category_rules` | Tegenpartij-patroon en potje | Tabel bestaat, wordt in de pilot niet gebruikt |

Bijzondere persoonsgegevens worden niet bewust verwerkt, maar kunnen uit transacties af te leiden zijn.

## 4. Doelen

1. **De kerndienst leveren:** transacties tonen, laten indelen, potjes, budgetten, spaardoelen en voorgeschoten bedragen bijhouden.
2. **Eigen overboekingen herkennen**, zodat die niet op de stapel komen.
3. **Meldingen sturen** over open kaartjes, de maand en een verlopende koppeling.
4. **De pilot evalueren** met geaggregeerde, inhoudsloze gebruiksmetingen (`docs/pilotplan.md`).
5. **Toegang beperken** tot uitgenodigde testers.

Niet: gegevens verkopen, delen met adverteerders, profileren voor krediet, automatisch indelen of voorspellen.

## 5. Grondslag

| Doel | Grondslag (voorstel) |
|---|---|
| Kerndienst, eigen overboekingen, uitnodiging | Uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG) |
| Pushmeldingen | Toestemming van de gebruiker via het toestemmingsscherm van de browser, aan en uit te zetten in Instellingen (art. 6 lid 1 sub a) of uitvoering van de overeenkomst |
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
| GitHub (Actions) | Verwerker of subverwerker, te bevestigen | Roept twee keer per dag `/api/cron/sync` en `/api/cron/notify` aan met `CRON_SECRET`. Krijgt geen gebruikersgegevens, alleen de HTTP-status | VS |
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
| Meldingen uit | In Instellingen; verwijdert alle pushabonnementen |
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
| 10 | Pushbericht op het vergrendelscherm verraadt iets | Laag | Laag | Nooit bedragen of winkelnamen in meldingen | Laag |
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
