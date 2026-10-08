import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Lijnicoon (bijvoorbeeld uit lucide-react of components/ui/icons). Wordt op 28px getekend. */
  icon?: ReactNode;
  /** Kop zonder punt. */
  title: string;
  /** Eén regel uitleg. */
  description?: string;
  /** Maximaal één actie (één knop of link). */
  action?: ReactNode;
  /** Kleine voetnoot onder de actie. */
  footnote?: ReactNode;
}

export function EmptyState({ icon, title, description, action, footnote }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && (
        <div
          className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary [&_svg]:size-7"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
      {footnote && <p className="mt-3 max-w-xs text-xs text-text-muted">{footnote}</p>}
    </div>
  );
}
