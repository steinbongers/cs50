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
| `--muted`     | `#7b8194` | `--text-muted`                     |
| `--border`    | `#ebedf1` | `--border`                         |
| `--green` / `--green-bg` | `#00915a` / `#e2f6ec` | `--positive` / `--positive-soft` |
| `--red` / `--red-bg`     | `#d43d51` / `#fdeaec` | `--negative` / `--negative-soft` |
| `--amber` / `--amber-bg` | `#b76e00` / `#fdf3e0` | `--accent` / `--accent-soft`     |
| `--shadow`    | zachte dubbele schaduw | `--shadow-elev`            |
| lettertype    | Inter     | Inter via `next/font`              |

Dark mode heeft dezelfde tokens met eigen waarden (systeemvoorkeur, of handmatig via
`data-theme="dark|light"` op `<html>`, opgeslagen in `localStorage.theme`).

## Potjespalet

Tien zachte kleuren (`--cat-*` en `--cat-*-soft`): blauw, indigo, paars, roze, rood,
oranje, geel, groen, mint, grijs. In de database staat alleen de sleutel (`color`),
de kleur zelf staat in CSS. Zie `lib/categories/palette.ts`.

## Open punt

`#0075ff` met witte tekst heeft een contrast van ±4,2:1, net onder WCAG AA (4,5:1) voor
normale tekst. Het staat nu bewust op de Voorgeschoten-kleur. Wil je strikt AA op de
primaire knop, verander dan `--primary` in `#006be8` (4,9:1) of gebruik `--primary-strong`.
