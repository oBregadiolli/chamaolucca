/**
 * Plano E — Loja UI / dev server
 */
import { loadEnv, createReporter } from './_helpers.mjs';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const DEV = process.env.E2E_DEV_URL || 'http://localhost:5173';

const r = createReporter('Plano E — Loja UI');

try {
  const home = await fetch(DEV, { signal: AbortSignal.timeout(5000) });
  if (home.ok) r.ok('E3 Dev server', DEV);
  else r.fail('E3 Dev server', `HTTP ${home.status}`);
} catch (e) {
  r.fail('E3 Dev server', e.message);
}

try {
  const loja = await fetch(`${DEV}/loja`, { signal: AbortSignal.timeout(5000) });
  if (loja.ok) r.ok('E1 GET /loja', `HTTP ${loja.status}`);
  else r.fail('E1 GET /loja', `HTTP ${loja.status}`);
} catch (e) {
  r.fail('E1 GET /loja', e.message);
}

const products = await fetch(`${URL}/rest/v1/products?active=eq.true&select=id`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: 'count=exact' },
}).catch((e) => {
  r.fail('E2E Produtos ativos', e.message);
  return null;
});

if (products) {
  const count = products.headers.get('content-range')?.split('/')[1] ?? '0';
  if (products.ok && Number(count) >= 5) r.ok('E2 Produtos ativos', count);
  else r.fail('E2 Produtos ativos', count);
}

process.exit(r.summary() ? 0 : 1);
