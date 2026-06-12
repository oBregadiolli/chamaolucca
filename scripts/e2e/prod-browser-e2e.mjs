/**
 * E2E visual + fluxos — produção (Playwright)
 * Uso: node scripts/e2e/prod-browser-e2e.mjs
 * Env: E2E_BASE_URL=https://chamaolucca.com.br
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.E2E_BASE_URL || 'https://chamaolucca.com.br').replace(/\/$/, '');
const OUT = path.join(__dirname, '../e2e-prod-report');
const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const RUN_DIR = path.join(OUT, ts);

const results = [];

function log(step, status, detail = '') {
  results.push({ step, status, detail });
  const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
  console.log(`${icon} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function shot(page, name) {
  const file = path.join(RUN_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function waitStable(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);
}

async function runFlow(name, fn) {
  try {
    await fn();
    log(name, 'pass');
  } catch (err) {
    log(name, 'fail', err.message?.slice(0, 120));
  }
}

fs.mkdirSync(RUN_DIR, { recursive: true });

console.log(`\n🌐 E2E Playwright — ${BASE}`);
console.log(`📸 Screenshots: ${RUN_DIR}\n`);

const browser = await chromium.launch({ headless: true });
const iphone = devices['iPhone 14'];
const desktop = { viewport: { width: 1280, height: 800 } };

const contexts = [
  { label: 'desktop', ctx: await browser.newContext(desktop) },
  { label: 'mobile', ctx: await browser.newContext({ ...iphone, locale: 'pt-BR' }) },
];

for (const { label, ctx } of contexts) {
  const page = await ctx.newPage();
  const prefix = label;

  await runFlow(`${prefix}: Home`, async () => {
    const res = await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 45000 });
    if (!res?.ok()) throw new Error(`HTTP ${res?.status()}`);
    await waitStable(page);
    const title = await page.title();
    if (!title.includes('ChamaoLucca') && !title.includes('Lucca')) throw new Error(`title: ${title}`);
    await shot(page, `${prefix}-01-home`);
  });

  await runFlow(`${prefix}: Loja`, async () => {
    await page.goto(`${BASE}/loja`, { waitUntil: 'networkidle', timeout: 45000 });
    await waitStable(page);
    const cards = page.locator('[class*="product"], .product-card, article, .store-product');
    const count = await cards.count();
    if (count === 0) {
      const body = await page.locator('body').innerText();
      if (!/produto|loja|mercado/i.test(body)) throw new Error('Loja sem conteúdo visível');
    }
    await shot(page, `${prefix}-02-loja`);
  });

  await runFlow(`${prefix}: Adicionar ao carrinho`, async () => {
    const addBtn = page.locator('button.product-add-dark, button[aria-label^="Adicionar"]').first();
    await addBtn.waitFor({ state: 'visible', timeout: 15000 });
    await addBtn.click();
    await page.waitForTimeout(800);
    await shot(page, `${prefix}-03-carrinho-adicionado`);
  });

  await runFlow(`${prefix}: Painel carrinho`, async () => {
    const sacola = page.locator('.store-sidebar, .cart-panel, [class*="cart"]').first();
    if (await sacola.count()) {
      await sacola.scrollIntoViewIfNeeded().catch(() => {});
    }
    await shot(page, `${prefix}-04-painel-carrinho`);
  });

  await runFlow(`${prefix}: Modal login`, async () => {
    const loginBtn = page.getByRole('button', { name: /^entrar$/i }).first();
    if (await loginBtn.count() === 0) {
      log(`${prefix}: Modal login`, 'warn', 'Botão Entrar não encontrado');
      return;
    }
    await loginBtn.click();
    await page.waitForSelector('.auth-modal', { timeout: 10000 });
    await shot(page, `${prefix}-05-auth-login`);
    await page.locator('.auth-close').click().catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(300);
  });

  await runFlow(`${prefix}: Termos`, async () => {
    await page.goto(`${BASE}/termos`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitStable(page);
    const h1 = await page.locator('h1').first().innerText();
    if (!/termos/i.test(h1)) throw new Error(h1);
    await shot(page, `${prefix}-06-termos`);
  });

  await runFlow(`${prefix}: Privacidade`, async () => {
    await page.goto(`${BASE}/privacidade`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitStable(page);
    const h1 = await page.locator('h1').first().innerText();
    if (!/privacidade/i.test(h1)) throw new Error(h1);
    await shot(page, `${prefix}-07-privacidade`);
  });

  await runFlow(`${prefix}: Reset senha (UI)`, async () => {
    await page.goto(`${BASE}/redefinir-senha`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitStable(page);
    await shot(page, `${prefix}-08-reset-senha`);
  });

  await runFlow(`${prefix}: 404`, async () => {
    await page.goto(`${BASE}/rota-inexistente-xyz`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitStable(page);
    await shot(page, `${prefix}-09-404`);
  });

  await runFlow(`${prefix}: Checkout (guard)`, async () => {
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle', timeout: 45000 });
    await waitStable(page);
    await shot(page, `${prefix}-10-checkout`);
  });

  await runFlow(`${prefix}: Fluxo sacola → checkout`, async () => {
    await page.goto(`${BASE}/loja`, { waitUntil: 'networkidle', timeout: 45000 });
    await waitStable(page);
    await page.locator('button.product-add-dark, button[aria-label^="Adicionar"]').first().click();
    await page.waitForTimeout(500);
    const checkoutBtn = page.locator('button, a').filter({ hasText: /finalizar|checkout|continuar/i }).first();
    if (await checkoutBtn.count()) {
      await checkoutBtn.click();
      await page.waitForTimeout(1200);
    }
    await shot(page, `${prefix}-10b-sacola-checkout`);
  });

  await runFlow(`${prefix}: Perfil (guard)`, async () => {
    await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle', timeout: 45000 });
    await waitStable(page);
    await shot(page, `${prefix}-11-perfil`);
  });

  await ctx.close();
}

// Desktop-only: produto + admin
{
  const ctx = await browser.newContext(desktop);
  const page = await ctx.newPage();

  await runFlow('desktop: Detalhe produto', async () => {
    await page.goto(`${BASE}/loja`, { waitUntil: 'networkidle', timeout: 45000 });
    await waitStable(page);
    const card = page.locator('.product-card-store [role="button"]').first();
    if (await card.count() === 0) throw new Error('Card de produto não encontrado');
    await card.click();
    await page.waitForURL(/\/item\//, { timeout: 15000 });
    await waitStable(page);
    await shot(page, 'desktop-12-produto-detalhe');
  });

  await runFlow('desktop: Admin (guard)', async () => {
    await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 30000 });
    await waitStable(page);
    await shot(page, 'desktop-13-admin');
  });

  await ctx.close();
}

await browser.close();

const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const warned = results.filter((r) => r.status === 'warn').length;

const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>E2E ${BASE}</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px}
h1{font-size:1.4rem} .meta{color:#94a3b8;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}
.card{background:#1e293b;border-radius:12px;overflow:hidden;border:1px solid #334155}
.card img{width:100%;display:block;background:#fff}
.card figcaption{padding:10px 12px;font-size:.85rem}
.pass{color:#4ade80}.fail{color:#f87171}.warn{color:#fbbf24}
</style></head><body>
<h1>E2E Playwright — ${BASE}</h1>
<p class="meta">${ts} · ${passed} ok · ${failed} falhas · ${warned} avisos</p>
<div class="grid">
${fs.readdirSync(RUN_DIR).filter((f) => f.endsWith('.png')).sort().map((f) => `<figure class="card"><img src="${f}" alt="${f}"><figcaption>${f}</figcaption></figure>`).join('\n')}
</div>
<h2>Resultados</h2>
<ul>${results.map((r) => `<li class="${r.status}">${r.step}${r.detail ? `: ${r.detail}` : ''}</li>`).join('')}</ul>
</body></html>`;

fs.writeFileSync(path.join(RUN_DIR, 'report.html'), html);
fs.writeFileSync(path.join(RUN_DIR, 'results.json'), JSON.stringify({ base: BASE, ts, passed, failed, warned, results }, null, 2));

console.log('\n══════════════════════════════════════');
console.log(`  ${passed} pass · ${failed} fail · ${warned} warn`);
console.log(`  Relatório: ${path.join(RUN_DIR, 'report.html')}`);
console.log('══════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
