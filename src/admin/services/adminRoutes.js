import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Constants ────────────────────────────────────────────────────────
export const MAX_STOPS_PER_ROUTE = 10; // safe Google Maps URL + operational limit
export const MAX_API_STOPS       = 24; // Directions API hard limit

// ─── Fetch all routes (listing page) ─────────────────────────────────
export async function fetchAllRoutes() {
  const { data, error } = await supabase
    .from('routes')
    .select(`
      id, name, delivery_date, status, maps_url, is_optimized,
      route_metadata, created_at, updated_at, batch_id, batch_index,
      driver_name, driver_phone, driver_id,
      profiles:created_by ( id, name ),
      route_stops ( id, stop_order, stop_status )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ─── Fetch a single route with full stop details ──────────────────────
export async function fetchRouteById(routeId) {
  const { data, error } = await supabase
    .from('routes')
    .select(`
      id, name, delivery_date, status, maps_url, is_optimized,
      route_metadata, created_at, updated_at, batch_id, batch_index,
      driver_name, driver_phone, driver_id,
      profiles:created_by ( id, name ),
      route_stops (
        id, stop_order, stop_status, notes,
        estimated_arrival, distance_from_prev, duration_from_prev,
        created_at, order_id,
        orders:order_id (
          id, order_number, delivery_address, delivery_complement,
          neighborhood, zip_code, delivery_date, delivery_time,
          total, status, lat, lng,
          profiles:user_id ( name, phone )
        )
      )
    `)
    .eq('id', routeId)
    .single();

  if (error) throw error;

  if (data?.route_stops) {
    data.route_stops.sort((a, b) => a.stop_order - b.stop_order);
  }
  return data;
}

// ─── Split orders into route groups ──────────────────────────────────
// Strategy:
//   1. Group by neighborhood (operationally meaningful)
//   2. Sub-divide groups that exceed MAX_STOPS_PER_ROUTE into chunks
//   3. Merge groups of 1 into the smallest adjacent group (avoid tiny routes)
export function splitOrdersIntoGroups(orders, maxPerGroup = MAX_STOPS_PER_ROUTE) {
  if (orders.length <= maxPerGroup) return [orders];

  // Step 1: Group by neighborhood, fallback to 'Sem bairro'
  const byNeigh = {};
  for (const o of orders) {
    const key = (o.neighborhood || 'Sem bairro').trim();
    if (!byNeigh[key]) byNeigh[key] = [];
    byNeigh[key].push(o);
  }

  // Step 2: Sub-divide large neighborhoods into chunks
  const groups = [];
  for (const orders of Object.values(byNeigh)) {
    for (let i = 0; i < orders.length; i += maxPerGroup) {
      groups.push(orders.slice(i, i + maxPerGroup));
    }
  }

  // Step 3: Merge singleton groups (1 stop) into the smallest other group
  const singles = groups.filter(g => g.length === 1);
  const rest    = groups.filter(g => g.length > 1);

  if (singles.length > 0 && rest.length > 0) {
    for (const s of singles) {
      rest.sort((a, b) => a.length - b.length);
      if (rest[0].length < maxPerGroup) {
        rest[0].push(...s);
      } else {
        rest.push(s); // no room, keep as solo
      }
    }
    return rest;
  }

  return groups;
}

// ─── Generate a route name for a group ───────────────────────────────
export function generateGroupName(orders, groupIndex, totalGroups, baseName) {
  const neighborhoods = [...new Set(orders.map(o => o.neighborhood).filter(Boolean))];
  const dateStr = orders.find(o => o.delivery_date)?.delivery_date;
  const date = dateStr
    ? new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : null;

  if (neighborhoods.length === 1) {
    return date
      ? `Rota ${date} — ${neighborhoods[0]} (${groupIndex}/${totalGroups})`
      : `Rota ${neighborhoods[0]} (${groupIndex}/${totalGroups})`;
  }

  return baseName
    ? `${baseName} — Parte ${groupIndex}/${totalGroups}`
    : `Rota ${groupIndex}/${totalGroups}`;
}

// ─── Create a single route + stops + update order statuses ───────────
export async function createRoute({
  name,
  deliveryDate,
  stops,           // [{ order_id, estimated_arrival?, distance_from_prev?, duration_from_prev? }]
  mapsUrl,
  createdBy,
  isOptimized = false,
  routeMetadata = null,
  batchId = null,
  batchIndex = null,
  driverId = null,
  driverName = null,
  driverPhone = null,
}) {
  // 1. Create route
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .insert({
      name,
      delivery_date:  deliveryDate,
      status:         'active',
      maps_url:       mapsUrl,
      created_by:     createdBy,
      is_optimized:   isOptimized,
      route_metadata: routeMetadata,
      batch_id:       batchId,
      batch_index:    batchIndex,
      driver_id:      driverId,
      driver_name:    driverName,
      driver_phone:   driverPhone,
    })
    .select()
    .single();

  if (routeError) throw routeError;

  // 2. Insert stops
  const stopsPayload = stops.map((stop, idx) => ({
    route_id:           route.id,
    order_id:           stop.order_id,
    stop_order:         idx + 1,
    stop_status:        'pending',
    estimated_arrival:  stop.estimated_arrival  ?? null,
    distance_from_prev: stop.distance_from_prev ?? null,
    duration_from_prev: stop.duration_from_prev ?? null,
  }));

  const { error: stopsError } = await supabase
    .from('route_stops')
    .insert(stopsPayload);

  if (stopsError) {
    await supabase.from('routes').delete().eq('id', route.id);
    throw stopsError;
  }

  // 3. Update order statuses to 'delivering' (+ driver if assigned)
  const orderIds = stops.map(s => s.order_id);
  const orderUpdate = {
    status:        'delivering',
    updated_at:    new Date().toISOString(),
    delivering_at: new Date().toISOString(),
    driver_id:     driverId,
    driver_name:   driverName,
    driver_phone:  driverPhone,
  };
  const { error: ordersError } = await supabase
    .from('orders')
    .update(orderUpdate)
    .in('id', orderIds);

  if (ordersError) throw ordersError;

  return route;
}

// ─── Create multiple routes in a batch ───────────────────────────────
// Each group: { name, stops, mapsUrl, isOptimized, routeMetadata, deliveryDate }
export async function createRouteBatch({ groups, createdBy }) {
  const batchId = crypto.randomUUID();
  const results = [];
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const route = await createRoute({
      name:          g.name,
      deliveryDate:  g.deliveryDate,
      stops:         g.stops,
      mapsUrl:       g.mapsUrl,
      createdBy,
      isOptimized:   g.isOptimized  ?? false,
      routeMetadata: g.routeMetadata ?? null,
      batchId,
      batchIndex: i + 1,
    });
    results.push(route);
  }
  return { batchId, routes: results };
}

// ─── Update route status ───────────────────────────────────────────────
export async function updateRouteStatus(routeId, status) {
  const { data, error } = await supabase
    .from('routes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', routeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Cancel route and revert undelivered orders back to 'preparing' ────
export async function cancelRoute(routeId) {
  // 1. Fetch stops that are not yet delivered
  const { data: stops } = await supabase
    .from('route_stops')
    .select('order_id, stop_status')
    .eq('route_id', routeId)
    .neq('stop_status', 'delivered');

  // 2. Cancel the route
  const { data, error } = await supabase
    .from('routes')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', routeId)
    .select()
    .single();
  if (error) throw error;

  // 3. Revert undelivered orders back to 'preparing'
  if (stops?.length) {
    const ids = stops.map(s => s.order_id).filter(Boolean);
    if (ids.length) {
      await supabase
        .from('orders')
        .update({ status: 'preparing', updated_at: new Date().toISOString() })
        .in('id', ids);
    }
  }

  return data;
}

// ─── Update route driver info ─────────────────────────────────────────
export async function updateRouteDriver(routeId, { driverName, driverPhone }) {
  const { data, error } = await supabase
    .from('routes')
    .update({
      driver_name:  driverName  ?? null,
      driver_phone: driverPhone ?? null,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', routeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Update a single stop status ──────────────────────────────────────
export async function updateStopStatus(stopId, stopStatus, orderId) {
  const { data: stop, error: stopError } = await supabase
    .from('route_stops')
    .update({ stop_status: stopStatus })
    .eq('id', stopId)
    .select()
    .single();

  if (stopError) throw stopError;

  if (stopStatus === 'delivered' && orderId) {
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'delivered', updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (orderError) throw orderError;
  }

  return stop;
}

// ─── Auto-complete route if all stops are delivered ───────────────────
export async function tryCompleteRoute(routeId) {
  const { data: stops } = await supabase
    .from('route_stops')
    .select('id, stop_status')
    .eq('route_id', routeId);

  if (!stops || stops.length === 0) return null;

  const allDone = stops.every(s => s.stop_status === 'delivered');
  if (!allDone) return null;

  return updateRouteStatus(routeId, 'completed');
}

// ─── Fetch store_settings for routing ────────────────────────────────
export async function fetchStoreRoutingSettings() {
  const { data } = await supabase
    .from('store_settings')
    .select('key, value')
    .in('key', ['store_city', 'store_address', 'store_lat', 'store_lng']);

  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
  return {
    city:    map.store_city    ?? 'Alagoinhas',
    address: map.store_address ?? '',
    lat:     map.store_lat     ? parseFloat(map.store_lat)  : null,
    lng:     map.store_lng     ? parseFloat(map.store_lng)  : null,
  };
}

// ─── Kept for backward compatibility ─────────────────────────────────
export async function fetchStoreCity() {
  const s = await fetchStoreRoutingSettings();
  return s.city;
}

// ─── Call optimize-route Edge Function ───────────────────────────────
export async function callOptimizeRoute({ stops, originLat, originLng, originAddress, departureTime }) {
  const body = {
    stops: stops.map(s => ({
      order_id: s.order_id ?? s.id,
      lat:      s.lat,
      lng:      s.lng,
      address:  s.delivery_address,
    })),
    ...(originLat     && { origin_lat:     originLat }),
    ...(originLng     && { origin_lng:     originLng }),
    ...(originAddress && { origin_address: originAddress }),
    ...(departureTime && { departure_time: departureTime }),
  };

  // A3: timeout de 30s — evita modal travado para sempre se a Edge Function demorar
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 30_000);

  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/optimize-route`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Tempo de otimização esgotado (30s). Verifique a conexão e tente novamente.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await res.json();
  if (!data.ok) throw Object.assign(new Error(data.error ?? 'Optimization failed'), { code: data.code });
  return data;
}

// ─── Build Google Maps URL (manual / fallback) ────────────────────────
export function buildMapsUrl(stops, city) {
  const buildAddr = (s) => {
    const parts = [s.delivery_address];
    if (s.delivery_complement) parts.push(s.delivery_complement);
    if (s.neighborhood)        parts.push(s.neighborhood);
    parts.push(city ?? 'Alagoinhas');
    return parts.filter(Boolean).join(', ');
  };

  const addresses = stops.map(buildAddr);
  if (addresses.length === 0) return '';

  const origin      = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints   = addresses.slice(1, -1);

  const base   = 'https://www.google.com/maps/dir/?api=1';
  const params = new URLSearchParams({ origin, destination, travelmode: 'driving' });

  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }

  return `${base}&${params.toString()}`;
}
