/**
 * Plano D — Carrinho + place-order server-side
 */
import { loadEnv, createReporter, getE2ESession } from './_helpers.mjs';

const env = loadEnv();
const URL = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;

const r = createReporter('Plano D — place-order');

const session = await getE2ESession(URL, ANON);
const token = session?.access_token;
const userId = session?.user?.id;

if (!token || !userId) {
  r.fail('D0 Auth', 'Sessão E2E indisponível');
  process.exit(1);
}
r.ok('D0 Sessão E2E', userId.slice(0, 8));

const authHeaders = { apikey: ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

const productsRes = await fetch(`${URL}/rest/v1/products?active=eq.true&select=id,name,price&limit=3`, {
  headers: { apikey: ANON, Authorization: `Bearer ${token}` },
});
const products = await productsRes.json();
if (!products?.length) {
  r.fail('D0 Produtos demo', 'nenhum produto ativo');
  process.exit(1);
}

const cartRes = await fetch(`${URL}/rest/v1/carts`, {
  method: 'POST',
  headers: { ...authHeaders, Prefer: 'return=representation' },
  body: JSON.stringify({ user_id: userId, status: 'active' }),
});
let cart;
if (cartRes.status === 409 || cartRes.status === 400) {
  const existing = await fetch(`${URL}/rest/v1/carts?user_id=eq.${userId}&status=eq.active&select=id`, {
    headers: { apikey: ANON, Authorization: `Bearer ${token}` },
  });
  cart = (await existing.json())[0];
} else {
  cart = (await cartRes.json())[0];
}

if (!cart?.id) {
  r.fail('D1 Carrinho', await cartRes.text());
  process.exit(1);
}
r.ok('D1 Carrinho ativo', cart.id.slice(0, 8));

for (const p of products) {
  await fetch(`${URL}/rest/v1/cart_items`, {
    method: 'POST',
    headers: { ...authHeaders, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      cart_id: cart.id,
      product_id: p.id,
      quantity: 4,
      unit_price: p.price,
    }),
  });
}
r.ok('D2 Itens no carrinho', `${products.length} produtos x4`);

const delivery_data = {
  address: 'Rua Teste E2E, 100',
  city: 'Alagoinhas',
  neighborhood: 'Centro',
  phone: '75988887777',
  zip_code: '48000-000',
  reference: 'Teste automatizado',
  delivery_date: new Date().toISOString().slice(0, 10),
  delivery_time: 'express',
  delivery_mode: 'express',
};

const placeRes = await fetch(`${URL}/functions/v1/place-order`, {
  method: 'POST',
  headers: authHeaders,
  body: JSON.stringify({
    cart_id: cart.id,
    coupon_code: null,
    delivery_data,
    payment_method: 'pix',
    test_mode: true,
  }),
});
const place = await placeRes.json();

if (place?.ok && place.order?.id) {
  r.ok('D3 place-order', `total R$ ${place.total}`);
} else {
  r.fail('D3 place-order', `${placeRes.status} ${JSON.stringify(place)}`);
  process.exit(1);
}

const itemsRes = await fetch(
  `${URL}/rest/v1/order_items?order_id=eq.${place.order.id}&select=quantity,unit_price`,
  { headers: { apikey: ANON, Authorization: `Bearer ${token}` } },
);
const orderItems = await itemsRes.json();
if (orderItems?.length > 0) r.ok('D4 order_items', `${orderItems.length} linhas`);
else r.fail('D4 order_items', 'vazio');

const cartCheck = await fetch(`${URL}/rest/v1/carts?id=eq.${cart.id}&select=status`, {
  headers: { apikey: ANON, Authorization: `Bearer ${token}` },
});
const cartAfter = (await cartCheck.json())[0];
if (cartAfter?.status === 'converted') r.ok('D5 Carrinho converted');
else r.fail('D5 Carrinho status', cartAfter?.status);

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

if (cart2?.id) {
  await fetch(`${URL}/rest/v1/cart_items`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cart_id: cart2.id,
      product_id: products[0].id,
      quantity: 5,
      unit_price: products[0].price,
    }),
  });

  const couponPlace = await fetch(`${URL}/functions/v1/place-order`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      cart_id: cart2.id,
      coupon_code: 'BEMVINDO10',
      delivery_data,
      payment_method: 'pix',
      test_mode: true,
    }),
  });
  const couponData = await couponPlace.json();
  if (couponData?.ok && Number(couponData.discount) > 0) {
    r.ok('D6 Cupom BEMVINDO10', `desconto R$ ${couponData.discount}`);
  } else {
    r.fail('D6 Cupom', JSON.stringify(couponData));
  }
} else {
  r.fail('D6 Cupom', 'sem carrinho para 2º pedido');
}

process.exit(r.summary() ? 0 : 1);
