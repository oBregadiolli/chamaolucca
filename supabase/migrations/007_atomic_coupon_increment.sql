-- Migration 007: corrige race condition em increment_coupon_use (C1)
-- e adiciona validação de quantity > 0 no place-order (B1)
--
-- O RPC agora faz o check atômico dentro do UPDATE:
--   só incrementa SE uses_count < max_uses (ou max_uses IS NULL).
-- Retorna TRUE se incrementou, FALSE se o cupom já estava esgotado.
-- A edge function place-order já trata o retorno FALSE como erro.

-- Necessário: DROP antes do CREATE porque o tipo de retorno mudou de void → boolean.
-- PostgreSQL não permite alterar o tipo de retorno com CREATE OR REPLACE.
drop function if exists public.increment_coupon_use(uuid);

create function public.increment_coupon_use(coupon_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rows_updated int;
begin
  update public.coupons
  set    uses_count = uses_count + 1,
         updated_at = now()
  where  id = coupon_id
    and  (max_uses is null or uses_count < max_uses);

  get diagnostics rows_updated = row_count;

  -- TRUE  → incrementado com sucesso
  -- FALSE → cupom já esgotado (nenhuma linha atualizada)
  return rows_updated > 0;
end;
$$;

grant execute on function public.increment_coupon_use(uuid) to authenticated;
grant execute on function public.increment_coupon_use(uuid) to service_role;
