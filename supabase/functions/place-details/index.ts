import { handleOptions, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'GOOGLE_MAPS_API_KEY não configurado' }, 500, req);
    }

    const { place_id } = await req.json();
    if (!place_id) {
      return jsonResponse({ ok: false, error: 'place_id é obrigatório' }, 400, req);
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', place_id);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('fields', 'address_component,formatted_address,geometry,name');

    const res = await fetch(url);
    const data = await res.json();
    return jsonResponse(data, 200, req);
  } catch (err) {
    console.error('[place-details]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
