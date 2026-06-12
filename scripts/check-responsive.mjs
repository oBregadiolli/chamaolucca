/**
 * Quick responsive audit: horizontal overflow + screenshots.
 * Usage: node scripts/check-responsive.mjs [baseUrl]
 */
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const BASE = process.argv[2] || 'http://localhost:5174';
const OUT = join(process.cwd(), 'scripts', 'responsive-audit');

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
];

const ROUTES = [
  { path: '/', label: 'landing' },
  { path: '/loja', label: 'loja' },
  { path: '/checkout', label: 'checkout' },
  { path: '/perfil', label: 'perfil' },
];

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(doc.scrollWidth, body?.scrollWidth || 0);
    const clientW = doc.clientWidth;
    return {
      scrollWidth: scrollW,
      clientWidth: clientW,
      overflow: scrollW - clientW,
    };
  });
}

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: 'pt-BR',
    });
    const page = await context.newPage();
    const url = `${BASE}${route.path}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      const overflow = await checkOverflow(page);
      const file = `${route.label}-${vp.name}.png`;
      await page.screenshot({ path: join(OUT, file), fullPage: false });
      results.push({
        route: route.path,
        viewport: vp.name,
        size: `${vp.width}x${vp.height}`,
        overflowPx: overflow.overflow,
        ok: overflow.overflow <= 2,
        screenshot: file,
      });
    } catch (err) {
      results.push({
        route: route.path,
        viewport: vp.name,
        error: String(err.message || err),
        ok: false,
      });
    }
    await context.close();
  }
}

await browser.close();

const report = {
  base: BASE,
  at: new Date().toISOString(),
  summary: {
    total: results.length,
    ok: results.filter((r) => r.ok).length,
    overflowIssues: results.filter((r) => r.overflowPx > 2),
    errors: results.filter((r) => r.error),
  },
  results,
};

await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.overflowIssues.length) {
  console.log('\nOverflow:');
  for (const r of report.summary.overflowIssues) {
    console.log(`  ${r.route} @ ${r.viewport}: +${r.overflowPx}px`);
  }
}
