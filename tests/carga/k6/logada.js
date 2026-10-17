// Cenário 2: pessoas logadas. 150 pessoas simultâneas fazendo o que o site faz ao abrir uma página logada
// (perfil, vagas salvas, é admin?, inscrições) e, às vezes, salvando uma vaga ou marcando progresso.
// O alvo é o banco com as regras de acesso (RLS) e os dados de 1.000 pessoas.
// Meta (RNF-02, RNF-07): p95 <= 300 ms, p99 <= 800 ms, menos de 0,5% de erros.
import { LIMIAR_API, LIMIAR_ERROS } from './lib/comum.js';
import { usuarioLogado } from './lib/fluxos.js';

export const options = {
  scenarios: {
    logadas: {
      executor: 'ramping-vus',
      exec: 'logada',
      stages: [
        { duration: '1m', target: 150 },
        { duration: '3m', target: 150 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{tipo:api}': LIMIAR_API,
    'http_req_failed{tipo:api}': LIMIAR_ERROS,
    checks: ['rate>0.995'],
  },
};

export function logada() {
  usuarioLogado();
}
