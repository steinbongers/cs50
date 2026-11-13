# Teksten: woordenlijst en herschrijftabel (12 november 2026)

Regelnummers zijn van commit 0217282 en kunnen verschuiven; zoek op de huidige tekst. SCHRAPPEN betekent: weg,
zonder vervanging. Waar dit botst met `BRIEF.md`, wint de BRIEF (o.a.: het tabblad blijft "Swipen", `APP_NAME`
blijft staan).

Regels voor elke tekst: hooguit één korte zin (liefst onder 12 woorden), spreektaal, je-vorm, geen jargon, geen
uitleg van wat de knop al zegt, geen em-streepjes.

## Woordenlijst

1. **Potje**: waar een kaartje in gaat.
2. **Kaartje**: één bedrag van je bank, in of uit. "Betaling" alleen in de Apple Pay-melding. "Transactie" nooit in
   beeld, behalve als naam van de Apple-automatisering.
3. **Stapel**: de kaartjes die nog geen potje hebben.
4. **Indelen**: een kaartje in een potje zetten (in lopende tekst; het tabblad blijft Swipen).
5. **Later**: kaartje achteraan de stapel.
6. **Nog over**: wat je deze maand nog kunt uitgeven. Vóór de eerste hele maand: "Over per maand". Het woord
   "vrij" verdwijnt.
7. **Vaste kosten / Vaste inkomsten**: wat elke maand terugkomt. De knop op Swipen heet "Elke maand".
8. **Altijd in dit potje**: iemand die automatisch wordt ingedeeld. Nooit meer "vaste ontvanger".
9. **Telt niet mee**: toestand. De knoppen blijven "Niet meetellen" en "Toch meetellen".
10. **Geld terug**: alles rond voorschieten en terugkrijgen. De schakelaar blijft "Ik krijg een deel terug".
11. **Spaarpotje**: potje dat als gespaard telt.
12. **Maand**: van salarisdag tot salarisdag, zonder verdere toelichting.

Ook: "we" in plaats van "wij" of "de app"; "iPhone" in plaats van telefoon of toestel; "naam" in lijsten, "winkel"
alleen bij Apple Pay.

Niet meer in beeld: vrij, vaste post, vaste lasten, vaste ontvanger, tegenpartij, verkoper, transactie, hoofdscherm,
"de app" als onderwerp.

## Apple Pay instellen (`app/(app)/instellingen/apple-pay/page.tsx`)

Bovenaan: "Krijg meteen na het betalen een melding. Je stelt dit één keer in."

De titel van een stap is de ene tik die telt; eronder hooguit één korte zin. Namen van knoppen vet en letterlijk.

| Stap | Titel | Tekst eronder |
|---|---|---|
| 1 | Open **Opdrachten** | Tik op **Automatisering** en dan op **+**. |
| 2 | Kies **Transactie** | Die staat onderaan de lijst. |
| 3 | Vink je kaart aan | Kies **Voer direct uit**, zet **Meld bij uitvoeren** uit en tik op **Volgende**. |
| 4 | Tik op **Nieuwe lege automatisering** | Zoek **Betaling indelen** en tik erop. |
| 5 | Vul de drie velden | Tik op een veld, kies **Invoer opdracht** en dan de naam hieronder. |
| 6 | Tik op **Gereed** | Bij je volgende betaling krijg je een melding. |

Onder stap 5 drie regels als mini-lijst: **Winkel** wordt Winkel; **Bedrag** wordt Bedrag; **Kaart** (achter het
pijltje) wordt Kaart of pas.

Let op: neem de knopnamen over zoals ze nu in de pagina staan als die afwijken van deze tabel; ze zijn niet op een
iPhone nagelopen.

Onder de stappen blijven twee regels: "We krijgen alleen winkel, bedrag en kaartnaam, geen kaartnummer." en
"Stoppen? Verwijder de automatisering in Opdrachten." De alinea's over iDEAL, samenvoegen en de
creditcardafrekening gaan weg.

## Herschrijftabel

### Bouwer A (Overzicht, inzicht, vaste maand, potjes)

