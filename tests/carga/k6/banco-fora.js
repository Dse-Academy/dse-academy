// Cenário 6: o banco cai (RNF-08). Com 100 pessoas navegando, o ./rodar.sh DESLIGA o Postgres aos 40 s e o religa aos 140 s.
// O conteúdo público (home, vagas, trilhas, competências) é estático ou lido do disco e NÃO pode parar.
// O endpoint de saúde com banco (/api/health?db=1) tem que acusar o problema (503) e voltar a 200 depois.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { LIMIAR_ERROS, LIMIAR_PAGINAS, SITE } from './lib/comum.js';
import { fluxoPublico } from './lib/fluxos.js';

const saudeComBancoFora = new Counter('saude_acusou_banco_fora');
const saudeComBancoOk = new Counter('saude_com_banco_ok');

export const options = {
  scenarios: {
    navegacao: { executor: 'constant-vus', vus: 100, duration: '3m', exec: 'navegar' },
    monitor: { executor: 'constant-vus', vus: 1, duration: '3m', exec: 'monitor' },
  },
  thresholds: {
    'http_req_duration{tipo:pagina}': LIMIAR_PAGINAS,
    'http_req_failed{tipo:pagina}': LIMIAR_ERROS,   // o conteúdo público não pode falhar, com ou sem banco
    saude_acusou_banco_fora: ['count>=1'],          // o monitor percebeu a queda
    saude_com_banco_ok: ['count>=1'],               // e também viu o banco saudável
  },
};

export function navegar() {
  fluxoPublico();
}

export function monitor() {
  const r = http.get(`${SITE}/api/health?db=1`, { tags: { name: '/api/health?db=1', tipo: 'monitor' }, responseCallback: http.expectedStatuses(200, 503) });
  check(r, { 'a saúde responde 200 ou 503, nunca trava': (x) => x.status === 200 || x.status === 503 });
  if (r.status === 503) saudeComBancoFora.add(1);
  if (r.status === 200) saudeComBancoOk.add(1);
  sleep(5);
}
