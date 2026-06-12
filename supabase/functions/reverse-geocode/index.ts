import { handleOptions, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'GOOGLE_MAPS_API_KEY não configurado' }, 500, req);
    }

    const { lat, lng } = await req.json();
    if (lat == null || lng == null) {
      return jsonResponse({ ok: false, error: 'lat e lng são obrigatórios' }, 400, req);
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'pt-BR');

    const res = await fetch(url);
    const data = await res.json();
    return jsonResponse(data, 200, req);
  } catch (err) {
    console.error('[reverse-geocode]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
