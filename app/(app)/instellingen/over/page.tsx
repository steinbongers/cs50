import type { Metadata } from "next";
import { CircleHelp, ShieldCheck } from "lucide-react";
import { ListGroup, ListRow } from "@/components/ui/list-group";
import { PageHeader } from "@/components/ui/page-header";
import { APP_DESCRIPTION, APP_NAME, SUPPORT_EMAIL } from "@/config/app";
import pkg from "@/package.json";
import { AnchorRow, ROW_FOCUS } from "../rows";

export const metadata: Metadata = { title: `Over ${APP_NAME}` };

const VERSION = pkg.version.split(".").slice(0, 2).join(".");

export default function OverPage() {
  const year = new Date().getFullYear();
  return (
    <>
      <PageHeader title={`Over ${APP_NAME}`} backHref="/instellingen" />
      <div className="flex flex-col gap-7 px-4 pb-8">
        <div className="flex flex-col gap-1 px-1">
          <p className="text-[15px] leading-5">{APP_DESCRIPTION}</p>
          <p className="text-[13px] leading-[18px] text-text-muted">Jij beslist waar elk bedrag hoort. Wij vullen niets in.</p>
        </div>

        <ListGroup>
          <ListRow label="Versie" value={<span className="tabular-nums">{VERSION}</span>} />
          <ListRow
            href="/privacy"
            icon={ShieldCheck}
            iconClass="bg-cat-groen-soft text-cat-groen"
            label="Privacy"
            className={ROW_FOCUS}
          />
          <AnchorRow
            href={`mailto:${SUPPORT_EMAIL}`}
            icon={CircleHelp}
            iconClass="bg-cat-oranje-soft text-cat-oranje"
            label="Hulp en contact"
          />
        </ListGroup>

        <p className="text-center text-[13px] text-text-muted">
          © {year} {APP_NAME}. Alle rechten voorbehouden.
        </p>
      </div>
    </>
  );
}
