import type { NextConfig } from "next";
import { regrasDeCabecalhos } from "./src/lib/seguranca";

const nextConfig: NextConfig = {
  // Não anuncia a tecnologia do servidor em cada resposta.
  poweredByHeader: false,
  async headers() {
    return regrasDeCabecalhos();
  },
};

export default nextConfig;
