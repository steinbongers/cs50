"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, useTransition } from "react";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reorderCategories, restoreCategory } from "../actions";

interface Item {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function ManageCategories({ active, archived }: { active: Item[]; archived: Item[] }) {
  const [order, setOrder] = useState(active);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setDirty(true);
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await reorderCategories(order.map((c) => c.id));
      setMessage(result.ok ? "Volgorde opgeslagen." : result.error);
      if (result.ok) setDirty(false);
    });
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      <Card padding="none">
        <ul className="divide-y">
          {order.map((item, index) => (
            <li key={item.id} className="flex min-h-14 items-center gap-3 px-3 py-2">
              <CategoryBadge icon={item.icon} color={item.color} size="sm" />
              <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`${item.name} omhoog`}
                className="flex size-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted disabled:opacity-30"
              >
                <ArrowUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`${item.name} omlaag`}
                className="flex size-10 items-center justify-center rounded-full text-text-muted hover:bg-surface-muted disabled:opacity-30"
              >
                <ArrowDown size={18} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {message && <p className="px-1 text-sm text-text-muted">{message}</p>}
      <Button onClick={save} disabled={!dirty} loading={isPending} fullWidth>
        Volgorde opslaan
      </Button>

      {archived.length > 0 && (
        <Card padding="none">
          <p className="px-4 py-3 text-sm text-text-muted">Gearchiveerd</p>
          <ul className="divide-y border-t">
            {archived.map((item) => (
              <li key={item.id} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <CategoryBadge icon={item.icon} color={item.color} size="sm" className="opacity-60" />
                <span className="min-w-0 flex-1 truncate text-text-muted">{item.name}</span>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await restoreCategory(item.id); })}
                  className="min-h-10 text-sm font-medium text-primary"
                >
                  Terugzetten
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
