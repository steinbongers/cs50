import type { LucideProps } from "lucide-react";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, isCategoryIcon } from "@/lib/categories/icons";

type CategoryIconProps = Omit<LucideProps, "ref"> & { icon: string };

/** Rendert het lijnicoon van een potje; valt terug op een label-icoon bij een onbekende sleutel. */
export function CategoryIcon({ icon, ...props }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[isCategoryIcon(icon) ? icon : DEFAULT_CATEGORY_ICON];
  return <Icon aria-hidden focusable={false} strokeWidth={2} {...props} />;
}
