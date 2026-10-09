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

## Nog niet in de schil (volgende fase)

- **Pushmeldingen**: webpush werkt niet in een app-schil. Hiervoor komt native push via Apple (APNs).
- **Bevestigingsmail**: de link opent in Safari. Na bevestigen log je in de app gewoon in.
- **Bankkoppeling**: ING kan de ING-app openen en daarna in Safari terugkomen in plaats van in de app.
  Dat testen we zodra de bankkoppeling werkt; de oplossing is een universal link naar de app.
- **Naam en icoon** zijn tijdelijk ("Finance", blauw potje) tot de echte naam er is.
