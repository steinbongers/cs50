/**
 * Vast palet van 10 potjeskleuren. De waarde is een token-sleutel; de echte
 * kleuren staan in app/globals.css (--cat-*). Zo blijven hexcodes uit componenten.
 */
export const CATEGORY_COLORS = [
  "blauw",
  "indigo",
  "paars",
  "roze",
  "rood",
  "oranje",
  "geel",
  "groen",
  "mint",
  "grijs",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function isCategoryColor(value: unknown): value is CategoryColor {
  return typeof value === "string" && (CATEGORY_COLORS as readonly string[]).includes(value);
}

/**
 * Tailwind-klassen per kleur. Volledig uitgeschreven zodat Tailwind ze kan vinden.
 */
export const CATEGORY_COLOR_CLASSES: Record<
  CategoryColor,
  { bg: string; text: string; solid: string; ring: string }
> = {
  blauw: {
    bg: "bg-cat-blauw-soft",
    text: "text-cat-blauw",
    solid: "bg-cat-blauw",
    ring: "ring-cat-blauw",
  },
  indigo: {
    bg: "bg-cat-indigo-soft",
    text: "text-cat-indigo",
    solid: "bg-cat-indigo",
    ring: "ring-cat-indigo",
  },
  paars: {
    bg: "bg-cat-paars-soft",
    text: "text-cat-paars",
    solid: "bg-cat-paars",
    ring: "ring-cat-paars",
  },
  roze: {
    bg: "bg-cat-roze-soft",
    text: "text-cat-roze",
    solid: "bg-cat-roze",
    ring: "ring-cat-roze",
  },
  rood: {
    bg: "bg-cat-rood-soft",
    text: "text-cat-rood",
    solid: "bg-cat-rood",
    ring: "ring-cat-rood",
  },
  oranje: {
    bg: "bg-cat-oranje-soft",
    text: "text-cat-oranje",
    solid: "bg-cat-oranje",
    ring: "ring-cat-oranje",
  },
  geel: {
    bg: "bg-cat-geel-soft",
    text: "text-cat-geel",
    solid: "bg-cat-geel",
    ring: "ring-cat-geel",
  },
  groen: {
    bg: "bg-cat-groen-soft",
    text: "text-cat-groen",
    solid: "bg-cat-groen",
    ring: "ring-cat-groen",
  },
  mint: {
    bg: "bg-cat-mint-soft",
    text: "text-cat-mint",
    solid: "bg-cat-mint",
    ring: "ring-cat-mint",
  },
  grijs: {
    bg: "bg-cat-grijs-soft",
    text: "text-cat-grijs",
    solid: "bg-cat-grijs",
    ring: "ring-cat-grijs",
  },
};

export function categoryColorClasses(color: string) {
  return CATEGORY_COLOR_CLASSES[isCategoryColor(color) ? color : "grijs"];
}
