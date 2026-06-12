# ChamaoLucca — Design System Reference
> Gerado em: 11/06/2026 | Fonte: varredura completa de ~166KB de CSS

---

## 1. PALETA DE CORES

### Brand Colors (Green)
| Token | Hex | Uso |
|-------|-----|-----|
| `--green-50` | `#f0fdf4` | Backgrounds ativos, badges |
| `--green-100` | `#dcfce7` | Focus rings, backgrounds sutis |
| `--green-200` | `#bbf7d0` | Bordas, feedback sucesso |
| `--green-300` | `#86efac` | Hover em bordas |
| `--green-400` | `#4ade80` | Acentos decorativos |
| `--green-500` | `#22c55e` | SVG fills, folhas do mascote |
| `--green-600` | `#16a34a` | **COR PRINCIPAL** — botoes, links, precos |
| `--green-700` | `#15803d` | Hover em botoes primarios |
| `--green-800` | `#166534` | Texto em banners de sucesso |
| `--green-900` | `#14532d` | Acentos escuros |

### Gray Scale
| Token | Hex | Uso |
|-------|-----|-----|
| `--gray-50` | `#f9fafb` | Background da pagina |
| `--gray-100` | `#f3f4f6` | Bordas, dividers, inputs bg |
| `--gray-200` | `#e5e7eb` | Bordas de cards e inputs |
| `--gray-300` | `#d1d5db` | Icones desabilitados |
| `--gray-400` | `#9ca3af` | Placeholder text |
| `--gray-500` | `#6b7280` | Texto secundario |
| `--gray-600` | `#4b5563` | Texto escuro |
| `--gray-700` | `#374151` | Labels de form |
| `--gray-800` | `#1f2937` | Texto primario |
| `--gray-900` | `#111827` | — |

### Cores Especiais
| Cor | Hex | Uso |
|-----|-----|-----|
| Mascote (laranja) | `#F5A263` | Corpo do mascote "Laranjinha" |
| Near-black | `#111` | Texto escuro, botoes dark |
| Admin Slate-900 | `#0f172a` | Texto primario admin |
| Red-500 | `#ef4444` | Erro, perigo, cancelar |
| Red-50 | `#fef2f2` | Background de erro |
| Yellow-500 | `#eab308` | Warning |
| Blue-500 | `#3b82f6` | Info |

### Cores de Status (Pedidos)
| Status | Background | Texto |
|--------|-----------|-------|
| Recebido | `#dbeafe` | `#1d4ed8` |
| Preparando | `#fef3c7` | `#92400e` |
| Entregando | `#e0e7ff` | `#4338ca` |
| Entregue | `#dcfce7` | `#15803d` |
| Cancelado | `#fee2e2` | `#b91c1c` |

### Cores de Status (Pagamento)
| Status | Background | Texto |
|--------|-----------|-------|
| Pendente | `#fffbeb` | `#d97706` |
| Aprovado | `#ecfdf5` | `#059669` |
| Em processo | `#f5f3ff` | `#7c3aed` |
| Rejeitado | `#fef2f2` | `#dc2626` |
| Reembolsado | `#f0f9ff` | `#0ea5e9` |

---

## 2. TIPOGRAFIA

| Token | Valor | Uso |
|-------|-------|-----|
| `--font-family` | `"Inter", -apple-system, BlinkMacSystemFont, sans-serif` | Fonte global |
| `--font-xs` | `0.75rem` (12px) | Badges, micro-labels |
| `--font-sm` | `0.875rem` (14px) | Body text, form labels |
| `--font-md` | `1rem` (16px) | Tamanho base |
| `--font-lg` | `1.125rem` (18px) | Headings de secao |
| `--font-xl` | `1.25rem` (20px) | Titulos de modal |
| `--font-2xl` | `1.5rem` (24px) | Titulos de pagina (admin) |
| `--font-3xl` | `1.875rem` (30px) | Sub-headings hero |
| `--font-4xl` | `2.25rem` (36px) | Headlines hero |
| `--font-5xl` | `3rem` (48px) | Landing hero |

**Fonte decorativa:** `'Pacifico', cursive` — usada apenas no nome "Lucca" no header.

**Pesos:** 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

---

## 3. ESPACAMENTO

| Token | Valor |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |
| `--space-3xl` | `64px` |

---

## 4. BORDER RADIUS

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `8px` | Inputs, botoes pequenos |
| `--radius-md` | `12px` | Cards, inputs, botoes |
| `--radius-lg` | `16px` | Cards grandes, modals |
| `--radius-xl` | `24px` | Auth modal, hero CTA |
| `--radius-full` | `9999px` | Pills, badges, toggles |

---

## 5. SOMBRAS

