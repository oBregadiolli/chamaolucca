/**
 * Promote a user to admin by email.
 *
 * Usage:
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   node scripts/promote-admin.mjs admin@example.com
 */
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const email = process.argv[2];

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

if (!email) {
  console.error('Usage: node scripts/promote-admin.mjs <email>');
  process.exit(1);
}

const query = `
  update public.profiles
  set role = 'admin', updated_at = now()
  where email = '${email.replace(/'/g, "''")}'
  returning id, email, role;
`;

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const body = await res.json();

if (!res.ok) {
  console.error('Failed:', body);
  process.exit(1);
}

const row = Array.isArray(body) ? body[0] : body;
if (!row?.id) {
  console.error(`Nenhum profile encontrado para ${email}`);
  process.exit(1);
}

console.log(`✅ ${row.email} promovido a admin (${row.id})`);
