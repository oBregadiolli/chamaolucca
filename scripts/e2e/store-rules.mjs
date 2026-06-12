/**
 * Plano F — Regras de loja (horário, cobertura, place-order server-side)
 */
import { chromium } from 'playwright';
import { loadEnv, createReporter, getE2ESession } from './_helpers.mjs';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const DEV = process.env.E2E_DEV_URL || 'http://localhost:5173';
const PROJECT_REF = 'wjkytzvgbvkcaqjrqsbu';

const r = createReporter('Plano F — store rules');
const EDGE_DEPLOYED = process.env.E2E_EDGE_RULES_DEPLOYED === '1';

async function fetchServiceRoleKey() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const keys = await res.json();
      return keys?.find((k) => k.name === 'service_role')?.api_key ?? null;
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  return null;
}

async function readSetting(key, serviceKey) {
  const res = await fetch(`${URL}/rest/v1/store_settings?key=eq.${key}&select=value`, {
    headers: { apikey: ANON, Authorization: `Bearer ${serviceKey}` },
  });
  const rows = await res.json();
  return rows?.[0]?.value ?? null;
}

async function upsertSetting(key, value, label, serviceKey) {
  await fetch(`${URL}/rest/v1/store_settings`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({ key, value, label }),
  });
}

const CLOSED_HOURS_PAYLOAD = [
  { key: 'open_time', value: '23:59' },
  { key: 'close_time', value: '23:59' },
  { key: 'coverage_cities', value: 'Alagoinhas' },
  { key: 'shipping_fee', value: '4' },
  { key: 'free_shipping_active', value: 'false' },
  { key: 'free_shipping_above', value: '0' },
];

const OPEN_HOURS_PAYLOAD = [
  { key: 'open_time', value: '00:00' },
  { key: 'close_time', value: '23:59' },
  { key: 'coverage_cities', value: 'Alagoinhas' },
  { key: 'shipping_fee', value: '4' },
  { key: 'free_shipping_active', value: 'false' },
  { key: 'free_shipping_above', value: '0' },
];

function openSettingsRouteHandler(route) {
  const body = OPEN_HOURS_PAYLOAD.map(({ key, value }) => ({ key, value }));
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': `0-${body.length - 1}/${body.length}` },
    body: JSON.stringify(body),
  });
}

function closedSettingsRouteHandler(route) {
  const body = CLOSED_HOURS_PAYLOAD.map(({ key, value }) => ({ key, value }));
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': `0-${body.length - 1}/${body.length}` },
    body: JSON.stringify(body),
  });
}

function authStorageKey() {
  return `sb-${PROJECT_REF}-auth-token`;
}

async function fetchDemoProduct(token) {
  const res = await fetch(`${URL}/rest/v1/products?active=eq.true&select=id,name,price,image_url&limit=1`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token ?? ANON}` },
  });
  const [product] = await res.json();
  if (!product?.id) throw new Error('Nenhum produto ativo para seed do carrinho');
  return product;
}

async function seedBrowserSession(page, session, product) {
  const authPayload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in ?? 3600,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    token_type: session.token_type ?? 'bearer',
    user: session.user,
  };
  const cartItem = { ...product, quantity: 1 };

  await page.goto(`${DEV}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(
    ({ authKey, authValue, cart }) => {
      localStorage.setItem(authKey, JSON.stringify(authValue));
      localStorage.setItem('lucca_cart', JSON.stringify(cart));
    },
    { authKey: authStorageKey(), authValue: authPayload, cart: [cartItem] },
  );
}

async function loginInBrowser(page, email, password) {
  await page.goto(`${DEV}/loja`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: /^entrar$/i }).click();
  await page.waitForSelector('.auth-modal', { timeout: 10000 });
  await page.locator('.auth-tab').filter({ hasText: /^entrar$/i }).click();
  await page.locator('#auth-email, input[type="email"]').first().fill(email);
  await page.locator('#auth-password, input[type="password"]').first().fill(password);
  await page.locator('.auth-submit, button[type="submit"]').first().click();
  await page.waitForSelector('.auth-modal', { state: 'hidden', timeout: 20000 }).catch(() => {});
}