| Token | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` |

---

## 6. TRANSICOES

| Token | Valor |
|-------|-------|
| `--transition-fast` | `150ms ease` |
| `--transition-base` | `250ms ease` |
| `--transition-slow` | `350ms ease` |

---

## 7. BREAKPOINTS RESPONSIVOS

| Breakpoint | Uso |
|-----------|------|
| `480px` | Mobile pequeno: cards encolhem, badges empilham |
| `600px` | Cart: bottom-sheet → dialog centralizado |
| `640px` | Store grid: 2 colunas |
| `768px` | **Breakpoint principal mobile**: sidebar admin esconde, profile single-column |
| `900px` | Store grid: sidebar esconde, 3 colunas de produtos |
| `1024px` | Landing: hero/secoes empilham vertical, testimonials 1 coluna |

---

## 8. ANIMACOES

| Nome | Arquivo | Descricao |
|------|---------|-----------|
| `fadeIn` | index.css | opacity 0→1 |
| `slideUp` | index.css | translateY(16px)→0 + opacity |
| `pulse` | polish.css | opacity 1→0.4→1 (loading) |
| `spin` | polish.css | rotate 0→360° (spinner) |
| `fadeInUp` | polish.css | opacity + translateY(8px)→0 |
| `shake` | polish.css | translateX oscilacao (erro) |
| `skeleton-shimmer` | polish.css | Background sweep (skeleton loader) |
| `adminFadeIn` | admin.css | Modal overlay fade |
| `adminSlideUp` | admin.css | Modal slide + opacity |
| `adminToastIn/Out` | admin.css | Toast enter/exit |
| `adminShimmer` | admin.css | Admin skeleton loader |
| `adminPulse` | admin.css | Updating pill pulse |
| `od-fade-in` | profile.css | Drawer overlay fade |
| `od-slide-in` | profile.css | Drawer slide direita |
| `od-slide-up` | profile.css | Mobile drawer slide baixo |

---

## 9. ARQUITETURA CSS

```
src/
├── index.css          (45KB) — Source of truth do design system
│   ├── :root tokens
│   ├── CSS Reset
│   ├── Utilities (.container, .sr-only)
│   ├── Buttons (.btn-*)
│   ├── Forms (.form-*)
│   ├── Cards (.card-*)
│   ├── Badges (.badge-*)
│   ├── Header (.header-*)
│   ├── Modals (.modal-*)
│   ├── Auth (.auth-*)
│   ├── Store dialogs (.gs-*, .htg-*)
│   ├── Mobile cart bar
│   └── Cart modal (.cart-modal-*)
│
├── App.css            — Hero visual transforms
├── landing.css        (11KB) — Landing page (lp-*)
│
├── styles/
│   ├── checkout.css       (17KB) — Checkout (co-*)
│   ├── checkout-steps.css (11KB) — Step indicator
│   ├── store.css          (13KB) — Loja + produtos (product-*, store-*)
│   ├── profile.css        (21KB) — Perfil + historico (oh-*, od-*, address-*)
│   ├── order-confirmation.css (5KB) — Confirmacao (oc-*)
│   └── polish.css         (14KB) — Override final (animacoes, focus, skeletons)
│
└── admin/
    └── admin.css      (30KB) — Design system admin completo (admin-*)
```

---

## 10. SISTEMA DE ICONES

**Material Symbols Rounded** via Google Fonts CDN.

Componente wrapper: `src/components/ui/Icon.jsx`
```jsx
<Icon name="shopping_cart" size={24} fill />
```

O componente ajusta `fontVariationSettings` dinamicamente para `opsz`, `wght`, `FILL`, `GRAD`.

---

## 11. INVENTARIO DE COMPONENTES (por prefixo CSS)

| Prefixo | Dominio | Classes Principais |
|---------|---------|-------------------|
| `.btn-*` | Botoes | primary, secondary, ghost, danger, sm, lg, block, icon |
| `.form-*` | Forms | group, input, label, error |
| `.card-*` | Cards | card, card-body |
| `.badge-*` | Badges | badge, badge-green, badge-gray |
| `.header-*` | Header | header, inner, logo, actions, howto-btn |
| `.modal-*` | Modals | overlay, modal, header, close, body, footer |
| `.auth-*` | Auth | overlay, modal, close, input, btn-primary, btn-dark, tab |
| `.gs-*` | Store Dialogs | overlay, dialog, emoji-area, body, heading, ok-btn |
| `.htg-*` | Como Chegar | dialog, close, title, map-wrap, info, maps-btn |
| `.lp-*` | Landing | hero, headline, cta, benefits, categories, dark, testimonials, footer |
| `.cart-modal-*` | Cart Panel | overlay, modal, header, body, item, footer, proceed-btn |
| `.co-*` | Checkout | step-wrapper, card, title, advance-btn, back-btn, input, delivery-* |
| `.rv-*` | Revisao | col-labels, items-list, item, coupon-*, totals |
| `.oc-*` | Confirmacao | container, card-* |
| `.product-*` | Produtos | card-store, card-img, card-name, card-price, add-dark, qty-pill |
| `.combo-*` | Combos | scroll, card, emojis, name, price |
| `.store-*` | Loja | wrapper, hero, headline, section, products-grid |
| `.profile-*` | Perfil | page, sidebar, nav-item, input, section, toast |
| `.oh-*` | Historico | list, card, badge, empty, shop-btn |
| `.od-*` | Drawer Pedido | overlay, drawer, header, badges, items-section, totals, btn-retry |
| `.address-*` | Enderecos | card, card-label, card-text, action-btn |
| `.admin-*` | Admin | shell, sidebar, content, page, table, modal, form, badge, toast |
| `.skeleton*` | Loading | skeleton, skeleton-text, skeleton-box |
| `.feedback-*` | Banners | banner, --error, --warning, --success, --info |
| `.empty-state*` | Vazios | empty-state, icon, title, text |

---

## 12. PADROES NOTAVEIS

1. **Sem framework CSS** — 100% custom com CSS Custom Properties
2. **Prefixos BEM-like** — `lp-`, `co-`, `rv-`, `oh-`, `od-`, `gs-`, `htg-`, `oc-`, `admin-`
3. **Admin isolado** — `admin.css` tem design system proprio (paleta Slate)
4. **Polish layer** — `polish.css` carregado por ultimo para focus rings, animacoes, skeletons
5. **Mobile-first** — Cart usa bottom-sheet no mobile (radius 24px top), dialog no desktop
6. **Qty control** — Pill verde com −/+ (consistente em ProductCard, CartSidebar, CartPanel)
7. **Print styles** — Esconde header, cart bars, sidebars, action buttons
