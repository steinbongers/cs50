import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { enoughData, partOf, tooLittleData, type Ratio } from "@/lib/admin/metrics";

/** Decimaal met komma: 3,4. */
export function decimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

export function seconds(msValue: number): string {
  return `${decimal(msValue / 1000)} s`;
}

/** "42% (7 van 9)", of "Nog te weinig data (3 gebruikers)". */
export function ratioText(r: Ratio): string {
  if (!enoughData(r.users) || r.percentage === null) return tooLittleData(r.users);
  return `${r.percentage}% (${partOf(r)})`;
}

/** Blauw = doel gehaald, amber = nog niet. Nooit rood. */
export function GoalDot({ met }: { met: boolean }) {
  return (
    <span className="inline-flex items-center">
      <span aria-hidden className={`inline-block size-2 rounded-full ${met ? "bg-primary" : "bg-accent"}`} />
      <span className="sr-only">{met ? "Doel gehaald" : "Doel nog niet gehaald"}</span>
    </span>
  );
}

/** Kaart met kop en één zin "wat zegt dit". */
export function Section({ title, says, children }: { title: string; says: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-semibold leading-[22px]">{title}</h2>
        <p className="text-[13px] leading-[18px] text-text-muted">{says}</p>
      </div>
      {children}
    </Card>
  );
}

/** Een regel tekst met optionele doelstip. */
export function Line({ children, met }: { children: ReactNode; met?: boolean | null }) {
  return (
    <p className="flex items-baseline gap-2 text-[15px] leading-5 tabular-nums">
      {met !== undefined && met !== null && <GoalDot met={met} />}
      <span>{children}</span>
    </p>
  );
}

/**
 * Noordster-tegel: waarde groot, daaronder "7 van 9" en de doelstip.
 * Bij te weinig gebruikers staat er "Nog te weinig data" in plaats van een getal.
 */
export function NorthStar({
  label,
  goal,
  value,
  detail,
  met,
  users,
}: {
  label: string;
  goal: string;
  value: string | null;
  detail: string;
  met: boolean | null;
  users: number;
}) {
  const enough = enoughData(users) && value !== null;
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-[13px] leading-[18px] text-text-muted">{label}</p>
      {enough ? (
        <p className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em] tabular-nums">{value}</p>
      ) : (
        <p className="text-[15px] font-medium leading-5 text-text-muted">{tooLittleData(users)}</p>
      )}
      <p className="flex items-center gap-2 text-[13px] leading-[18px] text-text-muted tabular-nums">
        {enough && met !== null && <GoalDot met={met} />}
        <span>{enough ? `${detail} · ${goal}` : goal}</span>
      </p>
    </Card>
  );
}
