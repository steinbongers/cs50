# Native iPhone-app (Capacitor)

De iPhone-app is een dunne schil om de webapp: hij laadt `https://financeapppilot.vercel.app`.
Elke wijziging die op Vercel staat, zit dus direct in de app, zonder nieuwe build.
Een nieuwe build is alleen nodig als de schil zelf verandert (naam, icoon, bundel-id, native functies).

## Eenmalig op je Mac

1. Installeer **Xcode** uit de Mac App Store (gratis, groot; even laten downloaden).
2. Installeer **Node.js** (LTS) van https://nodejs.org.
3. Open **Terminal** en voer uit:

   ```sh
   git clone https://github.com/steinbongers/cs50.git
   cd cs50
   git checkout claude/new-session-7yi9kj
   npm install
   npx cap sync ios
   npx cap open ios
   ```

   Xcode opent nu het project.

4. In Xcode, links bovenaan op **App** klikken, dan tabblad **Signing & Capabilities**:
   - **Team**: kies je Apple Developer-team (log zo nodig in via Xcode, Settings, Accounts).
   - **Bundle Identifier** staat op `nl.steinbongers.financeapp`. Meldt Xcode dat die bezet is, verander hem
     (bijvoorbeeld `nl.steinbongers.potjes`) en zet dezelfde waarde in `capacitor.config.ts`.

## Op je iPhone zetten (via kabel)

1. Sluit je iPhone aan met een kabel en kies op de iPhone **Vertrouw deze computer**.
2. Zet op de iPhone **Ontwikkelaarsmodus** aan: Instellingen, Privacy en beveiliging, Ontwikkelaarsmodus,
   aanzetten en de iPhone herstarten.
3. Kies in Xcode bovenaan je iPhone als doel en klik op de afspeelknop. Na een minuut staat de app op je telefoon.

## TestFlight (voor testers, later)

1. Maak in https://appstoreconnect.apple.com een nieuwe app aan met dezelfde bundel-id.
2. In Xcode: doel **Any iOS Device**, menu **Product**, **Archive**, dan **Distribute App**, **App Store Connect**, **Upload**.
3. In App Store Connect, tabblad **TestFlight**: testers uitnodigen via e-mail.

## Bijwerken

Na een wijziging aan `capacitor.config.ts` of het icoon: `git pull`, `npx cap sync ios`, opnieuw op afspelen klikken.

## Face ID-slot en widget (eenmalig in Xcode)

Twee native functies zitten in de schil zelf, dus hiervoor is één keer een nieuwe build nodig:

- **Face ID-slot**: in Instellingen, groep Meldingen en weergave. Staat het aan, dan vraagt de app Face ID
  (of je toegangscode) bij het openen en als hij langer dan een minuut op de achtergrond stond.
- **Widget op je beginscherm**: "Nog 4 kaartjes" en "Vrij tot de 25e: € 340", klein en middel.
  Koppelen via Instellingen, Widget instellen.

Beide rijen verschijnen alleen in de app, en pas als de nieuwe build erop staat. In Safari zie je ze niet.

Alle code staat al in de repo. In Xcode moet je drie dingen met de hand doen: drie bestanden aan de app toevoegen,
een App Group aanzetten en een widget-target maken. Dat kan niet goed vanaf de commandline.

### 1. Bijwerken en openen

```sh
git pull
npm install
npx cap sync ios
npx cap open ios
```

### 2. De drie nieuwe bestanden aan de app toevoegen

De bestanden staan al in `ios/App/App/`, maar Xcode kent ze nog niet.

1. Links in de projectnavigator: klik met rechts op de gele map **App** (onder het blauwe project App).
2. Kies **Add Files to "App"…**.
3. Selecteer in de map `ios/App/App` deze drie bestanden (Cmd ingedrukt houden):
   - `MainViewController.swift`
   - `BiometricLockPlugin.swift`
   - `WidgetBridgePlugin.swift`
4. Onderin: **Copy items if needed** uit (of bij Action: **Reference files in place**). Bij **Targets** alleen **App** aanvinken.
5. Klik **Add**.

`MainViewController` registreert de twee plugins; `SceneDelegate.swift` en `Main.storyboard` gebruiken hem al.
Zonder deze stap bouwt de app niet (Xcode meldt dan "Cannot find 'MainViewController' in scope").

### 3. App Group op de app

1. Klik bovenaan links op het blauwe project **App**, kies onder Targets **App**, tabblad **Signing & Capabilities**.
2. Klik **+ Capability** (linksboven in dat tabblad) en kies **App Groups**.
3. Klik onder App Groups op **+** en vul in: `group.nl.steinbongers.financeapp`. Klik OK en zorg dat het vinkje ervoor aan staat.

Xcode maakt hiervoor zelf het bestand `App.entitlements` aan en registreert de groep bij Apple.

