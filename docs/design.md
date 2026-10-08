# Design tokens

Alle kleuren staan als CSS-variabelen in `app/globals.css` en worden via `@theme inline`
aan Tailwind gekoppeld. Componenten gebruiken alleen tokenklassen (`bg-surface`,
`text-text-muted`, `bg-primary`, …), nooit losse hexcodes.

## Herkomst: Voorgeschoten

De waarden komen uit de live stylesheet van voorgeschoten.com (`:root`-variabelen):

| Voorgeschoten | Waarde    | Token hier                         |
|---------------|-----------|------------------------------------|
| `--accent`    | `#0075ff` | `--primary`                        |
| `--accent-dark` | `#005fd1` | `--primary-strong` (hover/pressed) |
| `--blue-bg`   | `#e7f1ff` | `--primary-soft`                   |
| `--bg`        | `#f6f7f9` | `--bg`                             |
| `--card`      | `#ffffff` | `--surface`                        |
| `--ink`       | `#131417` | `--text`                           |
| `--muted`     | `#7b8194` | `--text-muted` = **`#6b7183`** (afwijking: donkerder voor AA-contrast, 4,9:1 op wit en 4,5:1 op `--bg`) |
| `--border`    | `#ebedf1` | `--border`                         |
| `--green` / `--green-bg` | `#00915a` / `#e2f6ec` | `--positive` / `--positive-soft` |
| `--red` / `--red-bg`     | `#d43d51` / `#fdeaec` | `--negative` / `--negative-soft` |
| `--amber` / `--amber-bg` | `#b76e00` / `#fdf3e0` | `--accent` / `--accent-soft`     |
| `--shadow`    | zachte dubbele schaduw | `--shadow-elev`            |
| lettertype    | Inter     | Inter via `next/font`              |

Eigen aanvullingen (afwerkronde):

| Token | Licht | Donker | Waarvoor |
|-------|-------|--------|----------|
| `--accent-strong` | `#8f5600` | `#e0a63c` | Kleine amberkleurige tekst en de badge op Swipen. `#b76e00` haalt op wit en op `--accent-soft` geen 4,5:1; dit wel. Grote vlakken en iconen blijven `--accent`. |
| `--border-strong` | `#c9cdd6` | `#3a404c` | Lege keuzerondjes, het spoor van een uitgezette schakelaar en het spoor van de doelring. `--border` valt daar weg op wit. |

Dark mode heeft dezelfde tokens met eigen waarden (systeemvoorkeur, of handmatig via
`data-theme="dark|light"` op `<html>`, opgeslagen in `localStorage.theme`).

### Donker: kaarten zichtbaar houden

- `--surface` is in donker `#1a1d24` (was `#171a20`), iets lichter dan `--bg` `#0f1115`.
- `--shadow-elev` (Tailwind `shadow-card`) krijgt in donker een binnenrand
  `0 0 0 1px rgba(255,255,255,0.06) inset`. Een schaduw valt op zwart weg; de rand niet.
- Beide donkerblokken (systeemvoorkeur en `data-theme="dark"`) houden dezelfde waarden.

## Maatregels

| Wat | Maat |
|-----|------|
| Raster | 4 en 8 px (Tailwind-stappen 1, 2, 3, 4, 6 …) |
| Radius kaart | 20 px (`rounded-card`); groot paneel 24 (`rounded-card-lg`) |
| Radius tegel | 16 px (`rounded-2xl`) |
| Radius knop en invoer | 14 px (`rounded-control`) |
| Icoontegel in een lijst | 30 px, radius 8 |
| Schakelaar | 51 × 31, knop 27 (compact 44 × 26, knop 22) |
| Tikvlak | altijd ≥ 44 × 44 px (`min-h-11`, `size-11`) |
| Lijstrij | ≥ 52 px hoog |

### Typeschaal (grootte / regelhoogte in px)

| Rol | Maat | Tailwind |
|-----|------|----------|
| Groot getal, paginatitel | 28 / 34 | `text-[28px] leading-[34px]` |
| Kop | 22 / 28 | `text-[22px] leading-7` |
| Tekst groot, lijstlabel | 17 / 22 | `text-[17px] leading-[22px]` |
| Tekst | 15 / 20 | `text-[15px] leading-5` |
| Klein, groepskop | 13 / 18 | `text-[13px] leading-[18px]` |
| Mini, tabbalk | 11 / 13 | `text-[11px] leading-[13px]` |

### Beweging

- Duur: **150 ms** (kleine feedback, knopdruk), **200 ms** (schakelaar, segment, balk),
  **280 ms** (panelen, kaart). Easing `ease-out-soft`.
- **Reduced motion:** niets schuift of veert. Alleen fades van 120 ms. `app/globals.css`
  zet bij `prefers-reduced-motion: reduce` alle CSS-overgangen op nul; Framer Motion-onderdelen
  lezen `useReducedMotion()` en vallen terug op een fade van 0,12 s (zie `Sheet`).

## Safe area

`safe-top` en `safe-bottom` zetten alleen de notch- en thuisbalkruimte. Wil je er vaste ruimte bij,
gebruik dan `safe-top-2`, `safe-top-3` (en `safe-bottom-5`): dat is `env(safe-area-inset-top)` plus de
Tailwind-stap in één `padding-top`. `safe-top pt-3` samen werkt niet betrouwbaar, want beide zetten
`padding-top` en de volgorde in de CSS bepaalt wie wint. Paginakoppen beginnen op `safe-top-2` met een
regel van `min-h-11` (Overzicht, Instellingen, potje-detail, `PageHeader`); Swipen op `safe-top-3`.

