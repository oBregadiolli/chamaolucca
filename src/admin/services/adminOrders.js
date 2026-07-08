import { supabase } from '../../lib/supabase';

/**
 * Fetch all orders with profile data (admin-only).
 */
export async function fetchAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total, subtotal, shipping, discount,
      delivery_address, delivery_complement, neighborhood, zip_code,
      delivery_date, delivery_time, payment_method, phone,
      observations, notes, coupon_code, created_at, updated_at,
      payment_status, payment_id, payment_provider, paid_at,
      lat, lng, geocoded_at,
      driver_id, driver_name, driver_phone,
      preparing_at, delivering_at, delivered_at, cancelled_at,
      user_id,
      profiles:user_id ( id, name, email, phone )
    `)
    .order('created_at', { ascending: false })
    .limit(500); // M3: evita degradação do painel com alto volume

  if (error) throw error;
  return data;
}

/**
 * Fetch a single order with its items.
 */
export async function fetchOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total, subtotal, shipping, discount,
      delivery_address, delivery_complement, neighborhood, zip_code,
      delivery_date, delivery_time, payment_method, phone,
      observations, notes, coupon_code, created_at, updated_at,
      payment_status, payment_id, payment_provider, paid_at,
      pix_qr_code, pix_expires_at,
      driver_id, driver_name, driver_phone,
      preparing_at, delivering_at, delivered_at, cancelled_at,
      user_id,
      profiles:user_id ( id, name, email, phone ),
      order_items (
        id, product_name, quantity, unit_price, total_price, image_url
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data;
}

// Returns which timestamp column to stamp for a given status
function statusTimestampField(status) {
  const map = { preparing: 'preparing_at', delivering: 'delivering_at', delivered: 'delivered_at', cancelled: 'cancelled_at' };
  return map[status] ?? null;
}

/**
 * Update order status, stamping the correct timestamp column.
 */
export async function updateOrderStatus(orderId, status) {
  const now = new Date().toISOString();
  const tsField = statusTimestampField(status);
  const patch = { status, updated_at: now, ...(tsField ? { [tsField]: now } : {}) };

  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update order status to 'delivering' and assign a driver atomically.
 * driver can be null (no driver assigned).
 */
export async function updateOrderStatusWithDriver(orderId, status, driver) {
  const now = new Date().toISOString();
  const tsField = statusTimestampField(status);
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      driver_id:    driver?.id    ?? null,
      driver_name:  driver?.name  ?? null,
      driver_phone: driver?.phone ?? null,
      updated_at:   now,
      ...(tsField ? { [tsField]: now } : {}),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Dashboard summary counts.
 */
export async function fetchOrderSummary() {
  const { data, error } = await supabase
    .from('orders')
    .select('status');

  if (error) throw error;

  const summary = {
    total: data.length,
    received: 0,
    preparing: 0,
    delivering: 0,
    delivered: 0,
    cancelled: 0,
  };

  data.forEach(({ status }) => {
    if (status in summary) summary[status]++;
  });

  return summary;
}
