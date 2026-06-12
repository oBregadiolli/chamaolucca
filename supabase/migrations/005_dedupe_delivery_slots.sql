-- Remove delivery_slots duplicados (seed aplicada 2x) e impede repetição.

-- 1) Reapontar exceções dos duplicados para o slot canônico (mais antigo)
with ranked as (
  select
    id,
    row_number() over (
      partition by slot_start, slot_end, sort_order
      order by created_at, id
    ) as rn,
    first_value(id) over (
      partition by slot_start, slot_end, sort_order
      order by created_at, id
    ) as keep_id
  from public.delivery_slots
),
dupes as (
  select id as dup_id, keep_id from ranked where rn > 1
)
update public.delivery_slot_exceptions dse
set slot_id = d.keep_id
from dupes d
where dse.slot_id = d.dup_id
  and not exists (
    select 1
    from public.delivery_slot_exceptions x
    where x.slot_id = d.keep_id
      and x.date = dse.date
  );

-- 2) Exceções que colidiriam no unique (slot_id, date) — remover as do duplicado
with ranked as (
  select
    id,
    row_number() over (
      partition by slot_start, slot_end, sort_order
      order by created_at, id
    ) as rn
  from public.delivery_slots
)
delete from public.delivery_slot_exceptions dse
using ranked r
where dse.slot_id = r.id
  and r.rn > 1;

-- 3) Remover slots duplicados
with ranked as (
  select
    id,
    row_number() over (
      partition by slot_start, slot_end, sort_order
      order by created_at, id
    ) as rn
  from public.delivery_slots
)
delete from public.delivery_slots ds
using ranked r
where ds.id = r.id
  and r.rn > 1;

-- 4) Garantir unicidade da janela de entrega
create unique index if not exists delivery_slots_unique_window
  on public.delivery_slots (slot_start, slot_end, sort_order);

-- 5) Re-seed idempotente (caso algum slot tenha sido removido acidentalmente)
insert into public.delivery_slots (slot_label, slot_start, slot_end, sort_order, max_orders) values
  ('Manhã cedo', '07:00', '09:00', 1, 15),
  ('Manhã', '09:00', '11:00', 2, 20),
  ('Meio-dia', '11:00', '13:00', 3, 20),
  ('Tarde', '14:00', '16:00', 4, 20),
  ('Final da tarde', '16:00', '18:00', 5, 15),
  ('Noite', '18:00', '20:00', 6, 10)
on conflict (slot_start, slot_end, sort_order) do nothing;
