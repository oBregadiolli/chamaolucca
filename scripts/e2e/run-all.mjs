/**
 * Executa todos os planos E2E automatizados (A–E)
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '../..');

const plans = [
  { id: 'A', name: 'Smoke API', script: '../verify-supabase.mjs' },
  { id: 'B', name: 'Webhook MP', script: 'webhook-mp.mjs' },
  { id: 'C', name: 'Auth + Profile', script: 'auth-profile.mjs' },
  { id: 'D', name: 'place-order', script: 'place-order-flow.mjs' },
  { id: 'E', name: 'Loja UI', script: 'store-ui.mjs' },
  { id: 'F', name: 'Store rules', script: 'store-rules.mjs' },
];

console.log('\n🧪 ChamaOLucca — Suite E2E automatizada\n');
console.log('Planos: ' + plans.map((p) => p.id).join(', '));
console.log('Detalhes: docs/E2E-PLANOS.md\n');

const summary = [];

for (const plan of plans) {
  console.log(`\n━━━ Plano ${plan.id}: ${plan.name} ━━━\n`);
  const scriptPath = path.join(__dirname, plan.script);
  const maxAttempts = plan.id === 'A' ? 3 : 1;
  let ok = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) console.log(`  ↻ Plano A — tentativa ${attempt}/${maxAttempts}\n`);
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    ok = result.status === 0;
    if (ok) break;
  }
  summary.push({ ...plan, ok });
}

console.log('\n══════════════════════════════════════');
console.log(' RESUMO FINAL');
console.log('══════════════════════════════════════\n');

for (const s of summary) {
  console.log(`  ${s.ok ? '✅' : '❌'} Plano ${s.id} — ${s.name}`);
}

const allOk = summary.every((s) => s.ok);
console.log(`\n  Total: ${summary.filter((s) => s.ok).length}/${summary.length} planos OK\n`);

if (!allOk) process.exit(1);
