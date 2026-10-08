import type { Metadata } from "next";
import { CategoryBadge } from "@/components/categories/category-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Potjes" };

export default async function PotjesPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("archived", false)
    .order("sort_order", { ascending: true });

  const list = categories ?? [];

  return (
    <>
      <PageHeader title="Potjes" subtitle="Bedragen en trends volgen in fase 4" />
      <div className="px-4">
        {list.length === 0 ? (
          <EmptyState emoji="🫙" title="Nog geen potjes" description="Kies je potjes in de onboarding." />
        ) : (
          <Card padding="none" className="divide-y">
            {list.map((category) => (
              <div key={category.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                <CategoryBadge emoji={category.emoji} color={category.color} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{category.name}</p>
                  {category.is_income && <p className="text-xs text-text-muted">Inkomen</p>}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  );
}
