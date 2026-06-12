# 🔍 PROMPT DE VERIFICAÇÃO — ChamaoLucca Novo Banco

> Cole este prompt na mesma sessão do agente que reimplementou o banco.
> Ele vai verificar TUDO e retornar um relatório de status.
>
> **Projeto:** `wjkytzvgbvkcaqjrqsbu`  
> **Script automatizado:** `node scripts/verify-db-prompt.mjs` (requer `SUPABASE_ACCESS_TOKEN`)

---

## INSTRUÇÃO

Faça uma verificação completa do banco de dados do ChamaoLucca que acabamos de implementar.
Execute TODOS os queries abaixo via `execute_sql` e me retorne os resultados em formato de tabela.

### 1. TABELAS (espero 16)

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

**Tabelas esperadas:** profiles, categories, products, addresses, neighborhoods, carts, cart_items, coupons, orders, order_items, drivers, routes, route_stops, store_settings, delivery_slots, delivery_slot_exceptions

### 2. RLS ATIVO EM TODAS AS TABELAS

```sql
SELECT relname AS table_name, relrowsecurity AS rls_enabled 
FROM pg_class 
WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' 
ORDER BY relname;
```

**Esperado:** TODOS com `rls_enabled = true`

### 3. POLICIES (espero ~20+)

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### 4. FUNCTIONS/RPCs (espero 4 principais + helpers)

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'handle_new_user',
    'increment_coupon_use',
    'get_slot_availability',
    'get_slot_exceptions_for_date'
  )
ORDER BY routine_name;
```

**Esperados:** handle_new_user, increment_coupon_use, get_slot_availability, get_slot_exceptions_for_date

**Nota:** `order_number` usa a sequence `order_number_seq` com `DEFAULT nextval(...)` em `orders.order_number` — não há função `set_order_number`.

### 5. TRIGGERS (espero 1 em auth + helpers em public)

```sql
SELECT trigger_name, event_object_table, event_manipulation, action_timing, trigger_schema
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'trg_set_order_number')
   OR (trigger_schema = 'public' AND event_object_table = 'orders')
ORDER BY trigger_schema, event_object_table;
```

**Esperado:** `on_auth_user_created` em `auth.users` (cria profile via `handle_new_user`)

**Nota:** não existe `trg_set_order_number`; numeração via `order_number_seq`.

### 6. SEQUENCES

```sql
SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public';
```

**Esperado:** order_number_seq

### 7. STORAGE BUCKETS

```sql
SELECT id, name, public FROM storage.buckets;
```

**Esperado:** product-images (public = true)

### 8. SEEDS — store_settings

```sql
SELECT key, value, label FROM public.store_settings ORDER BY key;
```

**Esperado:** 10 registros (close_time, coverage_cities, free_shipping_above, free_shipping_active, open_time, shipping_fee, store_address, store_city, store_lat, store_lng)

### 9. SEEDS — delivery_slots

```sql
SELECT slot_label, slot_start, slot_end, sort_order, active, max_orders
FROM public.delivery_slots
ORDER BY sort_order;
```

**Esperado:** 6 slots (07:00–20:00). Índice único em `(slot_start, slot_end, sort_order)` após migration 005.

```sql
SELECT COUNT(*)::int AS total,
       COUNT(DISTINCT (slot_start, slot_end, sort_order))::int AS unique_slots
FROM public.delivery_slots;
```

**Esperado:** `total = 6` e `unique_slots = 6`

### 10. SEEDS — neighborhoods

```sql
SELECT city, name, active FROM public.neighborhoods ORDER BY name;
```

**Esperado:** 5 bairros de Alagoinhas (Centro, Alagoinhas Velha, Barreiro, Santa Teresinha, Jardim Petrolar — migration 002)

### 11. COLUNAS CRÍTICAS — verificar que existem

```sql
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
  (table_name = 'neighborhoods') OR
  (table_name = 'delivery_slots' AND column_name = 'max_orders') OR
  (table_name = 'delivery_slot_exceptions' AND column_name IN ('slot_id', 'active_override', 'max_orders_override')) OR
  (table_name = 'addresses' AND column_name IN ('phone', 'reference')) OR
  (table_name = 'order_items' AND column_name = 'total_price') OR
  (table_name = 'profiles' AND column_name IN ('whatsapp', 'cpf', 'promo_emails'))
)
ORDER BY table_name, column_name;
```

### 12. EDGE FUNCTIONS

Liste todas as Edge Functions deployadas no projeto (`npx supabase functions list --project-ref wjkytzvgbvkcaqjrqsbu`).

**Esperadas (9):** create-mp-preference, geocode-address, optimize-route, places-autocomplete, place-details, fetch-neighborhoods, reverse-geocode, place-order, mp-webhook

---

## FORMATO DO RELATÓRIO

Depois de executar tudo, me dê um relatório neste formato:

```
✅ ou ❌ | Item              | Esperado | Encontrado | Notas
---------|-------------------|----------|------------|------
         | Tabelas           | 16       |            |
         | RLS ativo         | 16/16    |            |
         | Policies          | 20+      |            |
         | Functions/RPCs    | 4        |            |
         | Trigger auth      | 1        |            | on_auth_user_created
         | Sequences         | 1        |            | order_number_seq
         | Storage buckets   | 1        |            |
         | store_settings    | 10 keys  |            |
         | delivery_slots    | 6 slots  |            | total = unique = 6
         | neighborhoods     | 5 bairros|            |
         | Colunas críticas  | todas    |            |
         | Edge Functions    | 9        |            |
```

Se algo estiver faltando, LISTE exatamente o que está faltando para eu corrigir.