| Bestand:regel | Huidig | Nieuw |
|---|---|---|
| `components/fixed/fixed-picker.tsx:261` | Wat later in de maand nog komt, of per jaar of kwartaal, staat er niet bij. Voeg het zelf toe... | Mist er iets? Voeg het zelf toe. |
| `fixed-picker.tsx:203` | Er staan nog geen betalingen van {periode} in de app. Haal ze op... | Haal eerst je kaartjes op. |
| `fixed-picker.tsx:204` | Koppel eerst je bank. Dan staan hier je betalingen sinds je laatste salaris... | Koppel eerst je bank, of voeg zelf iets toe. |
| `fixed-picker.tsx:256` | Zelf een post toevoegen | Zelf toevoegen |
| `fixed-picker.tsx:270` | {€} erin, {€} eruit | SCHRAPPEN |
| `fixed-picker.tsx:272` | Vrij per maand {€} | Over per maand {€} |
| `components/overview/month-left-card.tsx:27` | Weet wat je vrij hebt / Tik aan wat elke maand terugkomt | Zie wat je over hebt / Kies je vaste kosten |
| `month-left-card.tsx:36` | Nog over tot de 25e / Vrij per maand | Nog over / Over per maand |
| `month-left-card.tsx:38` | {€} erin, {€} vast eruit, {€} verder uitgegeven | SCHRAPPEN |
| `month-left-card.tsx:39` | Je eerste hele maand begint op {datum} | Je maand begint op {datum} |
| `app/(app)/overzicht/page.tsx:114` | Dan start je eerste hele maand in de app, van salaris tot salaris. Een halve maand zegt nog weinig... | Dan begint je eerste hele maand. |
| `overzicht/page.tsx:318` | Bank gekoppeld. Nieuwe betalingen komen vanzelf binnen. | Bank gekoppeld. |
| `overzicht/page.tsx:330` | Koppel je bank, dan komen je betalingen vanzelf binnen als kaartjes. | Koppel je bank, dan komen je kaartjes vanzelf. |
| `overzicht/page.tsx:336` | Alleen meekijken. Wij kunnen nooit geld overmaken. | We kijken alleen mee. |
| `overzicht/page.tsx:378` | Eerst je kaartjes indelen, dan zie je hier je maand. | Deel eerst je kaartjes in. |
| `overzicht/page.tsx:492`, `vaste-lasten/page.tsx:26` | Vaste lasten en abonnementen | Vaste kosten |
| `overzicht/vaste-lasten/page.tsx:56` | Herkend aan betalingen die in minstens twee van de laatste drie maanden terugkwamen... | Herkend omdat het elke maand terugkomt. |
| `components/overview/free-to-spend.tsx:68` | Een schatting. Vaste lasten herkennen we aan... | Een schatting. |
| `components/overview/overview-copy.ts:83` | Vrij tot de {dag}e | Nog over tot de {dag}e |
| `overview-copy.ts:88` | Je betaalt {€} per maand aan {n} vaste lasten. | {€} per maand aan vaste kosten. |
| `overview-copy.ts:61` | Je eerste maand. Vanaf volgende maand zie je hier je gemiddelde. | Volgende maand zie je hier je gemiddelde. |
| `components/overview/streak-chip.tsx:10` | Eén dag overgeslagen, je reeks blijft gewoon staan. | Eén dag missen mag. |
| `components/overview/income-view.tsx:57` | Je hebt nog geen inkomstenpotje. Maak er een, dan zie je hier wat er binnenkomt. | Maak een inkomstenpotje om te zien wat binnenkomt. |
| `income-view.tsx:162` | {€} binnengekomen zit nog in geen potje | {€} binnengekomen, nog niet ingedeeld |
| `app/(app)/overzicht/inzicht/page.tsx:157` | Inkomsten en uitgaven per maand. Sparen telt niet als uitgave. {Maand} loopt nog. | Inkomsten en uitgaven per maand. |
| `inzicht/page.tsx:193` | Per maand, elk potje op een eigen schaal. Rechts: {maand} tot nu. | SCHRAPPEN |
| `inzicht/page.tsx:214` | Opgeteld per dag, tegenover je gemiddelde op dezelfde dag. | Vergeleken met je gemiddelde. |
| `inzicht/page.tsx:247` | Gemiddeld per dag, deze en de vorige drie maanden. | SCHRAPPEN |
| `inzicht/page.tsx:317` | Per maand, tegenover wat je gemiddeld uitgeeft. | SCHRAPPEN |
| `inzicht/page.tsx:307` | Nog geen vaste lasten gevonden. Betalingen die elke maand terugkomen, zie je hier vanzelf. | Nog geen vaste kosten gevonden. |
| `components/insights/insight-copy.ts:52` | Inkomsten − uitgaven + uit je spaarpot: {€} over | {€} over |
| `insight-copy.ts:53` | {€} meer uitgegeven dan binnenkwam, ook met wat uit je spaarpot kwam | {€} meer uitgegeven dan binnenkwam |
| `insight-copy.ts:84` | Gemiddeld geef en spaar je {€} per maand meer dan er binnenkomt | Gemiddeld gaat er {€} per maand meer uit dan erin |
| `insight-copy.ts:111` | Vaste lasten zijn {n}% van je uitgaven | Vaste kosten zijn {n}% van je uitgaven |
| `app/(app)/potjes/[id]/transaction-sheet.tsx:70` | Dan telt dit kaartje niet mee in je maand, Overzicht en potjes. Terugzetten kan bij Alle kaartjes. | Dan telt dit kaartje niet mee. |

