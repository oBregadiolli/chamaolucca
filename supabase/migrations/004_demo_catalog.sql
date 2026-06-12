-- Chama O Lucca — demo catalog for local/staging testing
-- Safe to skip in production (products can be removed via admin)

-- @chunk
insert into public.categories (name, slug, description, sort_order, active) values
  ('Frutas', 'frutas', 'Frutas frescas da região', 1, true),
  ('Verduras', 'verduras', 'Folhas e hortaliças', 2, true),
  ('Legumes', 'legumes', 'Legumes selecionados', 3, true)
on conflict (slug) do nothing;

-- @chunk
insert into public.products (name, slug, description, price, unit, active, featured, category_id)
select
  v.name,
  v.slug,
  v.description,
  v.price,
  v.unit,
  true,
  v.featured,
  c.id
from (values
  ('Banana Prata', 'banana-prata', 'Kg de banana prata madura', 5.99, 'kg', true),
  ('Tomate Salada', 'tomate-salada', 'Kg de tomate vermelho', 6.50, 'kg', false),
  ('Alface Crespa', 'alface-crespa', 'Maço de alface hidropônica', 3.50, 'un', true),
  ('Cenoura', 'cenoura', 'Kg de cenoura limpa', 4.20, 'kg', false),
  ('Maçã Gala', 'maca-gala', 'Kg de maçã gala', 9.90, 'kg', true)
) as v(name, slug, description, price, unit, featured)
join public.categories c on c.slug = case
  when v.slug in ('banana-prata', 'maca-gala') then 'frutas'
  when v.slug = 'alface-crespa' then 'verduras'
  else 'legumes'
end
on conflict (slug) do nothing;

-- @chunk
insert into public.coupons (code, description, discount_type, discount_value, min_order, max_uses, active)
values ('BEMVINDO10', '10% de desconto — primeiro pedido', 'percentage', 10, 20, 100, true)
on conflict (code) do nothing;