### 4. Widget-target maken

1. Menu **File**, **New**, **Target…**.
2. Kies **iOS**, **Widget Extension**, **Next**.
3. **Product Name**: `FinanceWidget` (precies zo; niet "Widget", dat botst met de naam van Apples framework).
   **Team**: hetzelfde als bij de app.
   Zet uit: **Include Live Activity**, **Include Control** en **Include Configuration App Intent**.
4. Klik **Finish**. Vraagt Xcode of hij het schema "FinanceWidget" moet activeren: kies **Cancel** (je blijft op App).

### 5. De voorbeeldcode van Xcode vervangen door de onze

1. In de projectnavigator staat nu een map **FinanceWidget**. Selecteer daarin alle `.swift`-bestanden die Xcode
   heeft gemaakt (bijvoorbeeld `FinanceWidget.swift` en `FinanceWidgetBundle.swift`), klik met rechts, **Delete**,
   **Move to Trash**. Laat `Assets.xcassets` en `Info.plist` staan.
2. Klik met rechts op de map **FinanceWidget**, **Add Files to "App"…**.
3. Kies `ios/App/Widget/FinanceWidget.swift`. **Copy items if needed** uit (Reference files in place).
   Bij **Targets** alleen **FinanceWidget** aanvinken, **App** uit.
4. Klik **Add**.

### 6. Instellingen van het widget-target

Kies onder Targets **FinanceWidget**:

1. Tabblad **General**, **Minimum Deployments**: **iOS 17.0**. (De widget gebruikt iOS 17. De app zelf blijft
   op iOS 15; op een oudere iPhone is er alleen geen widget.)
2. Tabblad **Signing & Capabilities**: **Team** hetzelfde als bij de app. De Bundle Identifier is
   `nl.steinbongers.financeapp.FinanceWidget`; laat die zo (hij moet met de bundel-id van de app beginnen).
3. Nog steeds Signing & Capabilities: **+ Capability**, **App Groups**, en vink `group.nl.steinbongers.financeapp` aan
   (dezelfde als bij de app; hij staat al in de lijst).
4. Tabblad **Build Settings**, zoek op `Swift Language Version` en zet die op **Swift 5**. Zoek daarna op
   `Default Actor Isolation`; staat die op MainActor, zet hem op **nonisolated**. (Bestaat die instelling niet,
   dan is er niets te doen.)

### 7. Bouwen en testen

1. Kies bovenaan het schema **App** en je iPhone, klik op afspelen.
2. **Face ID-slot**: Instellingen, Face ID-slot aanzetten. Je krijgt meteen één keer Face ID; daarna staat hij aan.
   Ga naar het beginscherm, wacht ruim een minuut en open de app: hij vraagt Face ID. Korter weg: geen vraag.
   Lukt Face ID niet, dan vraagt iOS je toegangscode.
3. **Widget**: Instellingen, Widget instellen. Er staat dan "Gekoppeld". Houd je beginscherm ingedrukt, tik op
   **Wijzig** (linksboven), **Voeg widget toe**, zoek de app op en kies klein of middel.
   Zonder koppeling toont de widget "Open de app om de widget te koppelen".

### Goed om te weten

- **Bundel-id veranderd?** Dan heet de App Group anders, bijvoorbeeld `group.nl.steinbongers.potjes`. Pas hem dan
  aan op beide targets én in `ios/App/App/WidgetBridgePlugin.swift` en `ios/App/Widget/FinanceWidget.swift` (`appGroup`).
- **Eén widgetsleutel per account.** Koppel je op een tweede iPhone, dan stopt de widget op de eerste; die toont
  dan weer "Open de app om de widget te koppelen". Opnieuw op Widget instellen tikken lost dat op.
- **Verversen**: de widget haalt ongeveer elk half uur nieuwe getallen op (iOS bepaalt het precieze moment).
  Na koppelen ververst hij meteen. Zonder netwerk blijven de laatste getallen staan.
- **Wat de widget ziet**: alleen het aantal open kaartjes en het bedrag vrij tot je salaris, via `/api/widget`.
  Geen transacties. De sleutel staat op de iPhone in de App Group; in de database alleen de hash.
- **Face ID-slot per toestel**: de stand staat op de iPhone zelf. Uitloggen of een nieuwe build zet hem niet uit.
- `npx cap sync` laat deze bestanden en instellingen met rust.

## Melding na elke betaling, Apple Pay en de grote widget (eenmalig)

Sinds november 2026 kan de app na elke betaling een melding sturen met de knoppen **✓ Klopt** en **Ander potje**,
en is er een grote widget waarmee je de oudste open betaling met één tik indeelt. Achtergrond en keuzes staan in
`docs/plan-meldingen-en-widget.md` en `docs/beslissingen.md`.

