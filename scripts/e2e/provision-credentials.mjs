/**
 * Autoprovisiona credenciais E2E (runtime). Nunca commitar senha.
 * Uso: node scripts/e2e/provision-credentials.mjs
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { loadEnv } from './_helpers.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.error('❌ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes no .env');
  process.exit(1);
}

function randomPassword() {
  return crypto.randomBytes(18).toString('base64url');
}

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

async function signIn(email, password) {
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function signUp(email, password) {
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      data: { name: 'E2E ChamaOLucca', phone: '75999999999' },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

async function adminCreateUser(email, password, serviceKey) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'E2E ChamaOLucca', phone: '75999999999' },
    }),
  });
  return res.ok || res.status === 422;
}

function persistLocalEnv(email, password) {
  const envPath = path.join(root, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = content.split(/\r?\n/).filter((l) => !/^E2E_USER_(EMAIL|PASSWORD)=/.test(l));
  lines.push(`E2E_USER_EMAIL=${email}`);
  lines.push(`E2E_USER_PASSWORD=${password}`);
  fs.writeFileSync(envPath, `${lines.filter(Boolean).join('\n')}\n`, 'utf8');
}

let email = process.env.E2E_USER_EMAIL?.trim();
let password = process.env.E2E_USER_PASSWORD?.trim();

if (email && password) {
  const session = await signIn(email, password);
  if (session?.access_token) {
    console.log(`✅ Credenciais E2E existentes válidas (${email})`);
    process.exit(0);
  }
  console.log('⚠️  E2E_USER_* definidas mas login falhou — reprovisionando…');
}

email = `e2e+${Date.now()}@chamaolucca.com.br`;
password = randomPassword();

const signup = await signUp(email, password);
if (!signup.ok && signup.status !== 200) {
  const serviceKey = await fetchServiceRoleKey();
  if (!serviceKey) {
    console.error('❌ Signup falhou e SUPABASE_ACCESS_TOKEN/service_role indisponível');
    console.error(JSON.stringify(signup.body));
    process.exit(1);
  }
  await adminCreateUser(email, password, serviceKey);
}

const session = await signIn(email, password);
if (!session?.access_token) {
  console.error('❌ Não foi possível autenticar usuário E2E após provisionamento');
  process.exit(1);
}

persistLocalEnv(email, password);
console.log(`✅ E2E provisionado: ${email}`);
console.log('   (credenciais gravadas em .env local — gitignored)');
