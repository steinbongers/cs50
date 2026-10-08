import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iPhone-app: een schil om de webapp. De app laadt de live versie op
 * Vercel, dus updates van de webapp staan direct in de app zonder nieuwe build.
 * native/www is alleen het scherm dat je ziet als er geen internet is.
 *
 * appId wordt de bundel-id in de App Store en is daarna niet meer te wijzigen:
 * vervang hem door de definitieve naam vóór de eerste TestFlight-upload.
 */
const config: CapacitorConfig = {
  appId: "nl.steinbongers.financeapp",
  appName: "Finance",
  webDir: "native/www",
  server: {
    url: "https://financeapppilot.vercel.app",
    cleartext: false,
    // Deze domeinen blijven in de app (inloggen met Apple, bankkoppeling);
    // andere externe links openen in Safari.
    allowNavigation: ["*.supabase.co", "appleid.apple.com", "*.enablebanking.com", "*.ing.nl"],
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#f6f7f9",
  },
};

export default config;
