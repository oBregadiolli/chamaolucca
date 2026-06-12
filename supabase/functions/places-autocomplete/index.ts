import { handleOptions, jsonResponse } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return jsonResponse({ ok: false, error: 'GOOGLE_MAPS_API_KEY não configurado' }, 500, req);
    }

    const { input } = await req.json();
    if (!input || String(input).length < 3) {
      return jsonResponse({ predictions: [], status: 'ZERO_RESULTS' }, 200, req);
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', String(input));
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('components', 'country:br');
    url.searchParams.set('types', 'address');

    const res = await fetch(url);
    const data = await res.json();
    return jsonResponse(data, 200, req);
  } catch (err) {
    console.error('[places-autocomplete]', err);
    return jsonResponse({ ok: false, error: String(err), predictions: [] }, 500, req);
  }
});
