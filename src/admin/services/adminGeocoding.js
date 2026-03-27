import { supabase } from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ─── Geocoding stats ──────────────────────────────────────────────────
export async function fetchGeocodingStats() {
  // Total active orders
  const { count: total } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .not('status', 'eq', 'cancelled');

  // Already geocoded
  const { count: geocoded } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .not('status', 'eq', 'cancelled')
    .not('lat', 'is', null);

  // Pending (no lat/lng, not cancelled)
  const { count: pending } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .not('status', 'eq', 'cancelled')
    .is('lat', null);

  return {
    total:    total   ?? 0,
    geocoded: geocoded ?? 0,
    pending:  pending  ?? 0,
  };
}

// ─── Fetch orders missing geocoding ──────────────────────────────────
export async function fetchNonGeocodedOrders(limit = 50) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, delivery_address, neighborhood, status, created_at')
    .is('lat', null)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

// ─── Geocode a single order (calls the Edge Function) ────────────────
export async function geocodeOrder(orderId, force = false) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/geocode-address`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ order_id: orderId, force }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Geocode batch (retroactive — calls the Edge Function in batch mode)
export async function geocodeBatch(limit = 50) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/geocode-address`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ batch: true, limit }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
