import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components staat bewust uit: vrijwel elke pagina is per gebruiker
  // (sessiecookie), dus het klassieke model (dynamisch renderen zodra de
  // sessie gelezen wordt) is eenvoudiger en voorspelbaarder voor deze app.
  reactStrictMode: true,
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
