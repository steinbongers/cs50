/**
 * Anonieme churn-regel voor een verwijderd account: de maandag van de week waarin
 * iemand zich registreerde en het aantal hele dagen tot het verwijderen.
 * Bewust zonder user_id. Rekent in UTC, net als de server.
 */
export function churnEntry(createdAt: string, now: Date = new Date()): { cohort_week: string; days_since_signup: number } {
  const created = new Date(createdAt);
  const start = Number.isNaN(created.getTime()) ? now : created;

  const monday = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const weekday = (monday.getUTCDay() + 6) % 7; // maandag = 0
  monday.setUTCDate(monday.getUTCDate() - weekday);

  const days = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return { cohort_week: monday.toISOString().slice(0, 10), days_since_signup: Math.max(0, days) };
}
