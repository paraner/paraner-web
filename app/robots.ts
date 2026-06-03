import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/giris", "/kayit"],
    },
    sitemap: "https://paraner.com/sitemap.xml",
    host: "https://paraner.com",
  };
}
