/**
 * Go-live readiness report (Supabase + production bundle check).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const vars = {};
  const envPath = path.join(root, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) vars[m[1].trim()] = m[2].trim();
    }
  }
  return vars;
}

const env = loadEnv();
const checks = [];

function row(label, ok, detail = '') {
  checks.push({ label, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log('\n📋 Go-live readiness\n');

// Production bundle Supabase ref
try {
  const html = await fetch('https://chamaolucca.com.br/').then((r) => r.text());
  const asset = html.match(/assets\/index-[^"']+\.js/)?.[0];
  const js = asset ? await fetch(`https://chamaolucca.com.br/${asset}`).then((r) => r.text()) : '';
  const prodUrl = js.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0] || 'unknown';
  const expected = env.VITE_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
  row('Produção aponta Supabase correto', prodUrl === expected, prodUrl);
} catch (e) {
  row('Produção aponta Supabase correto', false, e.message);
}

if (TOKEN) {
  try {
    const auth = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    }).then((r) => r.json());
    row('Auth Site URL', auth.site_url === 'https://chamaolucca.com.br', auth.site_url);
  } catch (e) {
    row('Auth Site URL', false, e.message);
  }

  try {
    const q = `select polname from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname='orders' and polname='orders_update_admin'`;
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q }),
    }).then((r) => r.json());
    row('Migration 006 (orders_update_admin)', Array.isArray(res) && res.length > 0);
  } catch (e) {
    row('Migration 006', false, e.message);
  }

  try {
    const { spawnSync } = await import('child_process');
    const list = spawnSync('npx', ['supabase', 'secrets', 'list', '--project-ref', PROJECT_REF], {
      encoding: 'utf8',
      shell: true,
    });
    const names = [...list.stdout.matchAll(/"name":"([^"]+)"/g)].map((m) => m[1]);
    row('Secret ALLOWED_ORIGINS', names.includes('ALLOWED_ORIGINS'));
    row('Secret ALLOW_TEST_ORDERS', names.includes('ALLOW_TEST_ORDERS'));
    row('Secret MP_ACCESS_TOKEN', names.includes('MP_ACCESS_TOKEN'));
    row('Secret GOOGLE_MAPS_API_KEY', names.includes('GOOGLE_MAPS_API_KEY'));
    row('Secret MP_WEBHOOK_SECRET', names.includes('MP_WEBHOOK_SECRET'));
  } catch (e) {
    row('Secrets list', false, e.message);
  }
} else {
  console.log('⚠️  SUPABASE_ACCESS_TOKEN ausente — pulando checks Supabase');
}

console.log('\n📝 Pendências manuais:');
console.log('  • Netlify: env vars VITE_SUPABASE_* (ou redeploy após netlify.toml)');
console.log('  • Mercado Pago: webhook + MP_WEBHOOK_SECRET');
console.log('  • node scripts/promote-admin.mjs <email>');
console.log('  • QA: 1 Pix + 1 cartão (docs/GO-LIVE-QA.md)\n');

const failed = checks.filter((c) => !c.ok).length;
process.exit(failed ? 1 : 0);
