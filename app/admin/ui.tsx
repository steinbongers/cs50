import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { enoughData, partOf, tooLittleData, type GoNoGoRow, type GoStatus, type Ratio } from "@/lib/admin/metrics";

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

const STATUS_LABEL: Record<GoStatus, string> = {
  go: "Go",
  grijs: "Grijs",
  nogo: "No-go",
  "te weinig data": "Te weinig data",
  "niet gemeten": "Niet gemeten",
};

const STATUS_CLASS: Record<GoStatus, string> = {
  go: "bg-primary-soft text-primary",
  grijs: "bg-surface-muted text-text",
  nogo: "bg-negative-soft text-negative",
  "te weinig data": "bg-surface-muted text-text-muted",
  "niet gemeten": "bg-surface-muted text-text-muted",
};

/** "52% (34–70%) · 12 van 23", "3,4 s", of null als er (nog) geen getal is. */
export function goValueText(row: GoNoGoRow): string | null {
  if (row.status === "niet gemeten" || row.status === "te weinig data" || row.value === null) return null;
  if (typeof row.value === "number") return seconds(row.value * 1000);
  const r = row.value;
  const ci = row.interval ? ` (${Math.round(row.interval.low * 100)}–${Math.round(row.interval.high * 100)}%)` : "";
  return `${r.percentage}%${ci} · ${partOf(r)}`;
}

/** Eén regel van de go/no-go-tabel: status, metric, waarde met interval en de drempels. */
export function GoRow({ row }: { row: GoNoGoRow }) {
  const value = goValueText(row);
  const users = row.value !== null && typeof row.value === "object" ? row.value.users : null;
  return (
    <li className="flex flex-col gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] leading-5">
          {row.label}
          {row.core && <span className="text-text-muted"> (kern)</span>}
        </p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold leading-4 ${STATUS_CLASS[row.status]}`}>{STATUS_LABEL[row.status]}</span>
      </div>
      <p className="text-[13px] leading-[18px] tabular-nums">
        {value ?? (row.status === "te weinig data" && users !== null ? tooLittleData(users) : <span className="text-text-muted">{row.status === "niet gemeten" ? "Niet uit de app te halen" : "Nog geen data"}</span>)}
      </p>
      <p className="text-[13px] leading-[18px] text-text-muted tabular-nums">
        Go {row.go} · grijs {row.grey} · no-go {row.nogo}
        {row.hint && <> · {row.hint}</>}
      </p>
    </li>
  );
}
