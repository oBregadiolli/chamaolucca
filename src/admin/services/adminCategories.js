import { supabase } from '../../lib/supabase';

/**
 * Fetch all categories ordered by sort_order.
 */
export async function fetchAllCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, image_url, sort_order, active, description, created_at')
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Create a new category.
 */
export async function createCategory(category) {
  const { data, error } = await supabase
    .from('categories')
    .insert(category)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a category.
 */
export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle category active/inactive.
 */
export async function toggleCategoryActive(id, active) {
  return updateCategory(id, { active });
}
