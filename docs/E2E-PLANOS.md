# Planos de Testes E2E — ChamaOLucca

Projeto Supabase: `wjkytzvgbvkcaqjrqsbu`

---

## Plano A — Smoke API (automático)

**Objetivo:** Confirmar que banco, settings e edge functions respondem.

**Script:** `node scripts/verify-supabase.mjs`

| # | Teste | Critério |
|---|--------|----------|
| A1 | REST products | HTTP 200 |
| A2 | REST categories | HTTP 200 |
| A3 | REST store_settings | HTTP 200 |
| A4 | REST delivery_slots | HTTP 200 |
| A5 | REST neighborhoods | HTTP 200 |
| A6 | Edge places-autocomplete | predictions presente |
| A7 | Edge fetch-neighborhoods | lista bairros |
| A8 | Edge reverse-geocode | endereço formatado |
| A9 | Edge place-order | 401 sem JWT |
| A10 | Edge mp-webhook | HTTP 200 |

---

## Plano B — Webhook Mercado Pago (automático)

**Objetivo:** Simulação do MP retorna 200 (não 404).

**Script:** `node scripts/e2e/webhook-mp.mjs`

| # | Teste | Critério |
|---|--------|----------|
| B1 | POST payment.updated (simulação MP) | HTTP 200, ok: true |
| B2 | GET ping webhook | HTTP 200 |
| B3 | POST sem id | HTTP 200 acknowledged |

---

## Plano C — Auth + Profile (automático)

**Objetivo:** Profile criado via trigger; cliente não pode virar admin.

**Script:** `node scripts/e2e/auth-profile.mjs`  
**Pré-requisito:** `SUPABASE_ACCESS_TOKEN` no ambiente (cria/reutiliza `e2e.chamaolucca@example.com` sem e-mail).

| # | Teste | Critério | Última execução |
|---|--------|----------|-----------------|
| C1 | Sessão E2E | access_token válido | ✅ |
| C2 | Profile existe | role = customer | ✅ |
| C3 | Upsert role admin bloqueado | falha ou role inalterado | ✅ |

---

## Plano D — Carrinho + place-order (automático)

**Objetivo:** Pedido criado server-side com preços do banco.

**Script:** `node scripts/e2e/place-order-flow.mjs`

| # | Teste | Critério |
|---|--------|----------|
| D1 | Carrinho ativo criado | cart_id |
| D2 | Item com produto demo | cart_items |
| D3 | place-order | ok: true, order.total > 0 |
| D4 | order_items no pedido | qty > 0 |
| D5 | Carrinho converted | status != active |
| D6 | Cupom BEMVINDO10 | discount > 0 |

---

## Plano E — Loja UI (Playwright, semi-automático)

**Objetivo:** Fluxo visual loja → carrinho.

**Script:** `node scripts/e2e/store-ui.mjs` (fetch da SPA + checks)

| # | Teste | Critério |
|---|--------|----------|
| E1 | GET /loja | HTML 200 |
| E2 | API produtos ativos | count >= 5 |
| E3 | Dev server respondendo | localhost:5173 |

---

## Plano F — Checklist manual pós-automação

| # | Teste | Como |
|---|--------|------|
| F1 | Signup + login UI | Auth modal |
| F2 | Autocomplete endereço | Checkout step 1 |
| F3 | Slots agendamento | Checkout step 2 |
| F4 | Modo teste checkout | localhost revisão |
| F5 | Admin /admin | após promote-admin |
| F6 | Upload imagem produto | admin produtos |
| F7 | Simular webhook MP painel | 200 no dashboard |

---

## Executar tudo

```powershell
npm run test:e2e
# ou
node scripts/e2e/run-all.mjs
```

**Última execução (2026-06-11):** Planos A–E — **26/26 checks OK** (A e E podem falhar por timeout de rede; reexecute se necessário).

---

## Plano G — MP Dashboard (manual, após fix webhook)

| # | Teste | Critério |
|---|--------|----------|
| G1 | Simular notificação no painel MP | Resposta **200** (não 404) |
| G2 | URL produção | `https://wjkytzvgbvkcaqjrqsbu.supabase.co/functions/v1/mp-webhook` |
| G3 | Evento `payment` marcado | checkbox ativo |
