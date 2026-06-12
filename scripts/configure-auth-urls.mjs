/**
 * Configure Supabase Auth URLs for production go-live.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/configure-auth-urls.mjs
 */
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SITE_URL = 'https://chamaolucca.com.br';

const REDIRECT_URLS = [
  `${SITE_URL}/**`,
  `${SITE_URL}/redefinir-senha`,
  'http://localhost:5173/**',
  'http://localhost:5174/**',
  'http://localhost:3000/**',
  'https://chamaolucca.netlify.app/**',
];

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

console.log('\n🔐 Auth config — before');
const before = await api('/config/auth');
console.log('  site_url:', before.site_url);
console.log('  uri_allow_list:', before.uri_allow_list || before.additional_redirect_urls);

console.log('\n🔧 Updating auth URLs...');
const after = await api('/config/auth', {
  method: 'PATCH',
  body: {
    site_url: SITE_URL,
    uri_allow_list: REDIRECT_URLS.join(','),
  },
});

console.log('\n✅ Auth config — after');
console.log('  site_url:', after.site_url);
console.log('  uri_allow_list:', after.uri_allow_list || after.additional_redirect_urls);
console.log('\n🎉 Auth URLs configured for go-live.\n');
