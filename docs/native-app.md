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

## Nog niet in de schil (volgende fase)

- **Pushmeldingen**: webpush werkt niet in een app-schil. Hiervoor komt native push via Apple (APNs).
- **Bevestigingsmail**: de link opent in Safari. Na bevestigen log je in de app gewoon in.
- **Bankkoppeling**: ING kan de ING-app openen en daarna in Safari terugkomen in plaats van in de app.
  Dat testen we zodra de bankkoppeling werkt; de oplossing is een universal link naar de app.
- **Naam en icoon** zijn tijdelijk ("Finance", blauw potje) tot de echte naam er is.
