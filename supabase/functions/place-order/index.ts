import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabaseAdmin.ts';

type ProductRow = {
  id: string;
  name: string;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  active: boolean;
};

type CartItemRow = {
  product_id: string;
  quantity: number;
  products: ProductRow | null;
};

type DeliveryData = {
  address?: string;
  complement?: string | null;
  city?: string;
  neighborhood?: string;
  phone?: string;
  zip_code?: string;
  reference?: string;
  delivery_date?: string;
  delivery_time?: string;
  delivery_mode?: string;
};

type NeighborhoodRow = {
  name: string;
  city: string;
};

function normalizeCityName(value: string | undefined | null): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function parseCoverageCities(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((c) => c.trim()).filter(Boolean);
}

/** Mesma lógica de AddressStep.jsx (normalizeCityName + isAddressInCoverage). */
function isAddressInCoverage(
  delivery: DeliveryData,
  coverageCities: string[],
  allNeighborhoods: NeighborhoodRow[],
): boolean {
  if (!coverageCities.length) return true;

  const allowed = new Set(coverageCities.map(normalizeCityName));
  const explicitCity = delivery.city?.trim();
  if (explicitCity) {
    return allowed.has(normalizeCityName(explicitCity));
  }

  const neighborhood = delivery.neighborhood?.trim();
  if (neighborhood) {
    return allNeighborhoods.some(
      (n) =>
        normalizeCityName(n.name) === normalizeCityName(neighborhood) &&
        allowed.has(normalizeCityName(n.city)),
    );
  }

  return false;
}

function effectivePrice(product: ProductRow): number {
  const price = Number(product.price);
  const promo = product.promotional_price != null ? Number(product.promotional_price) : null;
  if (promo != null && promo > 0 && promo < price) return promo;
  return price;
}