// ── F1: ClosedStoreDialog na UI ─────────────────────────────
try {
  const session = await getE2ESession(URL, ANON);
  if (!session?.access_token) throw new Error('Sessão E2E indisponível');

  const product = await fetchDemoProduct(session.access_token);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.route('**/rest/v1/store_settings*', closedSettingsRouteHandler);
  await seedBrowserSession(page, session, product);

  await page.goto(`${DEV}/checkout`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('.gs-dialog', { timeout: 20000 });
  const heading = await page.locator('.gs-dialog .gs-heading').innerText();
  if (/ainda não estamos abertos/i.test(heading)) {
    r.ok('F1 ClosedStoreDialog UI', 'checkout bloqueado');
  } else {
    r.fail('F1 ClosedStoreDialog UI', heading.slice(0, 80));
  }
  await browser.close();
} catch (e) {
  r.fail('F1 ClosedStoreDialog UI', e.message);
}

// ── F2: OutsideAreaDialog + Avançar bloqueado ───────────────
try {
  const session = await getE2ESession(URL, ANON);
  if (!session?.access_token) throw new Error('Sessão E2E indisponível');

  const product = await fetchDemoProduct(session.access_token);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.route('**/rest/v1/store_settings*', openSettingsRouteHandler);
  await page.route('**/rest/v1/neighborhoods*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { name: 'Barra', city: 'Salvador' },
        { name: 'Centro', city: 'Alagoinhas' },
      ]),
    });
  });

  await seedBrowserSession(page, session, product);
  await page.goto(`${DEV}/checkout`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('#co-street', { timeout: 20000 });

  await page.locator('#co-street').fill('Av Teste E2E, 100');
  await page.locator('#co-neighborhood').fill('Barra');
  await page.locator('ul li button').filter({ hasText: 'Barra' }).first().click();
  await page.locator('#co-phone').fill('(75) 98888-7777');
  await page.locator('#co-zip').fill('40000-000');

  await Promise.all([
    page.waitForSelector('.gs-dialog', { timeout: 10000 }),
    page.locator('.co-advance-btn').click(),
  ]);
  const outsideText = await page.locator('.gs-dialog .gs-heading').innerText();
  if (/fora.*área de entrega/i.test(outsideText)) {
    r.ok('F2 OutsideAreaDialog UI', 'dialog exibido');
  } else {
    r.fail('F2 OutsideAreaDialog UI', outsideText.slice(0, 80));
  }

  const scheduleVisible = await page.getByText(/quando entregamos/i).count();
  if (scheduleVisible === 0) r.ok('F2 Avançar bloqueado', 'permanece no AddressStep');
  else r.fail('F2 Avançar bloqueado', 'avançou para próximo step');

  await browser.close();
} catch (e) {
  r.fail('F2 OutsideAreaDialog UI', e.message);
}

