# Schema de referência — Produtos, Carrinho, Pedidos e Preços

Resumo legível das tabelas de e-commerce e de como **preço, promoção, desconto e
cupom** se encaixam. Reflete a produção (ref `wjkytzvgbvkcaqjrqsbu`) em 26/08/2026.
DDL completo em [`database-schema-v2.sql`](database-schema-v2.sql).

> Convenção: preço/quantidade em `numeric`; toda linha de item guarda um
> **snapshot** do preço no momento (não depende do preço atual do produto).

---

## Produtos — `products`
| Coluna | Tipo | Observação |
|---|---|---|
| `price` | numeric (def. 0) | Preço cheio |
| `promotional_price` | numeric, nullable | **Preço promocional** — quando preenchido e menor que `price`, é o preço efetivo |
| `compare_price` | numeric, nullable | Preço "de" (riscado), referência visual |
| `name`, `slug`, `description`, `image_url` | text | `slug` único |
| `unit` | text (def. `un`) | Unidade de venda |
| `active`, `featured` | bool | |
| `stock` | int, nullable | |
| `category_id` | uuid → `categories` | |

**Preço efetivo** = `promotional_price` se (não nulo, > 0 e < `price`), senão `price`.
Essa regra vive no back (`effectivePrice` no `place-order`) e no front.

`categories`: `name`, `slug` (único), `description`, `image_url`, `sort_order`, `active`.

---

## Carrinho — `carts` + `cart_items`
**`carts`** — 1 carrinho ativo por usuário.
| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | uuid → `profiles` | |
| `status` | text | `active` \| `converted` (vira `converted` no checkout) |

**`cart_items`**
| Coluna | Tipo | Observação |
|---|---|---|
| `cart_id` | uuid → `carts` | |
| `product_id` | uuid → `products` | |
| `quantity` | int (>0) | check `quantity > 0` |
| `unit_price` | numeric | **Snapshot** do preço efetivo ao adicionar |

> Não há coluna de desconto no carrinho. Desconto só é calculado no checkout.

---

## Pedidos — `orders` + `order_items`
**`orders` (campos de valor e pagamento)**
| Coluna | Tipo | Observação |
|---|---|---|
| `subtotal` | numeric | Soma dos itens |
| `discount` | numeric (def. 0) | Desconto aplicado (cupom) |
| `shipping` | numeric (def. 0) | Frete (0 = grátis) |
| `total` | numeric | `subtotal − discount + shipping` (nunca negativo) |
| `coupon_code` | text, nullable | Código do cupom usado |
| `payment_method` | text | `pix` \| `credit_card` \| `debit_card` |
| `payment_status` | text (def. `pending`) | `pending` \| `approved` \| `rejected` \| `refunded` |
| `payment_provider`, `payment_id`, `paid_at` | | Preenchidos pelo `mp-webhook` |
| `pix_qr_code`, `pix_expires_at` | | Dados do Pix direto |
| `status` | text (def. `received`) | Fluxo do pedido (recebido → entregue) |
| `delivery_mode` | text | `express` \| `scheduled` |

Outros: endereço/entrega, `order_number` (sequência única), driver, geolocalização.

**`order_items`**
| Coluna | Tipo | Observação |
|---|---|---|
| `product_id` | uuid → `products`, nullable | |
| `product_name` | text | **Snapshot** do nome |
| `quantity` | int (>0) | |
| `unit_price` | numeric | **Snapshot** do preço |
| `total_price` | numeric **gerada** | `quantity * unit_price` |
| `image_url` | text, nullable | Snapshot |

---

## Promoção / Desconto / Cupom — o que existe

| Camada | Estrutura |
|---|---|
| **Por produto** | `products.promotional_price` (+ `compare_price` visual) |
| **Cupom** | Tabela `coupons` completa (abaixo) |
| **No pedido** | `orders.discount` + `orders.coupon_code` |
| **Backend** | RPC atômico `increment_coupon_use(coupon_id)` — consumo seguro contra corrida |

**`coupons`**
| Coluna | Tipo | Observação |
|---|---|---|
| `code` | text único | |
| `discount_type` | text | `percentage` \| `fixed` |
| `discount_value` | numeric | % ou R$ conforme o tipo |
| `min_order` | numeric (def. 0) | Pedido mínimo |
| `max_uses` | int, nullable | Limite global de usos |
| `uses_count` | int (def. 0) | Usos já consumidos |
| `single_use_per_customer` | bool (def. false) | **1 uso por cliente** — enforce por CPF único + histórico de pedidos (migration 008) |
| `expires_at` | timestamptz, nullable | |
| `active` | bool (def. true) | |

### O que NÃO existe
Promoções avançadas por comportamento/CRM ainda não existem. O MVP atual cobre
ações de carrinho e produto por período.

## Promoções MVP — `promotions`
Tabela para ações configuráveis pelo painel, aplicada automaticamente no carrinho
e recalculada no servidor em `place-order`.

| Coluna | Tipo | Observação |
|---|---|---|
| `name`, `description` | text | Nome e observação interna |
| `type` | text | `product_price` \| `free_product` |
| `min_subtotal` | numeric | Valor mínimo dos produtos antes da promoção |
| `trigger_product_id` | uuid → `products` | Produto que libera brinde (`free_product`) |
| `reward_product_id` | uuid → `products` | Produto beneficiado |
| `reward_price` | numeric | Preço especial para `product_price` |
| `max_quantity_per_order` | int | Limite aplicado por pedido |
| `priority` | int | Ordem de avaliação |
| `active`, `starts_at`, `ends_at` | | Liga/desliga e validade |

Regras do MVP:
- `product_price`: compra acima de X libera produto Y por preço Z, limitado por pedido.
- `free_product`: compra acima de X + produto gatilho no carrinho adiciona produto Y grátis no pedido.
- Promoções de preço não acumulam no mesmo produto; vence a primeira por prioridade.
- O pedido salva o item com preço já promovido; `orders.discount` continua representando cupom.

---

## Onde a regra é aplicada (fonte de verdade)
- **Cálculo de preço/desconto/frete e criação do pedido:** edge function `place-order`
  (valida no servidor; o front valida só para UX).
- **Promoções automáticas:** motor compartilhado `promotionEngine` no front e na
  edge function; o servidor recalcula antes de gravar o pedido.
- **Confirmação de pagamento:** edge function `mp-webhook` (marca `approved`/`paid_at`).
- **Cupom "1 uso por cliente" + CPF único:** migration `008` (índice único
  `idx_profiles_cpf_unique`, CPF gravado no cadastro via trigger `handle_new_user`,
  checagem no `place-order`).
