# Plan: melding na elke betaling en grote widget met knoppen

Stand: 11 november 2026. Branch `claude/melding-widget-073005`. Nog niets gebouwd: eerst akkoord.

## Doel in één zin

Na een betaling krijg je meteen een melding "€ 4,50 bij Albert Heijn → Boodschappen?" met **✓ Klopt** en
**Ander potje**, en op je beginscherm deelt een grote widget de oudste open betaling in met één tik.
De app hoeft daarvoor niet open.

## Eerst drie beslissingen van jou

1. **Voorstel van een potje botst met het productplan.** `docs/productplan.md` zegt: "We delen niets automatisch
   in en voorspellen niets" en sluit "voorselecties, AI-suggesties" uit. Een melding met een voorgesteld potje is
   een voorselectie. Er bestaat in de code ook geen leerlogica; alleen Vaste ontvangers (die deelt al zelf in).
   Mijn voorstel: het voorstel is het potje dat je **zelf het vaakst** koos voor dezelfde winkel (laatste 90
   dagen). Niets gaat in een potje zonder jouw tik. Is er geen geschiedenis, dan geen voorstel: de melding vraagt
   "Welk potje?" met alleen **Ander potje** en **Later**. Ik pas productplan, beslissingen en DPIA daarop aan.
   *Akkoord, of liever helemaal geen voorstel (dan altijd "Welk potje?")?*
2. **Vaste ontvanger.** Zo'n betaling staat al in zijn potje. Voorstel: dan géén melding (scheelt ruis).
3. **"Ander potje".** Voorstel: opent de app direct op dat kaartje. De meestgebruikte potjes als extra knoppen in
   de melding kan later; dat vraagt per gebruiker eigen knopsets en meer kans op mis-tikken op het vergrendelscherm.

## Hoe het werkt

### A. Apple Pay, direct

1. Jij stelt één keer in Opdrachten een automatisering in: **Transactie** (Wallet), "Voer direct uit", actie
   **Betaling indelen** van onze app, met Winkel en Bedrag als invoer. In de app komt een stap-voor-stap-scherm
   met schermafbeeldingen-tekst en een testknop.
2. Bij elke Apple Pay-betaling draait die actie (App Intent) op de achtergrond in de app. Die stuurt winkel en
   bedrag naar `/api/native/applepay`.
3. De server slaat een **voorlopige transactie** op (`source = 'applepay'`), zoekt het voorstel en geeft een
   kort geldige actiesleutel terug.
4. De app toont meteen een **lokale melding** met de knoppen. Geen APNs nodig voor deze route.

### B. Bank als vangnet

1. `cron.yml` haalt **4 keer per dag** op (PSD2-grens zonder gebruiker): 05:07, 10:07, 14:07 en 18:07 UTC
   (in de winter 6, 11, 15 en 19 uur). De avondmelding van 20:00 blijft, in aparte runs zónder bankophaal.
2. Na elke ophaalronde: per nieuwe uitgave eerst **ontdubbelen** tegen Apple Pay (hieronder). Wat overblijft en
   nog geen potje heeft, krijgt een **APNs-melding** met dezelfde knoppen. Meer dan 3 nieuwe in één keer: één
   melding "5 nieuwe betalingen" zonder knoppen, die de app opent. Geen meldingen tussen 22:00 en 07:00.
3. Webpush (Safari) blijft zoals hij is: alleen de avondmelding. Meldingen per betaling zijn alleen in de app.

### C. Ontdubbelen Apple Pay tegen bank

Een bankregel is dezelfde betaling als een open Apple Pay-regel als:
- het bedrag precies gelijk is, en
- de boekdatum van de bank op dezelfde dag of tot 3 dagen later valt (ING boekt pinbetalingen vaak een dag later), en
- de winkelnaam lijkt (na opschonen: "AH to go 1234 Amsterdam" lijkt op "Albert Heijn" is lastig, dus ook een
  lijst bekende afkortingen), **of** er precies één open Apple Pay-regel met dat bedrag in die dagen is.

Dan houden we de **bankregel** (die is echt en heeft een rekening), nemen potje, moment van indelen en notitie
over van de Apple Pay-regel, bewaren de Apple Pay-winkelnaam in `wallet_merchant` (voor het voorstel) en
verwijderen de voorlopige regel. Geen tweede melding.

Rest-risico: een Apple Pay-betaling met een kaart die niet gekoppeld is (bijvoorbeeld een creditcard) vindt nooit
een bankregel. Die blijft staan als gewone uitgave met het label "Apple Pay".

### D. Grote widget (iOS 17, interactief)

- Klein en middel blijven zoals ze zijn.
- **Groot**: de oudste open betaling (winkel, bedrag, datum), daaronder 4 knoppen met je meestgebruikte potjes,
  plus **Later**. Onderin: "Nog 6 kaartjes" en "Vrij tot de 25e: € 340".
- Een tik draait een App Intent in de widget, die `/api/native/assign` aanroept. Het antwoord bevat meteen de
  volgende betaling, zodat de widget direct doorschuift.
- `privacySensitive()`: in StandBy of op een vergrendeld scherm toont iOS een grijze balk in plaats van bedrag.

## Beveiliging en privacy

- **Vergrendelscherm, standaard verborgen.** Nieuwe instelling "Bedrag en winkel tonen op vergrendelscherm",
  standaard **uit**. De app leest de iOS-stand "Voorvertoning tonen" uit. Staat die op "Indien ontgrendeld" (de
  iOS-standaard), dan zet iOS zelf de tekst pas na Face ID neer en blijft de melding volledig. Staat die op
  "Altijd", dan sturen we een melding zónder bedrag, winkel en potje: "Nieuwe betaling. Klopt het voorstel?".
