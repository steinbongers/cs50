import type { MetadataRoute } from "next";

/** Gesloten pilot: zoekmachines buiten de deur. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