// ── F3/F4: API place-order (depende edge deployada) ─────────
if (!EDGE_DEPLOYED) {
  r.fail('F3 API fechada sem test_mode', 'SKIP — E2E_EDGE_RULES_DEPLOYED≠1');
  r.fail('F4 API fora cobertura', 'SKIP — E2E_EDGE_RULES_DEPLOYED≠1');
} else {
  try {
    const serviceKey = await fetchServiceRoleKey();
  const session = await getE2ESession(URL, ANON);
  const token = session?.access_token;
  const userId = session?.user?.id;

  if (!serviceKey || !token || !userId) {
    r.fail('F3 API fechada sem test_mode', 'service role ou sessão indisponível');
    r.fail('F4 API fora cobertura', 'service role ou sessão indisponível');
  } else {
    const authHeaders = { apikey: ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    const origOpen = await readSetting('open_time', serviceKey);
    const origClose = await readSetting('close_time', serviceKey);
    const origCoverage = await readSetting('coverage_cities', serviceKey);

    try {
      await upsertSetting('open_time', '23:59', 'Abertura', serviceKey);
      await upsertSetting('close_time', '23:59', 'Fechamento', serviceKey);

      const productsRes = await fetch(`${URL}/rest/v1/products?active=eq.true&select=id,price&limit=1`, {
        headers: { apikey: ANON, Authorization: `Bearer ${token}` },
      });
      const [product] = await productsRes.json();
      const cartRes = await fetch(`${URL}/rest/v1/carts`, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, status: 'active' }),
      });
      let cart = (await cartRes.json())[0];
      if (!cart?.id) {
        const existing = await fetch(`${URL}/rest/v1/carts?user_id=eq.${userId}&status=eq.active&select=id`, {
          headers: { apikey: ANON, Authorization: `Bearer ${token}` },
        });
        cart = (await existing.json())[0];
      }

      await fetch(`${URL}/rest/v1/cart_items`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cart_id: cart.id,
          product_id: product.id,
          quantity: 1,
          unit_price: product.price,
        }),
      });

      const closedRes = await fetch(`${URL}/functions/v1/place-order`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cart_id: cart.id,
          delivery_data: {
            address: 'Rua Teste, 1',
            city: 'Alagoinhas',
            neighborhood: 'Centro',
            phone: '75988887777',
            zip_code: '48000-000',
          },
          payment_method: 'pix',
        }),
      });
      const closedBody = await closedRes.json();
      if (closedRes.status === 400 && !closedBody.ok) {
        r.ok('F3 API fechada sem test_mode', closedBody.error?.slice(0, 40) || '400');
      } else {
        r.fail('F3 API fechada sem test_mode', `${closedRes.status} ${JSON.stringify(closedBody)}`);
      }

      await upsertSetting('open_time', '00:00', 'Abertura', serviceKey);
      await upsertSetting('close_time', '23:59', 'Fechamento', serviceKey);
      await upsertSetting('coverage_cities', 'Alagoinhas', 'Cidades', serviceKey);

      const cart2Res = await fetch(`${URL}/rest/v1/carts`, {
        method: 'POST',
        headers: { ...authHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: userId, status: 'active' }),
      });
      let cart2 = (await cart2Res.json())[0];
      if (!cart2?.id) {
        const existing = await fetch(`${URL}/rest/v1/carts?user_id=eq.${userId}&status=eq.active&select=id`, {
          headers: { apikey: ANON, Authorization: `Bearer ${token}` },
        });
        cart2 = (await existing.json())[0];
      }
      await fetch(`${URL}/rest/v1/cart_items`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cart_id: cart2.id,
          product_id: product.id,
          quantity: 1,
          unit_price: product.price,
        }),
      });

      const outRes = await fetch(`${URL}/functions/v1/place-order`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          cart_id: cart2.id,
          delivery_data: {
            address: 'Av Teste, 100',
            city: 'Salvador',
            neighborhood: 'Centro',
            phone: '75988887777',
            zip_code: '40000-000',
          },
          payment_method: 'pix',
        }),
      });
      const outBody = await outRes.json();
      if (outRes.status === 400 && outBody.error === 'outside_coverage_area') {
        r.ok('F4 API fora cobertura', 'outside_coverage_area');
      } else {
        r.fail('F4 API fora cobertura', `${outRes.status} ${JSON.stringify(outBody)}`);
      }
    } finally {
      if (origOpen != null) await upsertSetting('open_time', origOpen, 'Abertura', serviceKey);
      if (origClose != null) await upsertSetting('close_time', origClose, 'Fechamento', serviceKey);
      if (origCoverage != null) await upsertSetting('coverage_cities', origCoverage, 'Cidades', serviceKey);
    }
  }
  } catch (e) {
    r.fail('F3 API fechada sem test_mode', e.message);
    r.fail('F4 API fora cobertura', e.message);
  }
}

process.exit(r.summary() ? 0 : 1);
