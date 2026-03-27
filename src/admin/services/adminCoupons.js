import { supabase } from '../../lib/supabase';

export async function fetchAllCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCoupon(payload) {
  const { data, error } = await supabase
    .from('coupons')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCoupon(id, payload) {
  const { data, error } = await supabase
    .from('coupons')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCouponActive(id, active) {
  const { data, error } = await supabase
    .from('coupons')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Validate a coupon code and return computed discount amount */
export async function validateCoupon(code, subtotal) {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();

  if (error) return { valid: false, reason: 'Erro ao validar cupom.' };
  if (!data)  return { valid: false, reason: 'Cupom inválido ou não encontrado.' };
  if (!data.active) return { valid: false, reason: 'Este cupom está inativo.' };

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return { valid: false, reason: 'Este cupom está expirado.' };
  }

  if (data.max_uses != null && data.uses_count >= data.max_uses) {
    return { valid: false, reason: 'Este cupom atingiu o limite de usos.' };
  }

  const minOrder = parseFloat(data.min_order ?? 0);
  if (minOrder > 0 && subtotal < minOrder) {
    return {
      valid: false,
      reason: `Pedido mínimo de R$ ${minOrder.toFixed(2).replace('.', ',')} para este cupom.`,
    };
  }

  let discountAmount;
  if (data.discount_type === 'percentage') {
    discountAmount = parseFloat((subtotal * (data.discount_value / 100)).toFixed(2));
  } else {
    discountAmount = Math.min(parseFloat(data.discount_value), subtotal);
  }

  return {
    valid: true,
    coupon: data,
    discountAmount,
    discountLabel:
      data.discount_type === 'percentage'
        ? `${data.discount_value}% de desconto`
        : `R$ ${discountAmount.toFixed(2).replace('.', ',')} de desconto`,
  };
}

/** Increment uses_count after order is placed */
export async function incrementCouponUse(couponId) {
  await supabase.rpc('increment_coupon_use', { coupon_id: couponId }).catch(() => {
    // fallback: direct update
    supabase
      .from('coupons')
      .update({ uses_count: supabase.rpc('increment_coupon_use') })
      .eq('id', couponId);
  });
}
