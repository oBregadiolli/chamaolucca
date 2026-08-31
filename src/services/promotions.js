import { supabase } from '../lib/supabase';
import { attachPromotionProducts, getPromotionProductIds } from '../../supabase/functions/_shared/promotionEngine';

export async function fetchActivePromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;

  const promotions = data ?? [];
  const ids = getPromotionProductIds(promotions);
  if (ids.length === 0) return promotions;

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, price, promotional_price, image_url, active')
    .in('id', ids);
  if (productsError) throw productsError;

  return attachPromotionProducts(promotions, products ?? []);
}
