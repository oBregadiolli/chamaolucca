/**
 * Applies supabase/migrations/*.sql to a Supabase project via Management API.
 * Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-supabase-schema.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

async function runQuery(query, label) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }

  if (!res.ok) {
    console.error(`\n❌ ${label} failed (${res.status}):`);
    console.error(typeof body === 'string' ? body : JSON.stringify(body, null, 2));
    process.exit(1);
  }

  console.log(`✅ ${label}`);
  return body;
}

for (const file of files) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const chunks = sql.split(/^-- @chunk$/m).map((c) => c.trim()).filter(Boolean);

  console.log(`\n📄 ${file} (${chunks.length} chunk(s))`);

  for (let i = 0; i < chunks.length; i++) {
    await runQuery(chunks[i], `${file} [${i + 1}/${chunks.length}]`);
  }
}

console.log('\n🎉 Schema applied successfully.');
