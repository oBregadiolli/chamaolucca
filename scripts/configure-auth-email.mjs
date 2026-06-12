/**
 * Auth email settings for go-live: auto-confirm signups (no confirmation email)
 * and raise email rate limit where the API allows.
 *
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/configure-auth-email.mjs
 *
 * Why: Supabase built-in SMTP allows very few auth emails/hour. E2E + QA
 * exhausts the quota → signup returns 429 over_email_send_rate_limit.
 * Auto-confirm avoids sending email on signup. Password recovery by email: backlog BL-002.
 */
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    console.error(`❌ ${method} ${path} (${res.status}):`, data);
    process.exit(1);
  }
  return data;
}

console.log('\n📧 Auth email config — before');
const before = await api('/config/auth');
console.log('  mailer_autoconfirm:', before.mailer_autoconfirm);
console.log('  rate_limit_email_sent:', before.rate_limit_email_sent);

console.log('\n🔧 Updating (auto-confirm signups — no confirmation email)...');
const after = await api('/config/auth', {
  method: 'PATCH',
  body: {
    mailer_autoconfirm: true,
  },
});

console.log('\n✅ Auth email config — after');
console.log('  mailer_autoconfirm:', after.mailer_autoconfirm);
console.log('  rate_limit_email_sent:', after.rate_limit_email_sent);
console.log('\nℹ️  Cadastro sem e-mail de confirmação. Recuperação por e-mail: backlog BL-002.\n');
