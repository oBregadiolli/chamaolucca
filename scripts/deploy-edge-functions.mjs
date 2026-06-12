/**
 * Deploy all Edge Functions to Supabase.
 *
 * Prerequisites:
 *   1. SUPABASE_ACCESS_TOKEN (Dashboard > Account > Access Tokens)
 *   2. Secrets in project: MP_ACCESS_TOKEN, GOOGLE_MAPS_API_KEY
 *      (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
 *   node scripts/deploy-edge-functions.mjs
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
const functions = fs.readdirSync(functionsDir).filter((name) => {
  const stat = fs.statSync(path.join(functionsDir, name));
  return stat.isDirectory() && !name.startsWith('_');
});

console.log(`Deploying ${functions.length} functions to ${PROJECT_REF}...\n`);

for (const fn of functions) {
  console.log(`→ ${fn}`);
  const result = spawnSync(
    'npx',
    ['supabase', 'functions', 'deploy', fn, '--project-ref', PROJECT_REF, '--no-verify-jwt'],
    {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env },
    },
  );

  if (result.status !== 0) {
    console.error(`\n❌ Failed to deploy ${fn}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n🎉 All edge functions deployed.');
