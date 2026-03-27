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
      user_id,
      profiles:user_id ( id, name, email, phone )
    `)
    .order('created_at', { ascending: false });

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

/**
 * Update order status.
 */
export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
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
