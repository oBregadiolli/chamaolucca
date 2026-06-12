# Go-live — ChamaOLucca (Netlify + Supabase + Mercado Pago)

Checklist operacional para abrir o MVP com clientes reais.

## 1. Supabase (projeto `wjkytzvgbvkcaqjrqsbu`)

### Migrations

```bash
# Com SUPABASE_ACCESS_TOKEN no ambiente
node scripts/apply-supabase-schema.mjs
```

Confirmar migrations **001–006** aplicadas (inclui `006_orders_rls_hardening.sql`).

### Edge Functions — secrets

No Dashboard → Edge Functions → Secrets (ou CLI):

| Secret | Valor |
|--------|--------|
| `MP_ACCESS_TOKEN` | Token produção Mercado Pago |
| `MP_WEBHOOK_SECRET` | Secret do webhook no painel MP |
| `GOOGLE_MAPS_API_KEY` | Chave restrita ao domínio prod |
| `ALLOWED_ORIGINS` | `https://SEU-DOMINIO.netlify.app,http://localhost:5173` |
| `ALLOW_TEST_ORDERS` | `false` em produção |

Redeploy:

```bash
node scripts/deploy-edge-functions.mjs
```

### Auth URLs

Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://SEU-DOMINIO.netlify.app`
- **Redirect URLs:** incluir `https://SEU-DOMINIO.netlify.app/**` e `/redefinir-senha`

## 2. Netlify

1. Conectar repositório GitHub
2. Build: `npm run build` | Publish: `dist` (já em `netlify.toml`)
3. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy e validar headers (CSP) no DevTools → Network

## 3. Admin e catálogo

```bash
node scripts/promote-admin.mjs seu@email.com
```

- Substituir catálogo demo (`004_demo_catalog.sql`) por produtos reais no admin
- **Configurações:** endereço, frete, horários, lat/lng
- Cupons de produção (se usar)

## 4. Mercado Pago

1. Credenciais de **produção** em `MP_ACCESS_TOKEN`
2. Webhook: `https://wjkytzvgbvkcaqjrqsbu.supabase.co/functions/v1/mp-webhook`
3. Eventos: pagamentos
4. Pagamentos habilitados: **Pix + cartão** (boleto excluído no código)

## 5. Google Cloud

Restringir API key (Maps/Places) a:

- Domínio Netlify de produção
- `localhost` (dev)

## 6. Validação final

Seguir [`GO-LIVE-QA.md`](GO-LIVE-QA.md) e [`E2E-PLANOS.md`](E2E-PLANOS.md) Planos F e G.

**Go/no-go:** S1–S2 aplicados + deploy Netlify + webhook MP + 1 pedido Pix e 1 cartão real (valor baixo).