### Bouwer B (Swipen, transacties)

| Bestand:regel | Huidig | Nieuw |
|---|---|---|
| `app/(app)/swipen/coach-tip.tsx:13` | Tik op het potje waar hij hoort. Ingedrukt houden: die ontvanger gaat er voortaan altijd in. | Tik op het potje waar hij hoort. |
| `coach-tip.tsx:18` | Je hebt {5} seconden. Geen zin in deze? Tik op Later. | Tik op Ongedaan maken, of op Later als je twijfelt. |
| `coach-tip.tsx:23` | Zet 'Ik krijg een deel terug' aan. Wat terugkomt, gaat er vanzelf af. | Zet 'Ik krijg een deel terug' aan. |
| `app/(app)/swipen/sort-screen.tsx:1180` | Je houdt bij wat terugkomt | SCHRAPPEN |
| `sort-screen.tsx:1204` | Vast | Elke maand |
| `sort-screen.tsx:1195` | Vaste post, tik om weg te halen / Maak hier een vaste post van | Komt elke maand terug, tik om uit te zetten / Dit komt elke maand terug |
| `sort-screen.tsx:532` | {naam} is nu een vaste post van {€} per maand | {naam} komt nu elke maand terug |
| `sort-screen.tsx:533` | {naam} is geen vaste post meer | {naam} komt niet meer elke maand terug |
| `sort-screen.tsx:912` | Een vaste ontvanger gaat zonder geld terug. Zet de schakelaar eerst uit. | Zet eerst 'Ik krijg een deel terug' uit. |
| `sort-screen.tsx:1291` | Verdelen gaat zonder geld terug. Zet de schakelaar eerst uit. | Zet eerst 'Ik krijg een deel terug' uit. |
| `sort-screen.tsx:770` | {€} was al ingedeeld. De rest ligt klaar. | {€} was al ingedeeld, de rest ligt klaar. |
| `app/(app)/swipen/transaction-card.tsx:65` | Verdeel over je potjes met Verdelen | Tik op Verdelen |
| `app/(app)/swipen/page.tsx:55` | Zonder potjes valt er niets te kiezen. Dat is zo gebeurd. | SCHRAPPEN |
| `swipen/page.tsx:74` | Zodra je bank gekoppeld is, ligt hier je eerste stapel. | Koppel je bank voor je eerste stapel. |
| `swipen/page.tsx:91` | Alles zit in een potje. Nieuwe kaartjes komen vanzelf. | Alles zit in een potje. |
| `app/(app)/swipen/refund-sheet.tsx:63` | Dan gaat het alleen van je totaal af, niet van een potje. | Dan gaat het alleen van je totaal af. |
| `app/(app)/swipen/settle-sheet.tsx:268` | Dan kies je zelf een potje waar het van af gaat, of zonder potje. | Dan kies je zelf een potje. |
| `app/(app)/transacties/transaction-sheet.tsx:74` | Dit kaartje ligt nog op de stapel. Daar kies je het potje, en deel je het als je geld terugkrijgt. | Dit kaartje ligt nog op je stapel. |
| `transacties/transaction-sheet.tsx:166` | Dit kaartje telt niet mee in je maand, Overzicht en potjes. | Dit kaartje telt niet mee. |
| `transacties/transaction-sheet.tsx:178` | Dan telt het nergens mee. Terugzetten kan altijd hier. | Dan telt het niet mee. |
| `app/(app)/transacties/page.tsx:136` | Je ziet de nieuwste 50. Zoek of kies een maand voor meer. | Zoek of kies een maand voor oudere kaartjes. |

