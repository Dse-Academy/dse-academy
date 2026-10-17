// Cenário 3: pico de divulgação. Rampa de 0 a 500 pessoas em 2 minutos, platô de 5 minutos e descida:
// 350 navegando sem login e 150 logadas, ao mesmo tempo (post no LinkedIn, e-mail para a comunidade, evento).
// Meta: sem queda; latência dentro dos limites no platô; erros < 0,5%.
import { LIMIAR_API, LIMIAR_ERROS, LIMIAR_PAGINAS } from './lib/comum.js';
import { fluxoPublico, usuarioLogado } from './lib/fluxos.js';

const subida = (alvo) => [
  { duration: '2m', target: alvo },
  { duration: '5m', target: alvo },
  { duration: '1m', target: 0 },
];

export const options = {
  scenarios: {
    navegacao: { executor: 'ramping-vus', exec: 'publico', stages: subida(350) },
    logadas: { executor: 'ramping-vus', exec: 'logada', stages: subida(150) },
  },
  thresholds: {
    'http_req_duration{tipo:pagina}': LIMIAR_PAGINAS,
    'http_req_duration{tipo:api}': LIMIAR_API,
    http_req_failed: LIMIAR_ERROS,
    checks: ['rate>0.995'],
  },
};

export function publico() {
  fluxoPublico();
}

export function logada() {
  usuarioLogado();
}
