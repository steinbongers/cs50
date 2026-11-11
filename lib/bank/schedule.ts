/**
 * Telt hoeveel keer per dag de planning in .github/workflows/cron.yml de bank laat ophalen.
 * Alleen voor de test die bewaakt dat we onder de PSD2-grens van 4 keer per dag blijven.
 *
 * Leest het schema waarop de job `sync` reageert (`github.event.schedule == '...'`)
 * en telt de uren in het urenveld (lijsten en reeksen; elke minuutwaarde telt mee).
 */
export function syncRunsPerDay(yml: string): number {
  const job = /\n {2}sync:\n([\s\S]*?)(?=\n {2}[a-z_-]+:\n|$)/.exec(yml);
  if (!job) throw new Error("Geen job 'sync' in cron.yml");
  const schedules = [...job[1].matchAll(/github\.event\.schedule == '([^']+)'/g)].map((m) => m[1]);
  if (schedules.length === 0) throw new Error("Job 'sync' noemt geen schema");
  let total = 0;
  for (const expr of schedules) {
    const [minute, hour, dom, month, dow] = expr.trim().split(/\s+/);
    if (dom !== "*" || month !== "*" || dow !== "*") throw new Error(`Onverwacht schema: ${expr}`);
    total += countField(minute, 60) * countField(hour, 24);
  }
  return total;
}

function countField(field: string, size: number): number {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText ? Number(stepText) : 1;
    let from: number;
    let to: number;
    if (range === "*") {
      from = 0;
      to = size - 1;
    } else if (range.includes("-")) {
      [from, to] = range.split("-").map(Number);
    } else {
      from = Number(range);
      to = stepText ? size - 1 : from;
    }
    for (let v = from; v <= to; v += step) values.add(v);
  }
  return values.size;
}