## Potjesnamen op tegels

Chromium heeft geen Nederlands afbreekwoordenboek, dus `hyphens-auto` breekt daar midden in een woord.
Tegels tonen de naam via `tileName()` (`lib/categories/display.ts`), die zachte afbreekstreepjes in de
lange woorden van de standaardset zet, met `hyphens-manual`. De naam heeft `shrink-0`, zodat flexbox
een naam van twee regels nooit indrukt (optelsom tegel: 6 + 28 + 26 + 12 + 4 = 76 van 80 px).

## Compacte variant (lage schermen)

`app/globals.css` definieert `@custom-variant compact (@media (max-height: 700px));`.
Schrijf `compact:h-16` of `compact:hidden` voor schermen als de iPhone SE (375 × 667).
Staat op Swipen de verdeelregel open (+52 px), dan zijn de tegels compact 60 px, zodat er niets scrolt.

## Gedeelde componenten (`components/ui/`)

| Component | API |
|-----------|-----|
| `Button`, `ButtonLink` | `variant` (`primary`, `secondary`, `ghost`, `danger`), `size` (`md`, `lg`), `fullWidth`, `loading`, `className` |
| `Card` | `padding` (`none`, `md`, `lg`), `elevated`, `className` |
| `Sheet` | `open`, `onClose`, `title`, `description?`, `className?` (paneel), `bodyClassName?` (inhoud) |
| `ProgressBar` | `value`, `max`, `label?`, `tone?`, `size?` (`md` = 8 px, `sm` = 4 px / `h-1`), `className?` |
| `BudgetBar` | `ratio` (0–1, begrensd), `over?` (vulling wordt `bg-accent`, nooit rood), `colorClass?` (bijv. `bg-cat-groen`), `className?`. `aria-hidden`: zet de stand als tekst ernaast |
| `Switch` | `checked`, `onCheckedChange(checked)`, `label` (toegankelijke naam), `disabled?`, `size?` (`md`, `sm`), `id?`, `className?`. `role="switch"`, aan `bg-positive`, uit `bg-surface-muted`, 200 ms |
| `Segmented` | `options: {value, label}[]`, `value` (mag leeg: niets gekozen), `onChange(value)`, `ariaLabel`, `className?`. Radiogroep met pijltjestoetsen |
| `ListGroup` | `title?`, `children`, `className?`. Kop 13 px, daaronder `Card padding="none"` |
| `ListRow` | `icon?` (lucide-component), `iconClass?`, `label`, `value?`, `href?` (link met chevron), `onClick?` (knop), `danger?`, `trailing?` (bijv. een `Switch`), `className?`. Scheidingslijn begint bij het label |
| `EmptyState` | `icon?` (28 px in een cirkel van 56), `title`, `description?` (één regel), `action?` (maximaal één), `footnote?` |
| `CategoryBadge` (`components/categories/`) | `icon`, `color`, `size?`: `sm` 32, `row` 36 (lijstrijen Overzicht), `md` 40, `header` 44 (kop potje-detail), `lg` 56 |
| `NoteField` (`components/transactions/`) | `transactionId`, `initialNote`, `onSaved?`. Notitie tot 140 tekens, teller vanaf 120; gedeeld door swipen, potje-detail en `/transacties`. Geef een `key` per transactie |
| `PageHeader` | grote titel 28/34, `tracking-[-0.02em]`, `subtitle?`, `backHref?`, `action?` |

## Haptiek (`lib/haptics.ts`)

`tap()` (8 ms) bij elke keuze, `success()` (`[10,40,10,40,16]`) bij een lege stapel,
`warning()` (`[6,30,6]`). Uit te zetten met `setHapticsEnabled(false)`
(`localStorage.haptics = "off"`), uit te lezen met `hapticsEnabled()`. Werkt alleen waar
`navigator.vibrate` bestaat (niet in iOS Safari); in de Capacitor-schil komt `@capacitor/haptics`.

## Bedragen (`lib/format.ts`)

- `formatEuro`: `€ 12,50`, negatief `− € 12,50` (echte minus U+2212 en een vaste spatie), nul `€ 0,00`.
- `formatEuroWhole`: `€ 1.250`, negatief `− € 12`.
- `formatSignedEuro`: `+ € 12,50` / `− € 12,50`.
- `formatEuroAbs`: zonder teken, voor naast een kleur.

## Potjesiconen

Potjes hebben een lijnicoon uit lucide-react (`lib/categories/icons.ts`), in de potjeskleur op
het zachte kleurvlak. In de database staat de sleutel (`icon`), bijvoorbeeld `shopping-cart`.
lucide-react is toegevoegd omdat de gebruiker uit ruim 50 iconen moet kunnen kiezen; de bibliotheek
is tree-shakeable, dus alleen gebruikte iconen komen in de bundel.

## Potjespalet

Tien zachte kleuren (`--cat-*` en `--cat-*-soft`): blauw, indigo, paars, roze, rood,
oranje, geel, groen, mint, grijs. In de database staat alleen de sleutel (`color`),
de kleur zelf staat in CSS. Zie `lib/categories/palette.ts`.

## Open punt

`#0075ff` met witte tekst heeft een contrast van ±4,2:1, net onder WCAG AA (4,5:1) voor
normale tekst. Het staat nu bewust op de Voorgeschoten-kleur. Wil je strikt AA op de
primaire knop, verander dan `--primary` in `#006be8` (4,9:1) of gebruik `--primary-strong`.
