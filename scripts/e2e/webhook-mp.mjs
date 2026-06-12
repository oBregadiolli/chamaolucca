/**
 * Plano B — Webhook Mercado Pago simulation
 */
import { loadEnv, createReporter } from './_helpers.mjs';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const WEBHOOK = `${URL}/functions/v1/mp-webhook`;
const r = createReporter('Plano B — Webhook MP');

const mpSimulation = {
  action: 'payment.updated',
  api_version: 'v1',
  data: { id: '123456' },
  date_created: '2021-11-01T02:02:02Z',
  id: '123456',
  live_mode: false,
  type: 'payment',
  user_id: 2015893968,
};

const post = await fetch(WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON },
  body: JSON.stringify(mpSimulation),
});
const postData = await post.json();
if (post.ok && postData?.ok) r.ok('B1 POST payment.updated (simulação MP)', `status ${post.status}`);
else r.fail('B1 POST payment.updated', `${post.status} ${JSON.stringify(postData)}`);

const get = await fetch(WEBHOOK, { headers: { apikey: ANON } });
const getData = await get.json();
if (get.ok && getData?.ok) r.ok('B2 GET ping webhook');
else r.fail('B2 GET ping', `${get.status}`);

const empty = await fetch(WEBHOOK, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: ANON },
  body: JSON.stringify({ type: 'payment' }),
});
const emptyData = await empty.json();
if (empty.ok && emptyData?.ok) r.ok('B3 POST sem payment id');
else r.fail('B3 POST sem id', `${empty.status}`);

process.exit(r.summary() ? 0 : 1);
