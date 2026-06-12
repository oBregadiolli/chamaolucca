# Auditoria de Segurança — ChamaOLucca

Data: 11/06/2026 | Status: **MVP — hardening aplicado no código; deploy/secrets pendentes no painel**

## Mapa de risco (reconciliado)

| # | Área | Nível | Status |
|---|------|-------|--------|
| 01 | Preço calculado no cliente | CRÍTICO | **Resolvido** — Edge `place-order` |
| 02 | Cupom sem validação server | CRÍTICO | **Resolvido** — `place-order` + RPC `003` |
| 03 | Role definido pelo cliente | CRÍTICO | **Resolvido** — trigger `handle_new_user` |
| 04 | RLS policies | ALTO | **Resolvido** — migrations 001–003; **006** restringe UPDATE em orders |
| 05 | CSP / security headers | ALTO | **Resolvido** — `netlify.toml` |
| 06 | Rate limit no login | ALTO | **Resolvido** — `AuthModal.jsx` (3→30s, 5→5min) |
| 07 | Reset senha | MÉDIO | **Backlog BL-002** — removido do MVP; alterar senha no perfil (logado) |
| 08 | Order items preço cliente | MÉDIO | **Resolvido** — via `place-order` |
| 09 | Checkbox lembrar | MÉDIO | **Resolvido** — removido (U6) |
| 10 | Admin rotas sem 404 | MÉDIO | **Resolvido** — rota `*` em `/admin/*` |
| 11 | `.env.example` | BAIXO | **Resolvido** |
| 12 | Sanitização texto livre | BAIXO | Aceito MVP — notas de pedido |
| S1 | Cliente UPDATE `payment_status` | CRÍTICO | **Resolvido** — migration `006_orders_rls_hardening.sql` |
| S2 | Webhook MP sem `x-signature` | CRÍTICO | **Resolvido** — `mp-webhook` + `MP_WEBHOOK_SECRET` |
| S3 | CORS `*` | ALTO | **Resolvido** — allowlist `ALLOWED_ORIGINS` |
| S6 | Modo teste no cliente | ALTO | **Resolvido** — `ALLOW_TEST_ORDERS` server-side |

## Evidências

- **place-order:** `supabase/functions/place-order/index.ts` — recalcula preços, cupom, frete; insere pedido com service_role.
- **RLS orders:** `supabase/migrations/006_orders_rls_hardening.sql` — remove INSERT/UPDATE do cliente; só admin atualiza pedidos.
- **Webhook:** `supabase/functions/mp-webhook/index.ts` + `_shared/mpSignature.ts`.
- **CORS:** `supabase/functions/_shared/cors.ts` — origens via `ALLOWED_ORIGINS`.
- **Headers:** `netlify.toml` — CSP, X-Frame-Options, nosniff, Referrer-Policy.
- **Login:** `src/components/auth/AuthModal.jsx` — bloqueio progressivo local.
- **Legal/auth:** `/termos`, `/privacidade`. E-mail auth → backlog BL-002.

## Pós-deploy (painéis)

- [ ] Aplicar migration 006 no projeto Supabase (`node scripts/apply-supabase-schema.mjs`)
- [ ] Redeploy edges (`node scripts/deploy-edge-functions.mjs`)
- [ ] Secrets Supabase: `ALLOWED_ORIGINS`, `MP_WEBHOOK_SECRET`, `ALLOW_TEST_ORDERS=false` em prod
- [ ] Auth URLs no Dashboard (Site URL + Redirect URLs Netlify)
- [ ] Webhook MP registrado apontando para `/functions/v1/mp-webhook`

## Baseline de testes (11/06/2026)

- `npm run test:smoke`: falhou por timeout de rede para Supabase (`UND_ERR_CONNECT_TIMEOUT`) — reexecutar antes do go-live.
- `npm run build`: executar localmente em CI/deploy Netlify.

## Fora do escopo MVP

- hCaptcha/Turnstile no login (opcional pós-MVP)
- Rate limit distribuído (Redis) — bloqueio atual é por sessão no browser
- PDF comercial, PWA, busca na loja, editar carrinho
