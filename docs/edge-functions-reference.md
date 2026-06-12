# ChamaoLucca — Referencia de Edge Functions
> Gerado em: 11/06/2026 | Todas as Edge Functions identificadas no codebase

---

## SUMARIO

| # | Endpoint | Status | Chamado por | Tipo |
|---|----------|--------|-------------|------|
| 1 | `create-mp-preference` | ✅ Ativo | Checkout, OrderConfirmation, Profile | Pagamento |
| 2 | `geocode-address` | ✅ Ativo | adminGeocoding.js | Geocodificacao |
| 3 | `optimize-route` | ✅ Ativo | adminRoutes.js | Rotas |
| 4 | `places-autocomplete` | ✅ Ativo | AddressStep.jsx | Endereco |
| 5 | `place-details` | ✅ Ativo | AddressStep.jsx | Endereco |
| 6 | `fetch-neighborhoods` | ✅ Ativo | AdminSettings.jsx | Dados IBGE |
| 7 | `reverse-geocode` | ✅ Ativo | AddressStep.jsx | Geolocalização |
| 8 | `place-order` | ✅ Ativo | Checkout.jsx | Seguranca |

---

## 1. create-mp-preference

**Proposito:** Cria uma preferencia de pagamento no Mercado Pago e retorna a URL de checkout.

**Metodo de chamada:** `supabase.functions.invoke('create-mp-preference', { body })`

**Payload (Request):**
```json
{
  "order_id": "uuid",
  "order_number": 1000,
  "items": [
    {
      "title": "Banana Prata",
      "quantity": 2,
      "unit_price": 5.99
    }
  ],
  "payer_email": "cliente@email.com",
  "payer_name": "Nome do Cliente",
  "shipping": 4.00,
  "app_url": "https://chamaolucca.com.br",
  "payment_method": "pix"
}
```

**Response esperada:**
```json
{
  "ok": true,
  "checkout_url": "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=..."
}
```

**Response de erro:**
```json
{
  "ok": false,
  "error": "Descricao do erro"
}
```

**Chamado de:**
- `src/pages/Checkout.jsx:389` — apos criar pedido
- `src/pages/OrderConfirmation.jsx:278` — retry de pagamento
- `src/pages/Profile.jsx:395` — retry de pagamento do historico

**Observacoes:**
- O campo `payment_method` (pix/credit/debit) permite que o MP pre-selecione a aba
- O campo `shipping` é enviado separado dos items
- URLs de callback usam `app_url` como base

---

## 2. geocode-address

**Proposito:** Geocodifica enderecos de pedidos usando Google Maps Geocoding API.

**Metodo de chamada:** `fetch(SUPABASE_URL + '/functions/v1/geocode-address', { ... })`

**Modo Single — Payload:**
```json
{
  "order_id": "uuid",
  "force": false
}
```

**Modo Batch — Payload:**
```json
{
  "batch": true,
  "limit": 50
}
```

**Chamado de:**
- `src/admin/services/adminGeocoding.js:51` — geocodeOrder() (single)
- `src/admin/services/adminGeocoding.js:65` — geocodeBatch() (batch)

**Resultado esperado:** Atualiza `orders.lat`, `orders.lng`, `orders.geocoded_at` no banco.

**Headers:** Authorization com Bearer + ANON_KEY

---

## 3. optimize-route

**Proposito:** Otimiza a ordem das paradas de uma rota usando Google Maps Directions API.

**Metodo de chamada:** `fetch(SUPABASE_URL + '/functions/v1/optimize-route', { ... })`

**Payload:**
```json
{
  "stops": [
    {
      "order_id": "uuid",
      "lat": -12.12345,
      "lng": -38.54321,
      "address": "Rua A, 123"
    }
  ],
  "origin_lat": -12.11111,
  "origin_lng": -38.55555,
  "origin_address": "Endereco da loja",
  "departure_time": "2026-06-12T08:00:00Z"
}
```

**Chamado de:**
- `src/admin/services/adminRoutes.js` — callOptimizeRoute()

**Resultado:** Retorna stops reordenados com distancias, duracoes e URL do Google Maps.

**Headers:** Authorization com Bearer + ANON_KEY

---

## 4. places-autocomplete

**Proposito:** Autocomplete de enderecos usando Google Places API.

**Metodo de chamada:** `fetch(SUPABASE_URL + '/functions/v1/places-autocomplete', { ... })`

**Payload:**
```json
{
  "input": "Rua da Manguei"
}
```

**Response esperada:**
```json
{
  "predictions": [
    {
      "place_id": "ChIJ...",
      "description": "Rua da Mangueira, Alagoinhas - BA"
    }
  ]
}
```

**Chamado de:**
- `src/components/checkout/AddressStep.jsx:137`

---

## 5. place-details

**Proposito:** Busca detalhes de um endereco a partir do place_id do Google Places.

**Metodo de chamada:** `fetch(SUPABASE_URL + '/functions/v1/place-details', { ... })`

**Payload:**
```json
{
  "place_id": "ChIJ..."
}
```

