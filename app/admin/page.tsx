import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { APP_NAME } from "@/config/app";
import { isAdminUser } from "@/lib/admin/access";
import {
  RETENTION_WEEKS,
  STREAK_BUCKETS,
  activation,
  cohortRetention,
  connectionStats,
  enoughData,
  funnel,
  habit,
  labeledWithin7Days,
  laterRatio,
  overallRetention,
  partOf,
  potjes,
  pushOpenRate,
  ratio,
  sharing,
  startTabSplit,
  timePerCard,
  tooLittleData,
  undoRate,
  weeklyActiveUsers,
} from "@/lib/admin/metrics";
import { loadAdminData, WINDOW_DAYS } from "@/lib/admin/queries";
import { requireUser } from "@/lib/auth";
import { QUICK_SUGGESTIONS } from "@/lib/categories/defaults";
import { formatDayShort } from "@/lib/format";
import { InviteCodes } from "./invite-codes";
import { Line, NorthStar, Section, decimal, ratioText, seconds } from "./ui";

export const metadata: Metadata = { title: "Admin" };

const TAG_LABELS: Record<string, string> = {
  kaartjes: "Kaartjes (20:00)",
  "jouw-maand": "Jouw maand",
  "bank-verloopt": "Bank verloopt",
};

/**
 * Pilotcijfers: alleen geaggregeerd, nooit individuele rijen, e-mails of bedragen per gebruiker.
 * Alleen voor e-mailadressen in ADMIN_EMAILS. Admins tellen nergens mee.
 */
