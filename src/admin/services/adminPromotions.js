import { supabase } from '../../lib/supabase';
import { attachPromotionProducts, getPromotionProductIds } from '../../../supabase/functions/_shared/promotionEngine';

export async function fetchAllPromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return hydratePromotions(data ?? []);
}

export async function fetchActivePromotions() {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return hydratePromotions(data ?? []);
}

export async function createPromotion(payload) {
  const { data, error } = await supabase
    .from('promotions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return hydratePromotion(data);
}

export async function updatePromotion(id, payload) {
  const { data, error } = await supabase
    .from('promotions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return hydratePromotion(data);
}

export async function togglePromotionActive(id, active) {
  return updatePromotion(id, { active });
}

async function hydratePromotion(promotion) {
  const [hydrated] = await hydratePromotions([promotion]);
  return hydrated;
}

async function hydratePromotions(promotions) {
  const ids = getPromotionProductIds(promotions);
  if (ids.length === 0) return promotions;

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, promotional_price, image_url, active')
    .in('id', ids);
  if (error) throw error;

  return attachPromotionProducts(promotions, products ?? []);
}
