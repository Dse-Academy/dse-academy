// Fluxos que imitam o uso real. Os cenários combinam estes fluxos com diferentes quantidades de usuários virtuais.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { DB, SITE, USUARIOS, cabecalhosDe, pessoaDoVU, sorteia, uuidDe } from './comum.js';

// Os dados reais do site (as mesmas páginas de vaga que existem em produção).
const vagas = new SharedArray('vagas', () => JSON.parse(open('/dados/vagas.json')).vagas.map((v) => v.id.replace(':', '-')));
const trilhas = ['engenharia_dados', 'analise_dados', 'ciencia_dados', 'bi', 'ml_engineering', 'dba'];
const areas = ['engenharia_dados', 'analise_dados', 'bi', 'ciencia_dados', 'ml_engineering'];
const niveis = ['', 'junior', 'pleno', 'senior'];

function pagina(caminho, nome) {
  const r = http.get(`${SITE}${caminho}`, { tags: { name: nome, tipo: 'pagina' } });
  check(r, { [`${nome} responde 200`]: (x) => x.status === 200 });
  return r;
}

/** Uma pessoa navegando sem login: home, lista, uma vaga, trilhas e o perfil de competências (página dinâmica). */
export function fluxoPublico() {
  pagina('/', '/');
  sleep(1 + Math.random() * 2);
  pagina('/vagas', '/vagas');
  sleep(2 + Math.random() * 3);
  pagina(`/vagas/${sorteia(vagas)}`, '/vagas/[id]');
  sleep(2 + Math.random() * 4);
  const sorteio = Math.random();
  if (sorteio < 0.4) pagina(`/trilhas/${sorteia(trilhas)}`, '/trilhas/[id]');
  else if (sorteio < 0.8) pagina(`/competencias?area=${sorteia(areas)}&nivel=${sorteia(niveis)}`, '/competencias');
  else pagina('/trilhas', '/trilhas');
  sleep(1 + Math.random() * 2);
  const saude = http.get(`${SITE}/api/health`, { tags: { name: '/api/health', tipo: 'pagina' } });
  check(saude, { '/api/health responde 200': (x) => x.status === 200 });
}

function api(metodo, caminho, nome, corpo, cabecalhos) {
  const r = http.request(metodo, `${DB}${caminho}`, corpo ? JSON.stringify(corpo) : null, { headers: cabecalhos, tags: { name: nome, tipo: 'api' } });
  return r;
}

/** Carga de uma página para quem está logada: perfil, vagas salvas, é admin?, inscrições; às vezes salva uma vaga ou marca progresso. */
export function fluxoLogada(pessoa) {
  const id = uuidDe(pessoa);
  const h = cabecalhosDe(id);
  const leituras = [
    api('GET', `/perfis?id=eq.${id}&select=nome,habilidades,area,senioridade`, 'GET perfis', null, h),
    api('GET', '/vagas_salvas?select=vaga_id,titulo,empresa,url,salva_em&order=salva_em.desc', 'GET vagas_salvas', null, h),
    api('POST', '/rpc/is_admin', 'POST rpc/is_admin', {}, h),
    api('GET', '/inscricoes_trilha?select=trilha_id,concluidas', 'GET inscricoes_trilha', null, h),
  ];
  for (const r of leituras) check(r, { 'leitura da conta responde 200': (x) => x.status === 200 });

  if (Math.random() < 0.3) {
    const nova = `gupy:${1000 + Math.floor(Math.random() * 100000)}`;
    const r = api('POST', '/vagas_salvas?on_conflict=user_id,vaga_id', 'POST vagas_salvas', { vaga_id: nova, titulo: 'Vaga de teste', empresa: 'Empresa', url: 'https://exemplo.com/v' },
      { ...h, Prefer: 'resolution=ignore-duplicates,return=minimal' });
    check(r, { 'salvar vaga responde 2xx': (x) => x.status >= 200 && x.status < 300 });
  }
  if (Math.random() < 0.2) {
    const r = api('PATCH', `/inscricoes_trilha?trilha_id=eq.${sorteia(['engenharia_dados', 'analise_dados'])}`, 'PATCH inscricoes_trilha',
      { concluidas: ['sql', 'python', 'git'] }, { ...h, Prefer: 'return=minimal' });
    check(r, { 'marcar progresso responde 2xx': (x) => x.status >= 200 && x.status < 300 });
  }
}

/** Um usuário virtual logado fazendo "páginas" com tempo de leitura entre elas. */
export function usuarioLogado() {
  fluxoLogada(pessoaDoVU() || 1);
  sleep(10 + Math.random() * 20);
}

export { USUARIOS };