### Bouwer C (Instellingen, bank, onboarding, meldingen, widget)

| Bestand:regel | Huidig | Nieuw |
|---|---|---|
| `app/(app)/instellingen/apple-pay/page.tsx:55` | Je bank geeft een betaling pas na uren door. Met Apple Pay kan het meteen... | Krijg meteen na het betalen een melding. Je stelt dit één keer in. |
| `apple-pay/page.tsx:13-38` | zes stappen | zie het Apple Pay-deel hierboven |
| `apple-pay/page.tsx:84` | Wat de app krijgt: de winkel, het bedrag en de naam van de kaart... | We krijgen alleen winkel, bedrag en kaartnaam, geen kaartnummer. |
| `apple-pay/page.tsx:88` | Dit werkt alleen voor betalingen met Apple Pay. Pin je met je pasje of betaal je met iDEAL... | SCHRAPPEN |
| `apple-pay/page.tsx:93` | Betaal je met een creditcard, dan schrijft je bank één keer per maand het totaal af... | SCHRAPPEN |
| `apple-pay/page.tsx:97` | Stoppen? Verwijder de automatisering in Opdrachten (veeg hem naar links), of zet Melding na elke betaling uit... | Stoppen? Verwijder de automatisering in Opdrachten. |
| `apple-pay/status.tsx:38` | Dit kan alleen in de iPhone-app. Open de app op je iPhone en kom hier terug. | Dit kan alleen in de iPhone-app. |
| `apple-pay/status.tsx:40` | Zet eerst meldingen aan op deze iPhone. Zonder melding zie je de betaling niet. | Zet eerst meldingen aan. |
| `apple-pay/status.tsx:42` | Deze iPhone is klaar. Volg de stappen hieronder. | Deze iPhone is klaar. |
| `apple-pay/cards.tsx:22` | Na je eerste betaling met Apple Pay staat hier je kaart. Dan kun je aangeven of het een creditcard is. | Je kaart verschijnt hier na je eerste betaling. |
| `apple-pay/cards.tsx:44` | Creditcard: komt per maand via je bank / Betaalpas: komt ook via je bank | Creditcard / Betaalpas |
| `app/bank/koppelen/bank-picker.tsx:51` | De app haalt ook je betalingen sinds je laatste salaris op (of de maand ervoor...)... | Wat ouder is, komt niet op je stapel. |
| `app/bank/koppelen/page.tsx:91` | Je logt in bij je eigen bank en geeft toestemming om mee te kijken. Wij kunnen nooit geld overmaken... | Je logt in bij je eigen bank. We kijken alleen mee. |
| `app/bank/koppelen/page.tsx:139` | Je koppelt één bank, met al je rekeningen daar. Geld dat je naar jezelf overmaakt, slaan we over. | SCHRAPPEN |
| `app/bank/koppelen/how-it-works.tsx:31` | Geld overmaken kan niet. Je inloggegevens zien we nooit: die typ je alleen bij je bank. | We kunnen niets overmaken en zien je wachtwoord nooit. |
| `how-it-works.tsx:37` | Dat doe je in de app of op de site van je eigen bank. Die toestemming geldt {N} dagen... | Dat doe je bij je eigen bank, en af en toe opnieuw. |
| `how-it-works.tsx:48` | Enable Banking haalt de gegevens bij je bank op en geeft ze door... | Enable Banking, een Fins bedrijf onder toezicht, haalt je gegevens op. |
| `app/onboarding/bron/page.tsx:12` | Af en toe vraagt je bank opnieuw om toestemming. Wij laten het je op tijd weten. | Je bank vraagt af en toe opnieuw toestemming. |
| `app/bank/koppelen/start-from-today.tsx:42` | Haalt alle open kaartjes van vóór vandaag van je stapel. Ze tellen nergens mee... | Oudere kaartjes gaan van je stapel en tellen niet mee. |
| `app/bank/koppelen/import-earlier.tsx:40` | Handig als je geld terugkrijgt voor iets van vóór de app. Dubbele kaartjes komen er niet bij. | Handig als je nog geld terugkrijgt van vroeger. |
| `app/bank/koppelen/connection-card.tsx:79` | De laatste keer verversen lukte niet. We proberen het vanzelf opnieuw. | Verversen lukte niet, we proberen het opnieuw. |
| `lib/bank/import-from.ts:12` | Zo ver gaan de meeste banken terug | SCHRAPPEN |
| `app/onboarding/vast/page.tsx:17` | Dit ging er in en uit van {periode}. Tik aan wat elke maand terugkomt, dan weet je wat je vrij hebt. | Tik aan wat elke maand terugkomt. |
| `app/(app)/instellingen/vaste-maand/page.tsx:14` | Tik aan wat elke maand terugkomt. Daarmee rekent de app uit... De lijst loopt van {periode}. | Tik aan wat elke maand terugkomt. |
| `app/(app)/instellingen/page.tsx:63` | Vaste ontvangers / Potje ingedrukt gehouden: gaat er altijd in | Altijd in een potje (hint weg) |
| `instellingen/page.tsx:71` | Vaste kosten en inkomsten: wat je vrij hebt | Je vaste kosten en inkomsten |
| `instellingen/vaste-ontvangers/page.tsx:44` | Houd op het hoofdscherm een potje ingedrukt, dan gaat die ontvanger voortaan altijd daarin... | Houd bij het indelen een potje ingedrukt om iemand toe te voegen. |
| `instellingen/groepen/page.tsx:40` | Deel je vaak met dezelfde mensen? Maak een groep. Bij "Ik krijg een deel terug" kies je hem met één tik. | Deel je vaak met dezelfde mensen? Maak een groep. |
| `instellingen/profile-settings.tsx:161` | Valt die dag in het weekend? Dan tellen we vanaf de vrijdag ervoor. | In het weekend telt de vrijdag ervoor. |
| `app/onboarding/salarisdag/salary-day-form.tsx:105` | zelfde zin | In het weekend telt de vrijdag ervoor. |
| `app/onboarding/salarisdag/page.tsx:15` | Daar begint je maand. Zo zie je wat je met dít salaris doet. | Daar begint je maand. |
| `app/onboarding/potjes/page.tsx:43` | Zet uit wat je niet gebruikt. Naam, icoon en kleur pas je later nog aan. | Zet uit wat je niet gebruikt. |
| `app/onboarding/klaar/page.tsx:44` | {n} kaartjes wachten op je. Eén tik per kaartje. | {n} kaartjes wachten op je. |
| `components/native/payment-settings.tsx:110` | hint: Bedrag en winkel pas na ontgrendelen | SCHRAPPEN |
| `components/native/widget-setup-row.tsx:76` | Kaartjes en vrij geld op je beginscherm | Je kaartjes en wat je over hebt |
| `components/push/push-toggle.tsx:120` | Op de iPhone werkt dit als je de app op je beginscherm zet. Tik op Delen en kies Zet op beginscherm. | Zet de app eerst op je beginscherm. |
| `lib/push/payment-copy.ts:38-39` | Klopt het voorgestelde potje? Ontgrendel om te kijken. / In welk potje? Ontgrendel om te kijken. | Ontgrendel om hem in te delen. (beide) |
| `payment-copy.ts:45` | {Potje}? Tik op Klopt, of kies een ander potje. | {Potje}? Tik op Klopt. |
| `payment-copy.ts:46` | In welk potje? Kies er een, of bewaar hem voor later. | In welk potje? |
| `payment-copy.ts:51` | Ze liggen klaar op je stapel. Even indelen? | Ze liggen op je stapel. |
| `ios/App/Widget/FinanceWidget.swift:167` | Vrij tot de {dag}e | Nog over tot de {dag}e |
| `FinanceWidget.swift:169, 390` | Vrij te besteden | Nog over |
| `FinanceWidget.swift:393` | Stel je salarisdag in | Kies je vaste kosten in de app |
| `FinanceWidget.swift:224` | In een potje zetten | Indelen |
| `FinanceWidget.swift:330-332` | Alles in een potje / Je stapel is leeg. | Stapel leeg (tweede regel SCHRAPPEN) |
| `FinanceWidget.swift:467-468` | Kaartjes en vrij geld / Hoeveel kaartjes er nog liggen en wat je vrij hebt tot je salaris... | Kaartjes en Nog over / Je kaartjes en wat je nog over hebt. |
