import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

export function loadEnv() {
  const vars = {};
  for (const [key, val] of Object.entries(process.env)) {
    if ((key.startsWith('VITE_') || key === 'SUPABASE_SERVICE_ROLE_KEY') && val) vars[key] = val;
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

export function createReporter(planName) {
  const results = [];
  return {
    ok(label, detail = '') {
      results.push({ ok: true, label, detail });
      console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
    },
    fail(label, detail = '') {
      results.push({ ok: false, label, detail });
      console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    },
    summary() {
      const passed = results.filter((r) => r.ok).length;
      console.log(`\n  📊 ${planName}: ${passed}/${results.length} OK\n`);
      return passed === results.length;
    },
    results,
  };
}

const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const E2E_EMAIL = process.env.E2E_USER_EMAIL ?? 'e2e.chamaolucca@example.com';
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'ChamaOLucca_E2E_2026!';

async function fetchServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const keys = await res.json();
  return keys?.find((k) => k.name === 'service_role')?.api_key ?? null;
}

async function signInWithPassword(URL, ANON) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Sessão E2E reutilizável — evita rate limit de signup por e-mail */
export async function getE2ESession(URL, ANON) {
  let session = await signInWithPassword(URL, ANON);
  if (session?.access_token) return session;

  const serviceKey = await fetchServiceRoleKey();
  if (!serviceKey) return null;

  await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'E2E ChamaOLucca', phone: '75999999999' },
    }),
  });

  session = await signInWithPassword(URL, ANON);
  return session?.access_token ? session : null;
}
