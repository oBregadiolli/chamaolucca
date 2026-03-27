import { supabase } from '../../lib/supabase';

/**
 * Fetch all products with category name.
 */
export async function fetchAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, name, description, price, promotional_price,
      image_url, unit, active, featured, stock, slug, created_at,
      category_id,
      categories:category_id ( id, name )
    `)
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Create a new product.
 */
export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing product.
 */
export async function updateProduct(id, updates) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle product active/inactive.
 */
export async function toggleProductActive(id, active) {
  return updateProduct(id, { active });
}
