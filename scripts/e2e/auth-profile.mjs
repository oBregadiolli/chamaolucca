/**
 * Plano C — Auth + Profile trigger
 */
import { loadEnv, createReporter, getE2ESession } from './_helpers.mjs';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const r = createReporter('Plano C — Auth + Profile');

const session = await getE2ESession(URL, ANON);
if (!session?.access_token || !session.user?.id) {
  r.fail('C1 Sessão E2E', 'Defina SUPABASE_ACCESS_TOKEN ou crie usuário manualmente');
  process.exit(1);
}

const userId = session.user.id;
const accessToken = session.access_token;
r.ok('C1 Sessão E2E (admin API ou sign-in)', userId.slice(0, 8));

const profileRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}&select=id,role,email`, {
  headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
});
const profiles = await profileRes.json();
const profile = profiles?.[0];

if (profile?.role === 'customer') r.ok('C2 Profile via trigger', `role=${profile.role}`);
else r.fail('C2 Profile', JSON.stringify(profiles));

const hackRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}`, {
  method: 'PATCH',
  headers: {
    apikey: ANON,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ role: 'admin' }),
});
const hackData = await hackRes.json();
const stillCustomer =
  hackRes.status === 403 ||
  hackRes.status === 401 ||
  (Array.isArray(hackData) && hackData[0]?.role === 'customer') ||
  hackData?.code === '42501' ||
  (Array.isArray(hackData) && hackData.length === 0);

if (stillCustomer) r.ok('C3 Escalada role admin bloqueada');
else r.fail('C3 Escalada role', `${hackRes.status} ${JSON.stringify(hackData)}`);

process.exit(r.summary() ? 0 : 1);