function isStoreOpen(openTime: string, closeTime: string, now = new Date()): boolean {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ ok: false, error: 'Não autenticado' }, 401, req);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ ok: false, error: 'Não autenticado' }, 401, req);
    }

    const supabase = getServiceClient();
    const body = await req.json();
    const { cart_id, coupon_code, delivery_data, payment_method, test_mode } = body as {
      cart_id?: string;
      coupon_code?: string | null;
      delivery_data?: DeliveryData;
      payment_method?: string;
      test_mode?: boolean;
    };

    if (!cart_id) {
      return jsonResponse({ ok: false, error: 'cart_id é obrigatório' }, 400, req);
    }
    if (!delivery_data?.address?.trim()) {
      return jsonResponse({ ok: false, error: 'Endereço de entrega é obrigatório' }, 400, req);
    }
    if (!payment_method) {
      return jsonResponse({ ok: false, error: 'Forma de pagamento é obrigatória' }, 400, req);
    }

    const { data: cart, error: cartMetaError } = await supabase
      .from('carts')
      .select('id, user_id, status')
      .eq('id', cart_id)
      .single();

    if (cartMetaError || !cart) {
      return jsonResponse({ ok: false, error: 'Carrinho não encontrado' }, 400, req);
    }
    if (cart.user_id !== user.id) {
      return jsonResponse({ ok: false, error: 'Carrinho inválido' }, 403, req);
    }
    if (cart.status !== 'active') {
      return jsonResponse({ ok: false, error: 'Carrinho já foi finalizado' }, 400, req);
    }

    const { data: cartItems, error: cartError } = await supabase
      .from('cart_items')
      .select('product_id, quantity, products(id, name, price, promotional_price, image_url, active)')
      .eq('cart_id', cart_id);

    if (cartError || !cartItems?.length) {
      return jsonResponse({ ok: false, error: 'Carrinho vazio ou inválido' }, 400, req);
    }

    const lineItems: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      image_url: string | null;
    }> = [];

    for (const item of cartItems as CartItemRow[]) {
      const product = item.products;
      if (!product?.active) {
        return jsonResponse({
          ok: false,
          error: `Produto "${product?.name ?? 'indisponível'}" não está mais disponível`,
        }, 400, req);
      }
      // B1: rejeita quantidade inválida (payload manipulado)
      if (!item.quantity || item.quantity <= 0) {
        return jsonResponse({
          ok: false,
          error: `Quantidade inválida para "${product.name}"`,
        }, 400, req);
      }
      const unitPrice = effectivePrice(product);
      lineItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: unitPrice,
        image_url: product.image_url || null,
      });
    }

    const subtotal = parseFloat(
      lineItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0).toFixed(2),
    );

    let discount = 0;
    let couponId: string | null = null;
    let appliedCouponCode: string | null = null;

    if (coupon_code?.trim()) {
      const normalizedCode = coupon_code.toUpperCase().trim();
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', normalizedCode)
        .eq('active', true)
        .maybeSingle();

      if (coupon) {
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          return jsonResponse({ ok: false, error: 'Cupom expirado' }, 400, req);
        }
        if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) {
          return jsonResponse({ ok: false, error: 'Cupom esgotado' }, 400, req);
        }
        const minOrder = Number(coupon.min_order ?? 0);
        if (minOrder > 0 && subtotal < minOrder) {
          return jsonResponse({
            ok: false,
            error: `Pedido mínimo R$ ${minOrder.toFixed(2)} para este cupom`,
          }, 400, req);
        }

        discount = coupon.discount_type === 'percentage'
          ? parseFloat((subtotal * (Number(coupon.discount_value) / 100)).toFixed(2))
          : Math.min(Number(coupon.discount_value), subtotal);
        couponId = coupon.id;
        appliedCouponCode = coupon.code;
      }
    }

    const { data: settings } = await supabase.from('store_settings').select('key, value');
    const cfg = Object.fromEntries((settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value]));

    // Em produção ALLOW_TEST_ORDERS deve ser false.
    // Bypass de horário e cobertura só para E2E/staging: secret + body.test_mode juntos.
    const allowTestBypass =
      Deno.env.get('ALLOW_TEST_ORDERS') === 'true' && test_mode === true;

    if (!allowTestBypass) {
      const openTime = cfg.open_time || '07:00';
      const closeTime = cfg.close_time || '23:00';
      if (!isStoreOpen(openTime, closeTime)) {
        return jsonResponse({
          ok: false,
          error: `Loja fechada no momento. Abrimos às ${openTime} e fechamos às ${closeTime}.`,
        }, 400, req);
      }

      const coverageCities = parseCoverageCities(cfg.coverage_cities);
      if (coverageCities.length) {
        const { data: neighborhoods } = await supabase
          .from('neighborhoods')
          .select('name, city');

        if (!isAddressInCoverage(delivery_data, coverageCities, neighborhoods ?? [])) {
          return jsonResponse({ ok: false, error: 'outside_coverage_area' }, 400, req);
        }
      }
    }

    let shipping = parseFloat(cfg.shipping_fee || '4');
    if (
      cfg.free_shipping_active === 'true' &&
      parseFloat(cfg.free_shipping_above || '0') > 0 &&
      subtotal >= parseFloat(cfg.free_shipping_above)
    ) {
      shipping = 0;
    }

    // M1: total nunca negativo (ex: cupom fixo alto + frete)
    const total = Math.max(0, parseFloat((subtotal - discount + shipping).toFixed(2)));

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        subtotal,
        shipping,
        discount,
        total,
        coupon_code: appliedCouponCode,
        delivery_address: delivery_data.address!.trim(),
        delivery_complement: delivery_data.complement?.trim() || null,
        neighborhood: delivery_data.neighborhood || '',
        phone: delivery_data.phone || '',
        zip_code: delivery_data.zip_code || '',
        delivery_reference: delivery_data.reference || '',
        delivery_date: delivery_data.delivery_date || null,
        delivery_time: delivery_data.delivery_time || null,
        delivery_mode: delivery_data.delivery_mode || null,
        payment_method,
        payment_status: 'pending',
        payment_provider: 'mercadopago',
        status: 'received',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[place-order] insert order', orderError);
      throw orderError ?? new Error('Falha ao criar pedido');
    }

    const { error: itemsError } = await supabase.from('order_items').insert(
      lineItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        image_url: item.image_url,
      })),
    );

    if (itemsError) {
      console.error('[place-order] insert items', itemsError);
      // A1: tenta rollback e loga se falhar (sem transação real no Supabase)
      const { error: rollbackErr } = await supabase.from('orders').delete().eq('id', order.id);
      if (rollbackErr) {
        console.error('[place-order] ROLLBACK FAILED — orphan order:', order.id, rollbackErr.message);
      }
      throw itemsError;
    }

    if (couponId) {
      // C1: RPC atômico — retorna false se o cupom esgotou entre a verificação e aqui (race condition)
      const { data: couponOk, error: couponErr } = await supabase.rpc('increment_coupon_use', { coupon_id: couponId });
      if (couponErr || couponOk === false) {
        const { error: ri } = await supabase.from('order_items').delete().eq('order_id', order.id);
        const { error: ro } = await supabase.from('orders').delete().eq('id', order.id);
        if (ri) console.error('[place-order] rollback order_items failed:', ri.message);
        if (ro) console.error('[place-order] rollback order failed:', ro.message);
        return jsonResponse({ ok: false, error: 'Cupom esgotado ou indisponível' }, 400, req);
      }
    }

    await supabase.from('cart_items').delete().eq('cart_id', cart_id);
    await supabase.from('carts').update({ status: 'converted', updated_at: new Date().toISOString() }).eq('id', cart_id);

    if (test_mode === true) {
      const allowTest = Deno.env.get('ALLOW_TEST_ORDERS') === 'true';
      if (!allowTest) {
        await supabase.from('order_items').delete().eq('order_id', order.id);
        await supabase.from('orders').delete().eq('id', order.id);
        return jsonResponse({ ok: false, error: 'Modo teste desabilitado no servidor' }, 403, req);
      }
      await supabase.from('orders').update({
        payment_status: 'approved',
        payment_id: `TEST_${Date.now()}`,
        paid_at: new Date().toISOString(),
      }).eq('id', order.id);
      order.payment_status = 'approved';
    }

    const mpItems = lineItems.map((item) => ({
      title: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    return jsonResponse({
      ok: true,
      order,
      items: mpItems,
      subtotal,
      shipping,
      discount,
      total,
      test_mode: test_mode === true,
    }, 200, req);
  } catch (err) {
    console.error('[place-order]', err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ ok: false, error: message }, 500, req);
  }
});