**Response esperada:**
```json
{
  "result": {
    "formatted_address": "Rua da Mangueira, 123 - Centro, Alagoinhas - BA",
    "address_components": [...],
    "geometry": {
      "location": { "lat": -12.12345, "lng": -38.54321 }
    }
  }
}
```

**Chamado de:**
- `src/components/checkout/AddressStep.jsx:172`

---

## 6. fetch-neighborhoods

**Proposito:** Busca lista de bairros de uma cidade via API do IBGE.

**Metodo de chamada:** `fetch(SUPABASE_URL + '/functions/v1/fetch-neighborhoods', { ... })`

**Payload:**
```json
{
  "city": "Alagoinhas"
}
```

**Chamado de:**
- `src/admin/pages/AdminSettings.jsx` — handleFetchFromIBGE()

**Resultado:** Retorna lista de bairros para popular a tabela `neighborhoods`.

---

## 8. place-order

**Proposito:** Cria o pedido no banco recalculando precos, cupom, frete e horario de funcionamento no servidor (evita manipulacao pelo cliente).

**Metodo de chamada:** `supabase.functions.invoke('place-order', { body })`

**Autenticacao:** JWT obrigatorio no header `Authorization` (usuario deve ser dono do carrinho).

**Payload (Request):**
```json
{
  "cart_id": "uuid",
  "coupon_code": "DESCONTO10",
  "delivery_data": {
    "address": "Rua A, 123",
    "complement": "Apto 2",
    "neighborhood": "Centro",
    "phone": "75999999999",
    "zip_code": "48000-000",
    "reference": "Proximo ao mercado",
    "delivery_date": "2026-06-15",
    "delivery_time": "08:00-10:00",
    "delivery_mode": "scheduled"
  },
  "payment_method": "pix",
  "test_mode": false
}
```

**Campos obrigatorios:** `cart_id`, `delivery_data.address`, `payment_method`.

**Response de sucesso (200):**
```json
{
  "ok": true,
  "order": { "id": "uuid", "order_number": 1000, "total": 42.50, "payment_status": "pending", "...": "..." },
  "items": [
    { "title": "Banana Prata", "quantity": 2, "unit_price": 5.99 }
  ],
  "subtotal": 38.50,
  "shipping": 4.00,
  "discount": 0,
  "total": 42.50,
  "test_mode": false
}
```

**Response de erro:**
```json
{
  "ok": false,
  "error": "Descricao do erro"
}
```

**Codigos HTTP comuns:** `401` (nao autenticado), `403` (carrinho de outro usuario / test_mode desabilitado), `400` (carrinho vazio, loja fechada, cupom invalido, produto indisponivel), `500` (erro interno).

**Fluxo server-side:**
1. Valida JWT e propriedade do carrinho (`carts.user_id`, status `active`)
2. Carrega `cart_items` + precos atuais de `products` (usa `promotional_price` quando menor)
3. Valida cupom (`active`, `expires_at`, `max_uses`, `min_order`) e calcula desconto
4. Le `store_settings` — bloqueia se fora do horario (`open_time` / `close_time`)
5. Calcula frete (`shipping_fee`, frete gratis se `free_shipping_active`)
6. Insere `orders` + `order_items`, incrementa uso do cupom (`increment_coupon_use`)
7. Marca carrinho como `converted` e esvazia `cart_items`
8. Se `test_mode: true` e `ALLOW_TEST_ORDERS=true`, aprova pagamento de teste

**Chamado de:**
- `src/pages/Checkout.jsx` — ao finalizar pedido (antes de `create-mp-preference`)

**Implementacao:** `supabase/functions/place-order/index.ts`

---

## MAPA DE DEPENDENCIAS EXTERNAS DAS EDGE FUNCTIONS

| Edge Function | API Externa | Chave Necessaria |
|---------------|-------------|------------------|
| create-mp-preference | Mercado Pago API | `MP_ACCESS_TOKEN` (secret) |
| geocode-address | Google Geocoding API | `GOOGLE_MAPS_API_KEY` (secret) |
| optimize-route | Google Directions API | `GOOGLE_MAPS_API_KEY` (secret) |
| places-autocomplete | Google Places API | `GOOGLE_MAPS_API_KEY` (secret) |
| place-details | Google Places API | `GOOGLE_MAPS_API_KEY` (secret) |
| fetch-neighborhoods | IBGE API | Nenhuma (publica) |
| place-order | Nenhuma | `SUPABASE_SERVICE_ROLE_KEY` (secret) |

---

## NOTAS DE SEGURANCA

1. `geocode-address` e `optimize-route` usam `fetch` com ANON_KEY no header — funciona pois Edge Functions aceitam token anonimo com RLS
2. `create-mp-preference` usa `supabase.functions.invoke()` — injeta JWT automaticamente
3. `places-autocomplete` e `place-details` usam `fetch` com URL construida manualmente
4. **Nenhuma Edge Function existe localmente** — todas gerenciadas via Supabase Dashboard
