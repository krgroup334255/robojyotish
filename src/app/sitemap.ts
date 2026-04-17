import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1.0, changeFrequency: "weekly" },
    { url: `${SITE_URL}/reading`, lastModified: now, priority: 0.9, changeFrequency: "monthly" },
    { url: `${SITE_URL}/login`, lastModified: now, priority: 0.5 },
    { url: `${SITE_URL}/ta`, lastModified: now, priority: 0.9 },
    { url: `${SITE_URL}/ms`, lastModified: now, priority: 0.9 },
  ];
}
