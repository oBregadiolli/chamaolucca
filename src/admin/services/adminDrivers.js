import { supabase } from '../../lib/supabase';

// ─── Fetch all drivers ────────────────────────────────────────────────
export async function fetchAllDrivers({ activeOnly = false } = {}) {
  let q = supabase.from('drivers').select('*').order('name');
  if (activeOnly) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

// ─── Fetch a single driver ────────────────────────────────────────────
export async function fetchDriverById(driverId) {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();
  if (error) throw error;
  return data;
}

// ─── Fetch driver + their routes ─────────────────────────────────────
export async function fetchDriverWithRoutes(driverId) {
  const [driverRes, routesRes] = await Promise.all([
    supabase.from('drivers').select('*').eq('id', driverId).single(),
    supabase
      .from('routes')
      .select(`
        id, name, delivery_date, status, maps_url,
        is_optimized, route_metadata, created_at,
        route_stops ( id, stop_status )
      `)
      .eq('driver_id', driverId)
      .order('delivery_date', { ascending: false })
      .limit(20),
  ]);
  if (driverRes.error) throw driverRes.error;
  return { driver: driverRes.data, routes: routesRes.data ?? [] };
}

// ─── Create driver ───────────────────────────────────────────────────
export async function createDriver({ name, phone, notes }) {
  const { data, error } = await supabase
    .from('drivers')
    .insert({ name: name.trim(), phone: phone?.trim() || null, notes: notes?.trim() || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Update driver ────────────────────────────────────────────────────
export async function updateDriver(driverId, { name, phone, notes, active }) {
  const patch = {};
  if (name   !== undefined) patch.name   = name.trim();
  if (phone  !== undefined) patch.phone  = phone?.trim() || null;
  if (notes  !== undefined) patch.notes  = notes?.trim() || null;
  if (active !== undefined) patch.active = active;

  const { data, error } = await supabase
    .from('drivers')
    .update(patch)
    .eq('id', driverId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Toggle driver active ─────────────────────────────────────────────
export async function toggleDriverActive(driverId, currentActive) {
  return updateDriver(driverId, { active: !currentActive });
}

// ─── Delete driver (soft: deactivate instead if has routes) ──────────
export async function deleteDriver(driverId) {
  // Check if driver has routes
  const { count } = await supabase
    .from('routes')
    .select('id', { count: 'exact', head: true })
    .eq('driver_id', driverId);

  if (count > 0) {
    // Has routes — deactivate instead
    return updateDriver(driverId, { active: false });
  }

  const { error } = await supabase.from('drivers').delete().eq('id', driverId);
  if (error) throw error;
  return null; // deleted
}

// ─── Assign driver to route ───────────────────────────────────────────
// Also denormalises name+phone for backward compat with admin UI
export async function assignDriverToRoute(routeId, driver) {
  // driver = null means unassign
  const patch = driver
    ? { driver_id: driver.id, driver_name: driver.name, driver_phone: driver.phone ?? null }
    : { driver_id: null, driver_name: null, driver_phone: null };

  const { data, error } = await supabase
    .from('routes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', routeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
