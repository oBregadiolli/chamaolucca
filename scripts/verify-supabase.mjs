/**
 * Smoke test for ChamaOLucca Supabase project (REST + Edge Functions).
 *
 * Usage:
 *   node scripts/verify-supabase.mjs
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function loadEnv() {
  const vars = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith('VITE_') && val) vars[key] = val;
  }

  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) vars[m[1].trim()] = m[2].trim().replace(/\r$/, '');
    }
  }
  return vars;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY required in .env');
  process.exit(1);
}

const results = [];

function ok(label, detail = '') {
  results.push({ ok: true, label, detail });
  console.log(`✅ ${label}${detail ? ` — ${detail}` : ''}`);
}

function fail(label, detail = '') {
  results.push({ ok: false, label, detail });
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

async function restGet(table, select = 'count') {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  const res = await fetch(url, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      Prefer: 'count=exact',
    },
  });
  const count = res.headers.get('content-range')?.split('/')[1] ?? '?';
  return { ok: res.ok, status: res.status, count, body: await res.text() };
}

async function invokeFunction(name, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

console.log(`\n🔍 Verificando Supabase: ${SUPABASE_URL}\n`);

// REST checks
const restTables = [
  { table: 'products', select: 'id' },
  { table: 'categories', select: 'id' },
  { table: 'store_settings', select: 'key' },
  { table: 'delivery_slots', select: 'id' },
  { table: 'neighborhoods', select: 'id' },
];

for (const { table, select } of restTables) {
  const r = await restGet(table, select);
  if (r.ok) ok(`REST ${table}`, `${r.count} registros`);
  else fail(`REST ${table}`, `HTTP ${r.status}`);
}

// Edge Functions (public / no JWT)
const places = await invokeFunction('places-autocomplete', { input: 'Centro Alagoinhas' });
if (places.ok && places.data?.predictions !== undefined) ok('Edge places-autocomplete');
else fail('Edge places-autocomplete', places.data?.error || `HTTP ${places.status}`);

const neighborhoods = await invokeFunction('fetch-neighborhoods', { city: 'Alagoinhas' });
if (neighborhoods.ok && neighborhoods.data?.neighborhoods) {
  ok('Edge fetch-neighborhoods', `${neighborhoods.data.neighborhoods.length} bairros`);
} else {
  fail('Edge fetch-neighborhoods', neighborhoods.data?.error || `HTTP ${neighborhoods.status}`);
}

const reverse = await invokeFunction('reverse-geocode', { lat: -12.135, lng: -38.419 });
const revAddr = reverse.data?.results?.[0]?.formatted_address;
if (reverse.ok && revAddr) ok('Edge reverse-geocode', revAddr.slice(0, 40));
else fail('Edge reverse-geocode', reverse.data?.error || reverse.data?.status || `HTTP ${reverse.status}`);

// place-order must reject unauthenticated
const placeOrder = await invokeFunction('place-order', { cart_id: '00000000-0000-0000-0000-000000000000' });
if (placeOrder.status === 401 || placeOrder.data?.error?.includes('autenticado')) {
  ok('Edge place-order exige auth');
} else {
  fail('Edge place-order auth guard', JSON.stringify(placeOrder.data));
}

const webhookPing = await fetch(`${SUPABASE_URL}/functions/v1/mp-webhook`, {
  method: 'GET',
  headers: { apikey: ANON_KEY },
});
const webhookData = await webhookPing.json();
if (webhookPing.ok && webhookData?.ok) ok('Edge mp-webhook responde');
else fail('Edge mp-webhook', JSON.stringify(webhookData));

const passed = results.filter((r) => r.ok).length;
const total = results.length;
console.log(`\n📊 Resultado: ${passed}/${total} checks OK\n`);

if (passed < total) process.exit(1);
