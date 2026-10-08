import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components staat bewust uit: vrijwel elke pagina is per gebruiker
  // (sessiecookie), dus het klassieke model (dynamisch renderen zodra de
  // sessie gelezen wordt) is eenvoudiger en voorspelbaarder voor deze app.
  reactStrictMode: true,
  async redirects() {
    // Oude tabbladen (vóór de indeling Overzicht, Swipen, Instellingen).
    return [
      { source: "/profiel", destination: "/instellingen", permanent: false },
      { source: "/potjes", destination: "/overzicht", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
