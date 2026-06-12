# Checklist QA — Abertura MVP ChamaOLucca

Use após deploy Netlify e secrets configurados. Marque cada item antes de divulgar.

## Pré-requisitos

- [ ] Migration 006 aplicada
- [ ] Edge functions redeployadas
- [ ] `ALLOW_TEST_ORDERS=false` em produção
- [ ] Admin promovido e catálogo real publicado

## Plano F — Fluxo cliente

- [ ] Signup com e-mail válido
- [ ] Login / logout
- [ ] Loja: adicionar produtos ao carrinho
- [ ] Checkout: endereço, bairro, slot de entrega
- [ ] Cupom válido (se configurado)
- [ ] `/termos` e `/privacidade` abrem sem erro

## Plano G — Pagamentos

- [ ] **Pix** (valor baixo): pedido criado → MP → retorno → `payment_status` aprovado
- [ ] **Cartão crédito/débito**: checkout MP sem boleto
- [ ] Webhook atualiza pedido **sem** depender só do redirect
- [ ] Admin vê pedido e consegue alterar status

## Segurança rápida

- [ ] Cliente **não** consegue UPDATE `payment_status` via Supabase JS (deve falhar após 006)
- [ ] CORS: request de origem não listada bloqueada nas edges
- [ ] Login: após 3 erros, botão bloqueia ~30s

## Go / No-go

| Critério | OK? |
|----------|-----|
| Site público Netlify | |
| Pix real aprovado | |
| Cartão real aprovado | |
| Webhook MP | |
| Termos + privacidade | |

**Liberado para divulgação controlada** quando todos os critérios da tabela estiverem OK.
