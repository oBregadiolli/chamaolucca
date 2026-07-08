import { supabase } from '../../lib/supabase';

/**
 * Busca todos os clientes que já fizeram pelo menos 1 pedido.
 * Usa a tabela orders para encontrar user_ids únicos e puxa o perfil.
 */
export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      user_id,
      profiles:user_id ( id, name, email, phone, created_at )
    `)
    .neq('status', 'cancelled')
    .not('user_id', 'is', null);

  if (error) throw error;

  // Agrupa por user_id — um cliente pode ter N pedidos
  const map = new Map();
  for (const row of data ?? []) {
    if (!row.user_id || !row.profiles) continue;
    if (!map.has(row.user_id)) {
      map.set(row.user_id, {
        id:         row.profiles.id,
        name:       row.profiles.name,
        email:      row.profiles.email,
        phone:      row.profiles.phone,
        created_at: row.profiles.created_at,
        order_count: 0,
        total_spent: 0,
        last_order:  null,
      });
    }
  }
  return Array.from(map.values());
}

/**
 * Busca métricas agregadas dos clientes diretamente da tabela orders.
 */
export async function fetchCustomerList() {
  // Busca pedidos não-cancelados com perfil do cliente
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, user_id, total, created_at, status, payment_status,
      profiles:user_id ( id, name, email, phone )
    `)
    .not('user_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) throw error;

  // Agrega por cliente
  const map = new Map();
  for (const order of data ?? []) {
    if (!order.user_id || !order.profiles) continue;
    if (!map.has(order.user_id)) {
      map.set(order.user_id, {
        id:          order.profiles.id,
        name:        order.profiles.name  || '(sem nome)',
        email:       order.profiles.email || '—',
        phone:       order.profiles.phone || '—',
        order_count: 0,
        total_spent: 0,
        last_order:  null,
      });
    }
    const c = map.get(order.user_id);
    if (order.status !== 'cancelled') {
      c.order_count += 1;
      c.total_spent += parseFloat(order.total ?? 0);
    }
    if (!c.last_order || order.created_at > c.last_order) {
      c.last_order = order.created_at;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent);
}

/**
 * Busca todos os pedidos de um cliente específico.
 */
export async function fetchCustomerOrders(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, payment_status, payment_method,
      total, subtotal, shipping, discount, coupon_code,
      delivery_address, delivery_complement, neighborhood,
      delivery_date, delivery_time, created_at,
      order_items ( product_name, quantity, unit_price, image_url )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