export default async function AdminPage() {
  const user = await requireUser();
  if (!isAdminUser(user)) notFound();

  const today = new Date();
  const data = await loadAdminData(today);
  const { events, profiles } = data;

  // Noordsterren
  const activated = activation(profiles, events, today);
  const cohorts = cohortRetention(profiles, events, today, data.churn, today.getTime() - WINDOW_DAYS * 864e5);
  const w4 = overallRetention(cohorts, 4);
  const labeled = labeledWithin7Days(data.txTimings, today);
  const labeledRatio = ratio(labeled.within, labeled.eligible, labeled.users);
  const timing = timePerCard(events);

  // Overige secties
  const steps = funnel(events, profiles);
  const weekly = weeklyActiveUsers(events, today);
  const habits = habit(events, data.streakTxs, today);
  const later = laterRatio(events);
  const undo = undoRate(events);
  const shares = sharing(events, data.shares, today);
  const pushes = pushOpenRate(events);
  const starts = startTabSplit(events);
  const pots = potjes(data.categories, data.potjeTxs, events);
  const reconnects = events.filter((e) => e.type === "bank_reconnect").length;
  const conn = connectionStats(data.connections, reconnects, today);

  const maxWeekly = Math.max(1, ...weekly.map((w) => w.activeUsers));
  const topWeekly = weekly.reduce<(typeof weekly)[number] | null>((best, w) => (w.activeUsers > 0 && (!best || w.activeUsers > best.activeUsers) ? w : best), null);
  const weeklyLabel = topWeekly
    ? `Actieve gebruikers per week, laatste twaalf weken. Meeste in de week van ${formatDayShort(topWeekly.weekStart)}: ${topWeekly.activeUsers}.`
    : "Actieve gebruikers per week, laatste twaalf weken";
  const maxStep = Math.max(1, ...steps.steps.map((s) => s.count));
  const signups = steps.steps[0]?.count ?? 0;
  const startShare = (n: number) => (starts.opens ? Math.round((n / starts.opens) * 100) : 0);
  const suggestionText = QUICK_SUGGESTIONS.map((s) => `${s.name} ${pots.suggestions[s.key] ?? 0}`).join(", ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-primary">{APP_NAME}</p>
          <h1 className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em]">Pilotcijfers</h1>
        </div>
        <Link href="/overzicht" className="inline-flex min-h-11 items-center text-[15px] font-medium text-primary">
          Naar de app
        </Link>
      </header>

      <section aria-labelledby="noordster" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 id="noordster" className="text-[17px] font-semibold leading-[22px]">
            Noordsterren
          </h2>
          <p className="text-[13px] leading-[18px] text-text-muted">Blauwe stip: doel gehaald. Amber: nog niet. Admins tellen nergens mee.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NorthStar
            label="Geactiveerd"
            goal="doel ≥ 60%"
            value={activated.percentage === null ? null : `${activated.percentage}%`}
            detail={partOf(activated)}
            met={activated.percentage === null ? null : activated.percentage >= 60}
            users={activated.users}
          />
          <NorthStar
            label="W4-retentie"
            goal="doel ≥ 40%"
            value={w4.percentage === null ? null : `${w4.percentage}%`}
            detail={partOf(w4)}
            met={w4.percentage === null ? null : w4.percentage >= 40}
            users={w4.users}
          />
          <NorthStar
            label="Binnen 7 dagen ingedeeld"
            goal="doel ≥ 85%"
            value={labeledRatio.percentage === null ? null : `${labeledRatio.percentage}%`}
            detail={partOf(labeledRatio)}
            met={labeledRatio.percentage === null ? null : labeledRatio.percentage >= 85}
            users={labeledRatio.users}
          />
          <NorthStar
            label="Mediaan tijd per kaart"
            goal="doel < 4 s"
            value={timing.medianMs === null ? null : seconds(timing.medianMs)}
            detail={`${timing.cards} kaartjes${timing.p75Ms === null ? "" : `, p75 ${seconds(timing.p75Ms)}`}`}
            met={timing.medianMs === null ? null : timing.medianMs < 4000}
            users={timing.users}
          />
        </div>
      </section>

      <Section title="Trechter" says="Hoeveel mensen elke stap van de start haalden. De grootste uitval is waar we eerst moeten kijken.">
        {signups === 0 && steps.steps.every((s) => s.count === 0) ? (
          <p className="text-[15px] text-text-muted">Nog niemand gestart.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {steps.steps.map((s) => (
              <li key={s.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[13px] leading-[18px]">
                  <span>{s.label}</span>
                  <span className="tabular-nums text-text-muted">{s.count}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${s.count === 0 ? 0 : Math.max(2, (s.count / maxStep) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {steps.biggestDrop && (
          <Line>
            Meeste uitval: {steps.biggestDrop.step.dropLabel} ({steps.biggestDrop.lost} van {steps.biggestDrop.of})
          </Line>
        )}
      </Section>

      <Section title="Gewoonte" says="Komen mensen terug zonder dat we erom vragen? Doel: mediaan 4 actieve dagen per week.">
        <div className="flex h-28 items-end gap-1" role="img" aria-label={weeklyLabel}>
          {weekly.map((w) => (
            <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-text-muted">{w.activeUsers}</span>
              <div className="flex h-16 w-full items-end">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(4, (w.activeUsers / maxWeekly) * 100)}%` }} />
              </div>
              <span className="text-[10px] tabular-nums text-text-muted">{formatDayShort(w.weekStart)}</span>
            </div>
          ))}
        </div>
        {enoughData(habits.activeUsers) && habits.medianActiveDays !== null ? (
          <Line met={habits.medianActiveDays >= 4}>
            Mediaan {decimal(habits.medianActiveDays).replace(/,0$/, "")} actieve dagen per week ({habits.activeUsers} gebruikers, laatste 4 weken)
          </Line>
        ) : (
          <Line>{tooLittleData(habits.activeUsers)}</Line>
        )}
        {enoughData(habits.streakUsers) ? (
          <Line>Streak: {STREAK_BUCKETS.map((b) => `${b} dagen: ${habits.streaks[b]}`).join(" · ")} ({habits.streakUsers} gebruikers)</Line>
        ) : (
          <Line>Streak: {tooLittleData(habits.streakUsers).toLowerCase()}</Line>
        )}
      </Section>

      <Section title="Retentie per cohort" says="Wie zich in die week registreerde en in week 1, 2, 4, 8 en 12 nog kaartjes indeelde. Verwijderde accounts tellen mee als gestopt.">
        {cohorts.length === 0 ? (
          <p className="text-[15px] text-text-muted">Nog geen gebruikers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-text-muted">
                  <th className="py-1 pr-2 font-medium">Week van</th>
                  <th className="py-1 pr-2 font-medium">Aantal</th>
                  {RETENTION_WEEKS.map((w) => (
                    <th key={w} className="py-1 pr-2 text-right font-medium">
                      W{w}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.cohortWeek} className={`border-t ${c.small ? "text-text-muted" : ""}`}>
                    <td className="py-1.5 pr-2 tabular-nums">{formatDayShort(c.cohortWeek)}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {c.size}
                      {c.churned > 0 && <span className="text-text-muted"> ({c.churned} weg)</span>}
                    </td>
                    {RETENTION_WEEKS.map((w) => {
                      const count = c.counts[w];
                      return (
                        <td key={w} className="py-1.5 pr-2 text-right tabular-nums">
                          {count === null ? (
                            <span className="text-text-muted">–</span>
                          ) : (
                            <span title={`${count.active} van ${count.eligible}`}>{c.retention[w]}%</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[13px] leading-[18px] text-text-muted">Grijs: cohort met minder dan 3 mensen, nog niet betrouwbaar.</p>
          </div>
        )}
      </Section>

      <Section title="Twijfel" says="Hoe vaak mensen een kaartje uitstellen of terugdraaien. Veel Later betekent dat een keuze lastig is.">
        <Line met={enoughData(later.users) && later.percentage !== null ? later.percentage < 15 : null}>Later per kaartje: {ratioText(later)}, doel onder 15%</Line>
        <Line>Ongedaan gemaakt: {ratioText(undo)}</Line>
      </Section>

      <Section title="Delen" says="Of ‘Ik krijg een deel terug’ gebruikt wordt, en of mensen hun geld ook echt terugkrijgen.">
        <Line>Actieve gebruikers die deelden (4 weken): {ratioText(shares.usersWithShare)}</Line>
        <Line>Binnen 14 dagen terugbetaald: {ratioText(shares.settledWithin14)}</Line>
        <Line>
          Via de bank {shares.viaBank}, buiten de bank om {shares.outsideBank}
        </Line>
      </Section>

      <Section title="Meldingen" says="Welk deel van de meldingen wordt geopend. Doel: 25% per soort.">
        {pushes.length === 0 ? (
          <Line>Nog geen meldingen verstuurd.</Line>
        ) : (
          pushes.map((p) => (
            <Line key={p.tag} met={enoughData(p.users) && p.percentage !== null ? p.percentage >= 25 : null}>
              {TAG_LABELS[p.tag] ?? p.tag}: {ratioText(p)}
            </Line>
          ))
        )}
      </Section>

      <Section title="Startscherm" says="Waar de app opent en hoeveel kaartjes er dan klaarliggen. Zo zie je of het slimme startscherm klopt.">
        {enoughData(starts.users) ? (
          <>
            <Line>
              Swipen {startShare(starts.startTab.swipen)}%, Overzicht {startShare(starts.startTab.overzicht)}%, anders {startShare(starts.startTab.anders)}% (van {starts.opens} keer openen)
            </Line>
            <Line>
              Open kaartjes bij openen: 0: {starts.openCards["0"]} · 1-5: {starts.openCards["1-5"]} · 6-20: {starts.openCards["6-20"]} · 20+: {starts.openCards["20+"]}
            </Line>
          </>
        ) : (
          <Line>{tooLittleData(starts.users)}</Line>
        )}
      </Section>

      <Section title="Potjes" says="Of de standaardpotjes passen. Boven 15% in Overig missen mensen een potje.">
        {enoughData(pots.spendUsers) && pots.overigShare !== null ? (
          <Line met={pots.overigShare <= 15}>In Overig: {pots.overigShare}% van het bedrag ({pots.spendUsers} gebruikers)</Line>
        ) : (
          <Line>In Overig: {tooLittleData(pots.spendUsers).toLowerCase()}</Line>
        )}
        <Line>
          Nieuwe potjes: {pots.created}, via een suggestie: {suggestionText}
        </Line>
        <Line>
          Eigen namen bij 2 of meer mensen:{" "}
          {pots.sharedNames.length === 0 ? "nog geen" : pots.sharedNames.map((n) => `${n.name} (${n.users})`).join(", ")}
        </Line>
        <Line>Met budget of doel: {ratioText(pots.withBudgetOrGoal)}</Line>
      </Section>

      <Section title="Bank" says="Of koppelingen blijven werken.">
        <Line>
          {conn.total} {conn.total === 1 ? "koppeling" : "koppelingen"}, {conn.expired} verlopen, {conn.reconnected} keer opnieuw gekoppeld
        </Line>
      </Section>

      <InviteCodes
        codes={data.codes.map((c) => ({
          code: c.code,
          note: c.note,
          maxUses: c.max_uses,
          uses: c.uses,
          expired: c.expires_at !== null && new Date(c.expires_at).getTime() < today.getTime(),
        }))}
      />
    </div>
  );
}