Hiervoor moet je op vijf plekken iets doen. Doe ze in deze volgorde. Heb je het Face ID-slot en de widget hierboven
nog niet gedaan, doe die stappen dan eerst.

### A. Supabase: de nieuwe tabellen

1. Open je Supabase-project, links **SQL Editor**, **New query**.
2. Open in de repo het bestand `supabase/migrations/20261111000000_meldingen_widget.sql`, kopieer alles en plak het.
3. Klik **Run**. Er hoort "Success. No rows returned" te staan. Nog een keer draaien kan geen kwaad.

### B. Apple Developer: een sleutel voor meldingen

1. Ga naar https://developer.apple.com/account, **Certificates, IDs & Profiles**, links **Keys**, klik op het plusje.
2. Naam: bijvoorbeeld `Meldingen`. Vink **Apple Push Notifications service (APNs)** aan. Klik **Continue**, **Register**.
3. Klik **Download**. Je krijgt een bestand `AuthKey_XXXXXXXXXX.p8`. **Dit kan maar één keer.** Bewaar het op een
   veilige plek (niet in de repo, niet in een chat).
4. Noteer de **Key ID** (10 tekens, staat op die pagina en in de bestandsnaam).
5. Noteer je **Team ID**: rechtsboven onder je naam, of onder **Membership details** (10 tekens).

### C. Vercel: vijf waarden

Ga in Vercel naar het project, **Settings**, **Environment Variables**. Voeg toe (voor Production én Preview):

| Naam | Waarde |
|---|---|
| `APNS_KEY_ID` | de Key ID uit stap B4 |
| `APNS_TEAM_ID` | je Team ID uit stap B5 |
| `APNS_PRIVATE_KEY` | de hele inhoud van het `.p8`-bestand (open het met Teksteditor; inclusief de regels met BEGIN en END) |
| `APNS_BUNDLE_ID` | `nl.steinbongers.financeapp` (of je eigen bundel-id als je die hebt veranderd) |
| `NATIVE_ACTION_SECRET` | een lange willekeurige tekst. Maak hem in Terminal met `openssl rand -base64 48` |

Zet bij `APNS_PRIVATE_KEY` en `NATIVE_ACTION_SECRET` het vinkje **Sensitive** aan. Klik daarna bovenaan op
**Deployments**, de drie puntjes bij de laatste, **Redeploy**, zodat de app de nieuwe waarden leest.

Deze waarden horen nergens anders: niet in de code, niet in GitHub. De repo is openbaar.

### D. Xcode: bestanden, capability en widget

```sh
git pull
npm install
npx cap sync ios
npx cap open ios
```

**D1. Vier nieuwe bestanden aan de app toevoegen**

1. Klik met rechts op de gele map **App**, **Add Files to "App"…**.
2. Selecteer in `ios/App/App` (Cmd ingedrukt houden):
   - `NativeShared.swift`
   - `NativePushPlugin.swift`
   - `PaymentNotifications.swift`
   - `PaymentIntent.swift`
3. **Copy items if needed** uit (Reference files in place). Bij **Targets**: **App** aan. Klik **Add**.

**D2. `NativeShared.swift` ook bij de widget aanvinken**

1. Klik in de navigator op `NativeShared.swift`.
2. Open rechts het paneel **File Inspector** (het eerste tabje, een blaadje; menu View, Inspectors, File).
3. Onder **Target Membership**: vink naast **App** ook **FinanceWidget** aan.
   (Alleen dit ene bestand. De andere drie blijven alleen bij App.)

**D3. Meldingen aanzetten op de app**

1. Blauwe project **App**, target **App**, tabblad **Signing & Capabilities**.
2. **+ Capability**, kies **Push Notifications**. Er komt een regel "Push Notifications" bij.
   (Xcode zet dit in `App.entitlements` en regelt het bij Apple.)

**D4. De widget bijwerken**

Het bestand `ios/App/Widget/FinanceWidget.swift` is vernieuwd; Xcode verwijst er al naar, dus hier hoef je niets
toe te voegen. Controleer alleen bij target **FinanceWidget**, tabblad **General**: **Minimum Deployments** is
**iOS 17.0**, en bij **Signing & Capabilities** staat de App Group `group.nl.steinbongers.financeapp` aangevinkt.

**D5. Bouwen**

Kies bovenaan het schema **App** en je iPhone, klik op afspelen. Meldt Xcode een fout, kijk dan eerst onder
"Als het niet werkt" hieronder.

### E. Op je iPhone

1. Open de app, ga naar **Instellingen**, groep **Meldingen en weergave**.
2. Zet **Melding na elke betaling** aan en kies **Sta toe** bij de vraag van iOS.
3. **Verberg bedrag op vergrendelscherm** staat aan. Laat dat zo, tenzij je het bedrag ook op een vergrendeld
   scherm wilt zien.
