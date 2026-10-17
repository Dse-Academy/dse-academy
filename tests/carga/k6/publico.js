// Cenário 1: navegação pública. 300 pessoas simultâneas, sem login, no site compilado.
// Meta (RNF-01, RNF-07): p95 das páginas <= 300 ms e menos de 0,5% de erros.
import { LIMIAR_ERROS, LIMIAR_PAGINAS } from './lib/comum.js';
import { fluxoPublico } from './lib/fluxos.js';

export const options = {
  scenarios: {
    navegacao: {
      executor: 'ramping-vus',
      exec: 'publico',
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{tipo:pagina}': LIMIAR_PAGINAS,
    'http_req_failed{tipo:pagina}': LIMIAR_ERROS,
    checks: ['rate>0.995'],
  },
};

export function publico() {
  fluxoPublico();
}
