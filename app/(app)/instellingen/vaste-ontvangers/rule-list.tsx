"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeRule } from "@/app/(app)/swipen/actions";
import { CategoryIcon } from "@/components/categories/category-icon";
import { ListGroup } from "@/components/ui/list-group";
import { categoryColorClasses } from "@/lib/categories/palette";
import { cn } from "@/lib/utils";

export interface RuleItem {
  id: string;
  /** In kleine letters, zoals de app de ontvanger herkent. */
  counterparty: string;
  incoming: boolean;
  categoryName: string;
  icon: string;
  color: string;
  archived: boolean;
}

export function RuleList({ items }: { items: RuleItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const visible = items.filter((i) => !removed.has(i.id));

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl bg-surface px-4 py-5 text-center text-[15px] leading-5 text-text-muted shadow-card">
        Nog geen vaste ontvangers.
      </p>
    );
  }

  function remove(id: string) {
    setError(null);
    setRemoved((prev) => new Set([...prev, id]));
    startTransition(async () => {
      const result = await removeRule(id);
      if (!result.ok) {
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <ListGroup>
        {visible.map((item) => {
          const colors = categoryColorClasses(item.color);
          return (
            <div key={item.id} className="group/row flex min-h-[60px] items-center gap-3 pl-4">
              <span
                aria-hidden
                className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-full", colors.bg, colors.text)}
              >
                <CategoryIcon icon={item.icon} size={16} strokeWidth={1.75} />
              </span>
              <span className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 self-stretch border-b border-border pr-2 group-last/row:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] leading-5 capitalize">{item.counterparty}</span>
                  <span className="block truncate text-[13px] leading-[18px] text-text-muted">
                    {item.incoming ? "Geld binnen" : "Uitgaven"} naar {item.categoryName}
                    {item.archived ? " (gearchiveerd)" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={pending}
                  aria-label={`${item.counterparty} niet meer automatisch in ${item.categoryName}`}
                  className="flex h-11 shrink-0 items-center rounded-full px-3 text-[15px] font-medium text-primary active:bg-surface-muted disabled:opacity-50"
                >
                  Weghalen
                </button>
              </span>
            </div>
          );
        })}
      </ListGroup>
      {error && (
        <p role="alert" className="px-1 text-[13px] text-negative">
          {error}
        </p>
      )}
    </>
  );
}
