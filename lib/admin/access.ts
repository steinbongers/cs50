import "server-only";

/** E-mailadressen die /admin mogen zien, kommagescheiden in ADMIN_EMAILS. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/** Beheerder: adres staat in ADMIN_EMAILS én is bevestigd. */
export function isAdminUser(user: { email: string | null; emailVerified: boolean } | null | undefined): boolean {
  return Boolean(user && user.emailVerified && isAdminEmail(user.email));
}
