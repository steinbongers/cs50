import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Lijnicoon (bijvoorbeeld uit lucide-react of components/ui/icons). */
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && (
        <div
          className="mb-3 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
