// Cenário 5: estresse do banco. Sobe a taxa de requisições por degraus (100, 200, 400, 600, 800 e 1000 por segundo) para achar
// onde o banco com a RLS e os dados de 1.000 pessoas começa a passar do limite. Não é pass/fail: o que importa é a tabela por degrau.
// Leia o resultado assim: "o último degrau com p95 <= 300 ms e erros < 0,5% é a capacidade sustentada".
import http from 'k6/http';
import { check } from 'k6';
import { DB, USUARIOS, cabecalhosDe, uuidDe } from './lib/comum.js';

const DEGRAUS = [100, 200, 400, 600, 800, 1000];
const DURACAO_S = 60;

const scenarios = {};
DEGRAUS.forEach((taxa, i) => {
  scenarios[`taxa_${taxa}`] = {
    executor: 'constant-arrival-rate', rate: taxa, timeUnit: '1s', duration: `${DURACAO_S}s`, startTime: `${i * (DURACAO_S + 10)}s`,
    preAllocatedVUs: Math.min(taxa, 400), maxVUs: 3000, tags: { degrau: `${taxa}rps` }, exec: 'leitura',
  };
});

// Limiares que nunca derrubam o teste (valores enormes): servem só para o k6 separar as métricas por degrau no relatório.
const thresholds = {};
DEGRAUS.forEach((taxa) => {
  thresholds[`http_req_duration{degrau:${taxa}rps}`] = ['p(95)<1000000', 'p(99)<1000000'];
  thresholds[`http_req_failed{degrau:${taxa}rps}`] = ['rate<1.01'];
});

export const options = { scenarios, thresholds, summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'] };

export function leitura() {
  const pessoa = 1 + Math.floor(Math.random() * USUARIOS);
  const id = uuidDe(pessoa);
  const r = http.get(`${DB}/vagas_salvas?select=vaga_id,titulo,empresa,url,salva_em&order=salva_em.desc`, {
    headers: cabecalhosDe(id), tags: { name: 'GET vagas_salvas', tipo: 'api' },
  });
  check(r, { 'leitura responde 200': (x) => x.status === 200 });
}
