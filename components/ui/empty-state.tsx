import type { ReactNode } from "react";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {emoji && (
        <div className="mb-3 flex size-16 items-center justify-center rounded-full bg-surface-muted text-3xl">
          <span aria-hidden>{emoji}</span>
        </div>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 max-w-xs text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
