import type { MetadataRoute } from "next";
import { slugDaVaga } from "@/lib/rotulos";
import { montarSitemap, urlDoSite } from "@/lib/site";
import { carregarTrilhas } from "@/lib/trilhas";
import { carregarVagas } from "@/lib/vagas";

export default function sitemap(): MetadataRoute.Sitemap {
  const vagas = carregarVagas();
  return montarSitemap(urlDoSite(), vagas.vagas.map((v) => slugDaVaga(v.id)), carregarTrilhas().trilhas.map((t) => t.id), vagas.coletada_em);
}