4. Tik op **Apple Pay instellen** en volg de zes stappen. Je maakt één keer een automatisering in de app Opdrachten.
5. Widget: houd je beginscherm ingedrukt, **Wijzig**, **Voeg widget toe**, zoek de app en kies de **grote** variant.

### Testen

- **Apple Pay**: betaal iets kleins met Apple Pay. Binnen een paar seconden komt er een melding. Tik je de eerste
  keer op "Ander potje" en kies je een potje, dan stelt de app bij de volgende betaling bij die winkel dat potje voor.
- **Klopt**: houd de melding ingedrukt (of veeg naar links, **Opties**) en tik **✓ Klopt**. De app opent niet. Open
  daarna de app: de betaling staat in het potje.
- **Vergrendelscherm**: vergrendel je iPhone en laat iemand je een betaling sturen of wacht op de volgende
  ophaalronde. Op het vergrendelde scherm hoort alleen "Nieuwe betaling" te staan, tot je naar je iPhone kijkt.
- **Bank**: handmatig een ronde starten kan in GitHub, tabblad **Actions**, **Cron**, **Run workflow**. In het
  antwoord staan alleen aantallen, bijvoorbeeld `"inserted":3,"merged":1,"notified":2`. Doe dit niet vaak: het telt
  mee voor de 4 keer per dag die de bank toestaat.
- **Widget**: tik op een potje. De betaling verdwijnt en de volgende verschijnt binnen een paar seconden.

### Goed om te weten

- **Wat Apple Pay doorgeeft**: alleen winkel en bedrag. Geen kaartnummer. Het werkt alleen voor Apple Pay; pinnen
  met een pasje en iDEAL komen via de bank.
- **Bank is niet direct**: de app haalt 4 keer per dag op (rond 6, 11, 15 en 19 uur; in de zomer een uur later).
  ING toont een pinbetaling soms pas na uren. Tussen 22:00 en 07:00 komen er geen meldingen per betaling.
- **Dubbel?** Komt een Apple Pay-betaling later via de bank, dan voegt de app ze samen. Lukt dat niet (de bank
  gebruikt een heel andere naam én er waren meer betalingen van hetzelfde bedrag), dan zie je hem twee keer. Eén
  van de twee kun je dan in het potje "Niet meetellen" zetten. Meld het, dan kan de herkenning beter.
- **Betaald met een kaart die niet gekoppeld is** (bijvoorbeeld een creditcard in Apple Pay): die betaling komt
  nooit via de bank en blijft als Apple Pay-regel staan.
- **Sleutels**: elke iPhone krijgt een eigen sleutel, in de Keychain. Hij wordt vervangen elke keer dat je de app
  opent en vervalt na 30 dagen niet openen; open dan de app één keer. Uitloggen haalt hem weg.
- **Testbuild of TestFlight**: een build vanuit Xcode (afspeelknop) praat met de testomgeving van Apple, een
  TestFlight-build met de echte. De app geeft dat zelf door; je hoeft niets te kiezen.
- **Bundel-id veranderd?** Pas dan ook `appGroup` aan in `ios/App/App/NativeShared.swift`, en `APNS_BUNDLE_ID` in Vercel.

### Als het niet werkt

- **Xcode: "Cannot find 'NativeAPI' in scope" in de widget**: stap D2 is overgeslagen.
- **Xcode: "Cannot find 'NativePushPlugin' in scope"**: stap D1 is overgeslagen.
- **De rij "Melding na elke betaling" staat er niet**: je kijkt in Safari, of de nieuwe build staat nog niet op je iPhone.
- **Wel Apple Pay-meldingen, geen meldingen na de bank**: controleer de vijf waarden in Vercel (stap C) en of je
  daarna opnieuw hebt gedeployed. In het antwoord van de cron staat dan `"notified":0`.
- **De actie "Betaling indelen" staat niet in Opdrachten**: open de app één keer na het installeren en zoek opnieuw.
  Je iPhone heeft iOS 17 of nieuwer nodig.
- **Melding "Open de app een keer, dan is hij weer gekoppeld"**: de sleutel is verlopen of je bent uitgelogd.
  Open de app en log zo nodig in.
- **Widget blijft "Open de app om de widget te koppelen" tonen**: Instellingen, **Widget instellen**.

## Nog niet in de schil (volgende fase)

- **Bevestigingsmail**: de link opent in Safari. Na bevestigen log je in de app gewoon in.
- **Bankkoppeling**: ING kan de ING-app openen en daarna in Safari terugkomen in plaats van in de app.
  Dat testen we zodra de bankkoppeling werkt; de oplossing is een universal link naar de app.
- **Naam en icoon** zijn tijdelijk ("Finance", blauw potje) tot de echte naam er is.
- **Meestgebruikte potjes als knoppen in de melding zelf** (nu: "Ander potje" opent de app op dat kaartje).
