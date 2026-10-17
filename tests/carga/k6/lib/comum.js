// Peças compartilhadas pelos cenários de carga: endereços, ids das pessoas simuladas, token (JWT) e limiares.
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

export const SITE = (__ENV.BASE_URL || 'http://host.docker.internal:3199').replace(/\/$/, '');
export const DB = (__ENV.DB_URL || 'http://gateway/rest/v1').replace(/\/$/, '');
export const JWT_SECRET = __ENV.JWT_SECRET || 'segredo-de-teste-com-mais-de-32-caracteres-ok';
export const USUARIOS = Number(__ENV.SEED_USUARIOS || 1000);

// Metas do plano de escala (docs/escala-1000-usuarios.md, requisitos RNF-01 a RNF-07).
export const LIMIAR_PAGINAS = ['p(95)<300'];
export const LIMIAR_API = ['p(95)<300', 'p(99)<800'];
export const LIMIAR_ERROS = ['rate<0.005'];

/** Mesmo id do seed (banco/90_seed.sql): md5('u' || i) formatado como uuid. A pessoa 0 é a do teste de abuso. */
export function uuidDe(i) {
  const h = crypto.md5(`u${i}`, 'hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Token HS256 como o do Supabase: o PostgREST o valida com o mesmo segredo e a RLS usa o "sub" como auth.uid(). */
export function jwtDe(sub, papel) {
  const b64 = (obj) => encoding.b64encode(JSON.stringify(obj), 'rawurl');
  const cab = b64({ alg: 'HS256', typ: 'JWT' });
  const corpo = b64({ sub, role: papel || 'authenticated', aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3 * 3600 });
  const assinatura = crypto.hmac('sha256', JWT_SECRET, `${cab}.${corpo}`, 'base64rawurl');
  return `${cab}.${corpo}.${assinatura}`;
}

export function cabecalhosDe(sub) {
  return { Authorization: `Bearer ${jwtDe(sub)}`, apikey: 'chave-de-teste', 'Content-Type': 'application/json' };
}

/** Cada usuário virtual "é" uma pessoa do seed (1..USUARIOS), repartidas em roda. */
export function pessoaDoVU() {
  return ((__VU - 1) % USUARIOS) + 1;
}

export function sorteia(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}
