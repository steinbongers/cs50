import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { APP_DESCRIPTION, APP_NAME, SUPPORT_EMAIL } from "@/config/app";
import pkg from "@/package.json";

export const metadata: Metadata = { title: `Over ${APP_NAME}` };

export default function OverPage() {
  const year = new Date().getFullYear();
  return (
    <>
      <PageHeader title={`Over ${APP_NAME}`} backHref="/instellingen" />
      <div className="flex flex-col gap-4 px-4">
        <Card className="flex flex-col gap-2">
          <p>{APP_DESCRIPTION}</p>
          <p className="text-sm text-text-muted">
            Jij beslist in welk potje elke uitgave hoort. De app stelt niets voor en deelt niets automatisch in.
          </p>
        </Card>

        <Card padding="none" className="divide-y text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="text-text-muted">Versie</span>
            <span className="font-medium tabular-nums">{pkg.version} (pilot)</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-text-muted">Contact</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-primary">
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-text-muted">Privacy</span>
            <Link href="/privacy" className="font-medium text-primary">
              Hoe we met je gegevens omgaan
            </Link>
          </div>
        </Card>

        <p className="text-center text-xs text-text-muted">
          © {year} {APP_NAME}. Alle rechten voorbehouden.
        </p>
      </div>
    </>
  );
}
