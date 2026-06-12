# 🗺️ GUIA RÁPIDO — Reimplementação ChamaoLucca

## ORDEM DE EXECUÇÃO

```
1. SQL Schema    (10 blocos no SQL Editor)     ≈ 5 min
2. Storage       (criar bucket product-images)  ≈ 1 min
3. Edge Functions (7 funções para deploy)       ≈ 20 min
4. Secrets       (MP_ACCESS_TOKEN + GOOGLE_KEY) ≈ 2 min
5. .env          (trocar URL + ANON_KEY)        ≈ 1 min
6. Admin         (criar conta + UPDATE role)    ≈ 2 min
7. Teste         (checklist de 18 itens)        ≈ 15 min
```

## ARQUIVOS DE REFERÊNCIA

| Documento | O que contém |
|-----------|-------------|
| `REIMPLEMENTACAO-PROMPT.md` | **Prompt completo** — cole num agente e ele faz tudo |
| `database-schema-v2.sql` | SQL puro para copiar/colar direto no SQL Editor |
| `edge-functions-reference.md` | Documentação de todas as 7 Edge Functions |
| `project-context-complete.md` | Mapa completo do projeto (arquitetura, tabelas, fluxos) |
| `design-system-reference.md` | Paleta, tipografia, componentes CSS |
| `security-audit.md` | 12 issues de segurança (3 críticos) |
| `migration-guide.md` | Guia de migração entre projetos Supabase |
| `database-schema.sql` | Schema V1 original (referência histórica) |

## O QUE MUDOU NO V2 (vs. banco antigo)

| Item | Antes | Agora |
|------|-------|-------|
| Tabela `neighborhoods` | ❌ Ausente | ✅ Criada |
| `delivery_slots.max_orders` | ❌ Ausente | ✅ Adicionada |
| `delivery_slot_exceptions` | Schema diferente | ✅ Corrigida |
| RPC `get_slot_availability` | Não documentada | ✅ Implementada |
| RPC `get_slot_exceptions_for_date` | Não documentada | ✅ Implementada |
| Edge Function `place-order` | ❌ Não existia | ✅ **NOVA** (segurança) |
| `addresses.phone/reference` | ❌ Ausentes | ✅ Adicionadas |

## SECRETS NECESSÁRIOS NO SUPABASE

| Secret | Onde conseguir |
|--------|---------------|
| `MP_ACCESS_TOKEN` | Mercado Pago → Credenciais → Access Token produção |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |

## APIS DO GOOGLE QUE PRECISAM ESTAR ATIVAS

No Google Cloud Console → APIs & Services → Enable APIs:

1. **Geocoding API** (para `geocode-address`)
2. **Directions API** (para `optimize-route`)
3. **Places API** (para `places-autocomplete` e `place-details`)

## VARIÁVEIS DE AMBIENTE DO FRONTEND (.env)

```
VITE_SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

## DEPOIS DE TUDO PRONTO

1. `npm run dev` para testar local
2. Criar conta no app → promover para admin via SQL
3. Cadastrar produtos, categorias, bairros via admin
4. Testar fluxo completo: loja → carrinho → checkout → pagamento
5. `npm run build && deploy` para produção
