/**
 * Zet de private key uit de environment variable om naar nette PEM.
 * Kopiëren uit een dashboard (Railway, Vercel, een chat) kost vaak de regeleinden:
 * we accepteren echte regeleinden, letterlijke "\n", alles op één regel met spaties,
 * aanhalingstekens eromheen en een base64-gecodeerde PEM.
 */
export function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/^["']|["']$/g, "").trim();
  key = key.replace(/\\r/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");

  // Geen BEGIN-regel: misschien is de hele PEM base64-gecodeerd.
  if (!key.includes("-----BEGIN")) {
    try {
      const decoded = Buffer.from(key.replace(/\s+/g, ""), "base64").toString("utf8");
      if (decoded.includes("-----BEGIN")) key = decoded.trim();
    } catch {
      // geen base64; laat hem zoals hij is
    }
  }

  const match = /-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/.exec(key);
  if (!match) return key;
  const label = match[1];
  const body = match[2].replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

/** Vorm van de key zonder inhoud, voor de foutmelding aan beheerders. */
export function describePrivateKeyShape(raw: string | undefined): string {
  if (!raw) return "er staat geen key in de variabele";
  const label = /-----BEGIN ([A-Z ]+)-----/.exec(raw)?.[1];
  const lines = raw.trim().split(/\r?\n/).length;
  const parts = [
    label ? `begint met BEGIN ${label}` : "zonder BEGIN-regel",
    /-----END /.test(raw) ? "met END-regel" : "zonder END-regel",
    `${lines} ${lines === 1 ? "regel" : "regels"}`,
    `${raw.length} tekens`,
  ];
  return parts.join(", ");
}
