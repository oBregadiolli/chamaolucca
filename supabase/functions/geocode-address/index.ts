import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabaseAdmin.ts';

function buildOrderAddress(order: {
  delivery_address: string;
  delivery_complement?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
}): string {
  const parts = [order.delivery_address];
  if (order.delivery_complement) parts.push(order.delivery_complement);
  if (order.neighborhood) parts.push(order.neighborhood);
  parts.push('Alagoinhas', 'BA', 'Brasil');
  // CEP por último ajuda o Google a disambiguar entre ruas homônimas
  if (order.zip_code) parts.push(order.zip_code);
  return parts.filter(Boolean).join(', ');
}

async function geocodeOne(
  apiKey: string,
  order: {
    id: string;
    delivery_address: string;
    delivery_complement?: string | null;
    neighborhood?: string | null;
    zip_code?: string | null;
    lat?: number | null;
    geocoded_at?: string | null;
  },
  force: boolean,
) {
  if (!force && order.lat != null && order.geocoded_at) {
    return { ok: true, skipped: true, order_id: order.id };
  }

  const address = buildOrderAddress(order);
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('region', 'br');

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results?.[0]) {
    return {
      ok: false,
      order_id: order.id,
      error: data.error_message || data.status || 'Geocoding failed',
    };
  }

  const { lat, lng } = data.results[0].geometry.location;
  const supabase = getServiceClient();
  const { error } = await supabase
    .from('orders')
    .update({ lat, lng, geocoded_at: new Date().toISOString() })
    .eq('id', order.id);

  if (error) {
    return { ok: false, order_id: order.id, error: error.message };
  }

  return { ok: true, order_id: order.id, lat, lng };
}

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'GOOGLE_MAPS_API_KEY não configurado' }, 500, req);
    }

    const body = await req.json();
    const supabase = getServiceClient();

    if (body.batch) {
      const limit = Math.min(Number(body.limit) || 50, 100);
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, delivery_address, delivery_complement, neighborhood, zip_code, lat, geocoded_at')
        .is('lat', null)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return jsonResponse({ ok: false, error: error.message }, 500, req);
      }

      let succeeded = 0;
      let failed = 0;
      const results = [];

      for (const order of orders ?? []) {
        const result = await geocodeOne(apiKey, order, Boolean(body.force));
        results.push(result);
        if (result.ok && !result.skipped) succeeded++;
        else if (!result.ok) failed++;
      }

      return jsonResponse({
        ok: true,
        batch: true,
        processed: results.length,
        succeeded,
        failed,
        results,
      }, 200, req);
    }

    const orderId = body.order_id;
    if (!orderId) {
      return jsonResponse({ ok: false, error: 'order_id é obrigatório' }, 400, req);
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('id, delivery_address, delivery_complement, neighborhood, zip_code, lat, geocoded_at')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return jsonResponse({ ok: false, error: error?.message || 'Pedido não encontrado' }, 404, req);
    }

    const result = await geocodeOne(apiKey, order, Boolean(body.force));
    return jsonResponse(result, result.ok ? 200 : 400, req);
  } catch (err) {
    console.error('[geocode-address]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
