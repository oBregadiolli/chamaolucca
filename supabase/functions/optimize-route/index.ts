import { handleOptions, jsonResponse } from '../_shared/cors.ts';

const MAX_STOPS = 25;

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(meters: number): string {
  const km = meters / 1000;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(meters)} m`;
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
    const stops = body.stops ?? [];

    if (stops.length < 1) {
      return jsonResponse({ ok: false, error: 'Informe ao menos 1 parada', code: 'NO_STOPS' }, 400, req);
    }

    if (stops.length > MAX_STOPS) {
      return jsonResponse({
        ok: false,
        error: `Máximo de ${MAX_STOPS} paradas por otimização`,
        code: 'TOO_MANY_STOPS',
      }, 400, req);
    }

    const missing = stops.filter((s: { lat?: number; lng?: number }) => s.lat == null || s.lng == null);
    if (missing.length > 0) {
      return jsonResponse({
        ok: false,
        error: 'Alguns pedidos não têm coordenadas',
        code: 'MISSING_COORDINATES',
      }, 400, req);
    }

    const originLat = body.origin_lat ?? stops[0].lat;
    const originLng = body.origin_lng ?? stops[0].lng;

    if (stops.length === 1) {
      const s = stops[0];
      const mapsParams = new URLSearchParams({
        api: '1',
        origin: `${originLat},${originLng}`,
        destination: `${s.lat},${s.lng}`,
        travelmode: 'driving',
      });
      return jsonResponse({
        ok: true,
        optimized_order: [s.order_id],
        maps_url: `https://www.google.com/maps/dir/?${mapsParams.toString()}`,
        total_duration_text: '—',
        total_distance_text: '—',
      }, 200, req);
    }



    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${originLat},${originLng}`);
    // Destino = última parada (não round-trip de volta à loja)
    const lastStop = stops[stops.length - 1];
    url.searchParams.set('destination', `${lastStop.lat},${lastStop.lng}`);
    // Waypoints = paradas intermediárias (sem a última, que é o destino)
    const waypointStops = stops.slice(0, -1);
    const waypointStr   = waypointStops.map((s: { lat: number; lng: number }) => `${s.lat},${s.lng}`).join('|');
    if (waypointStops.length > 0) {
      url.searchParams.set('waypoints', `optimize:true|${waypointStr}`);
    }
    url.searchParams.set('key', apiKey);
    url.searchParams.set('language', 'pt-BR');
    url.searchParams.set('region', 'br');

    if (body.departure_time) {
      const ts = Math.floor(new Date(body.departure_time).getTime() / 1000);
      if (!Number.isNaN(ts)) url.searchParams.set('departure_time', String(ts));
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.routes?.[0]) {
      return jsonResponse({
        ok: false,
        error: data.error_message || data.status || 'Falha na otimização',
        code: 'DIRECTIONS_ERROR',
      }, 400, req);
    }

    const route = data.routes[0];
    const orderIdx: number[] = route.waypoint_order ?? [];
    const optimized_order = orderIdx.map((i: number) => stops[i].order_id);

    let totalSeconds = 0;
    let totalMeters = 0;
    for (const leg of route.legs ?? []) {
      totalSeconds += leg.duration?.value ?? 0;
      totalMeters += leg.distance?.value ?? 0;
    }

    const mapsParams = new URLSearchParams({
      api: '1',
      origin: `${originLat},${originLng}`,
      travelmode: 'driving',
    });

    if (orderIdx.length > 0) {
      // Destino = último stop na ordem otimizada
      const lastOptIdx  = orderIdx[orderIdx.length - 1];
      const lastOptStop = stops[lastOptIdx];
      mapsParams.set('destination', `${lastOptStop.lat},${lastOptStop.lng}`);

      // Waypoints = demais stops otimizados (excluindo o destino final)
      const wpCoords = orderIdx.slice(0, -1).map((i: number) => `${stops[i].lat},${stops[i].lng}`);
      if (wpCoords.length > 0) {
        mapsParams.set('waypoints', wpCoords.join('|'));
      }
    } else {
      mapsParams.set('destination', `${lastStop.lat},${lastStop.lng}`);
    }

    return jsonResponse({
      ok: true,
      optimized_order,
      maps_url: `https://www.google.com/maps/dir/?${mapsParams.toString()}`,
      total_duration_text: formatDuration(totalSeconds),
      total_distance_text: formatDistance(totalMeters),
      total_duration_seconds: totalSeconds,
      total_distance_meters: totalMeters,
    }, 200, req);
  } catch (err) {
    console.error('[optimize-route]', err);
    return jsonResponse({ ok: false, error: String(err) }, 500, req);
  }
});