- **Knoppen alleen na ontgrendelen.** "Klopt" en "Ander potje" vragen Face ID als de telefoon op slot is.
- **Apparaatsleutel per iPhone** (nieuwe tabel `native_devices`) in plaats van één widgetsleutel per account.
  In de database alleen de hash. Op de iPhone in de Keychain (gedeeld met de widget via de App Group), niet in
  gewone instellingen. Vervalt na 30 dagen zonder de app te openen; elke keer dat je de app opent komt er een
  nieuwe. Uitloggen trekt hem in. Op de iPhone zichtbaar in Instellingen, met "Ontkoppel dit toestel".
- **Actiesleutel per melding**: ondertekend (HMAC) voor precies één betaling, één potje en één gebruiker, 48 uur
  geldig. "Klopt" werkt alleen met apparaatsleutel én actiesleutel, en alleen als de betaling nog open is.
- **Openbare repo en logs**: geen sleutels in code. APNs-sleutel en HMAC-geheim alleen in Vercel. De cron blijft
  alleen aantallen tonen; de nieuwe antwoordvelden ook (bijvoorbeeld `pushed: 3`, `merged: 1`).
- **Logs en metingen**: nooit winkel of bedrag, alleen soorten en aantallen (`applepay_received`,
  `notification_confirmed`).
- **DPIA**: nieuwe gegevensstroom (Apple Pay via Opdrachten: winkel, bedrag, tijdstip; geen kaartnummer), Apple
  als ontvanger voor APNs (meldingstekst gaat via Apple), het voorstel als nieuw doel, en de nieuwe tabel.

## Bestanden

**Database** (`supabase/migrations/20261111000000_meldingen_widget.sql`, alleen toevoegingen)
- `transactions`: bron `'applepay'`, kolommen `wallet_merchant`, `notified_at`.
- `native_devices`: id, user_id, key_hash, apns_token, apns_env, previews, created_at, last_seen_at, expires_at.
- `profiles.lock_screen_details boolean default false`.

**Server (Next.js)**
- `lib/native/device-key.ts` sleutels maken, hashen, controleren, verlopen.
- `lib/native/action-token.ts` actiesleutel ondertekenen en controleren.
- `lib/native/suggest.ts` voorstel uit je eigen keuzes.
- `lib/native/wallet.ts` bedrag uit Opdrachten lezen ("€ 4,50", "4.50", "-4,50 EUR").
- `lib/transactions/wallet-match.ts` ontdubbelen Apple Pay tegen bank.
- `lib/push/apns.ts` APNs via HTTP/2 met een ES256-token (geen extra pakket).
- `lib/push/payment-copy.ts` meldingsteksten, met en zonder details.
- `app/api/native/register/route.ts` apparaat koppelen (met inlogsessie), APNs-token en voorvertoningsstand.
- `app/api/native/applepay/route.ts`, `app/api/native/assign/route.ts` (Klopt, widgetknop, Later).
- `app/api/widget/route.ts` uitbreiden: oudste open betaling en meestgebruikte potjes; oude widgetsleutel blijft
  werken tot iedereen de nieuwe build heeft.
- `lib/bank/sync.ts` en `app/api/cron/sync/route.ts`: na ophalen ontdubbelen en melden.
- Instellingen: "Meldingen per betaling", "Bedrag op vergrendelscherm", "Apple Pay instellen" (stappenscherm).

**iPhone (Swift)**
- `ios/App/App/NativePushPlugin.swift` toestemming vragen, APNs-token, meldingscategorieën, knoppen afhandelen
  op de achtergrond (eigen plugin in plaats van `@capacitor/push-notifications`: die stuurt knoppen naar de
  webview, en die draait niet als de app dicht is).
- `ios/App/App/PaymentIntent.swift` App Intent "Betaling indelen" plus App Shortcut.
- `ios/App/App/NativeShared.swift` Keychain, API-aanroepen, gedeeld met de widget.
- `AppDelegate.swift` APNs-token doorgeven en meldingen afhandelen.
- `ios/App/Widget/FinanceWidget.swift` grote variant en widget-intents.

**Tests** (`tests/`): bedrag lezen, ontdubbelen, voorstel, actiesleutel (ook verlopen en vervalst),
meldingstekst met en zonder details, cron-planning (nooit meer dan 4 ophaalrondes).

## Wat jij met de hand doet (komt stap voor stap in `docs/native-app.md`)

1. **Apple Developer**: een APNs-sleutel (.p8) maken; Key ID en Team ID noteren.
2. **Xcode, app-target**: capability **Push Notifications**; de nieuwe Swift-bestanden toevoegen; bij
   NativeShared.swift ook het widget-target aanvinken.
3. **Xcode, widget-target**: het nieuwe bestand vervangen, minimaal iOS 17 (stond al zo).
4. **Vercel**: `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`, `APNS_BUNDLE_ID`, `NATIVE_ACTION_SECRET`.
5. **Supabase**: de migratie in de SQL Editor draaien.
6. **iPhone**: nieuwe build, meldingen toestaan, automatisering instellen via het stappenscherm.

## Wat ik niet kan testen

Swift kan ik hier niet echt draaien met jouw ondertekening, APNs en Wallet. Ik controleer de Swift-code met de
compiler waar dat lukt, maar de eerste echte test is op jouw iPhone. Ook de Opdrachten-automatisering
"Transactie" moet op een echte iPhone met Wallet getest worden.

## Volgorde

1. Database en server met tests. 2. Cron en ontdubbelen. 3. Swift: plugin, intent, widget.
4. Stappenscherm en instellingen. 5. Docs en DPIA. 6. Build en tests groen, dan PR naar jou (niet mergen).
