import type { MetadataRoute } from "next";
import { CAMINHOS_PRIVADOS, urlDoSite } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const base = urlDoSite();
  return { rules: [{ userAgent: "*", allow: "/", disallow: CAMINHOS_PRIVADOS }], sitemap: `${base}/sitemap.xml`, host: base };
}
