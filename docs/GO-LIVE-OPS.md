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
| `ALLOWED_ORIGINS` | `https://chamaolucca.com.br,https://chamaolucca.netlify.app,http://localhost:5173,http://localhost:5174,http://localhost:3000` |
| `ALLOW_TEST_ORDERS` | `false` em produção |

Redeploy:

```bash
node scripts/deploy-edge-functions.mjs
```

### Auth URLs

Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://chamaolucca.com.br`
- **Redirect URLs:** incluir `https://chamaolucca.com.br/**`, localhost e netlify preview

Ou via CLI: `npm run go-live:auth`

### Cadastro (sem e-mail)

MVP: cadastro direto, sem confirmação por e-mail. Manter no Supabase:

```bash
npm run go-live:auth-email
```

Recuperação de senha por e-mail está no **backlog (BL-002)** — não exposta na UI.

## 2. Netlify

1. Conectar repositório GitHub
2. Build: `npm run build` | Publish: `dist` (já em `netlify.toml`)
3. Environment variables (também definidas em `netlify.toml` `[build.environment]`):
   - `VITE_SUPABASE_URL` = `https://wjkytzvgbvkcaqjrqsbu.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = anon key do projeto
4. Deploy e validar: `npm run go-live:status`

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
