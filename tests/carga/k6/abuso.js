// Cenário 4: abuso dos formulários (SEG-03). Prova que a proteção da migration 009 aguenta pressão e que o abuso não atrapalha quem usa de verdade.
//   - visitantes sem login tentam enviar artigo, cadastro de palestrante e relato (50 por segundo no total): NENHUM pode ser aceito;
//   - uma pessoa logada tenta mandar 45 relatos seguidos: só 30 (o limite por hora) podem passar;
//   - enquanto isso, 100 pessoas logadas continuam usando o site normalmente, e o p95 delas não pode piorar.
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { DB, LIMIAR_API, cabecalhosDe, uuidDe } from './lib/comum.js';
import { usuarioLogado } from './lib/fluxos.js';

const anonimoAceito = new Counter('abuso_anonimo_aceito');
const spamAceito = new Counter('abuso_spam_aceito');
const spamRecusado = new Counter('abuso_spam_recusado');

const anonimo = { 'Content-Type': 'application/json', apikey: 'chave-de-teste', Prefer: 'return=minimal' };
const ARTIGO = {
  nome: 'Spammer', email: 'spam@exemplo.com', bio: 'Mini bio de teste com mais de vinte caracteres.', titulo: 'Titulo de spam',
  resumo: 'Resumo de teste com mais de vinte caracteres, só para o abuso.', tags: ['spam'], link_rascunho: 'https://exemplo.com/spam',
  aceite_lgpd: true, aceite_direitos: true,
};
const PALESTRANTE = {
  nome: 'Spammer', email: 'spam@exemplo.com', bio: 'Mini bio de teste com mais de vinte caracteres.', temas: ['spam'], formatos: ['palestra'],
  modalidade: 'remoto', aceite_lgpd: true,
};
const RELATO = { vaga_id: 'gupy:1', tipo: 'outro' };

const taxa = (porSegundo) => ({
  executor: 'constant-arrival-rate', rate: porSegundo, timeUnit: '1s', duration: '2m', preAllocatedVUs: 40, maxVUs: 200,
});

export const options = {
  scenarios: {
    anonimo_artigos: { ...taxa(30), exec: 'anonimoArtigos' },
    anonimo_palestrantes: { ...taxa(10), exec: 'anonimoPalestrantes' },
    anonimo_relatos: { ...taxa(10), exec: 'anonimoRelatos' },
    spam_logado: { executor: 'per-vu-iterations', vus: 1, iterations: 45, maxDuration: '2m', exec: 'spamLogado' },
    // Entram aos poucos (30 s) como numa visita real; 100 pessoas disparando no mesmo milissegundo contra um banco recém-criado é outro teste.
    uso_normal: { executor: 'ramping-vus', stages: [{ duration: '30s', target: 100 }, { duration: '90s', target: 100 }], exec: 'usoNormal', tags: { grupo: 'uso_normal' } },
  },
  thresholds: {
    abuso_anonimo_aceito: ['count==0'],      // nenhum envio anônimo pode ser gravado
    abuso_spam_aceito: ['count<=30'],        // o limite por pessoa (30 relatos por hora)
    abuso_spam_recusado: ['count>=15'],      // os 15 excedentes foram barrados
    'http_req_duration{grupo:uso_normal}': LIMIAR_API,
    'http_req_failed{grupo:uso_normal}': ['rate<0.005'],
  },
};

function tenta(tabela, corpo) {
  const r = http.post(`${DB}/${tabela}`, JSON.stringify(corpo), { headers: anonimo, tags: { name: `anônimo POST ${tabela}`, tipo: 'abuso' }, responseCallback: http.expectedStatuses({ min: 200, max: 499 }) });
  if (r.status >= 200 && r.status < 300) anonimoAceito.add(1);
  check(r, { 'nenhum envio anônimo foi aceito': (x) => x.status < 200 || x.status >= 300, 'sem erro 5xx': (x) => x.status < 500 });
}

export function anonimoArtigos() { tenta('submissoes_artigos', ARTIGO); }
export function anonimoPalestrantes() { tenta('palestrantes', PALESTRANTE); }
export function anonimoRelatos() { tenta('reportes_vaga', RELATO); }

export function spamLogado() {
  const id = uuidDe(0); // a pessoa 0 não tem envios antigos
  const r = http.post(`${DB}/reportes_vaga`, JSON.stringify({ ...RELATO, user_id: id }), {
    headers: { ...cabecalhosDe(id), Prefer: 'return=minimal' }, tags: { name: 'logada POST reportes_vaga', tipo: 'abuso' },
    responseCallback: http.expectedStatuses({ min: 200, max: 499 }),
  });
  if (r.status >= 200 && r.status < 300) spamAceito.add(1);
  else spamRecusado.add(1);
  check(r, { 'sem erro 5xx': (x) => x.status < 500 });
}

export function usoNormal() {
  usuarioLogado();
}
