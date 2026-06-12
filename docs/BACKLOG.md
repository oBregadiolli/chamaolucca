# Backlog — ChamaOLucca

Itens de produto e entregáveis fora do escopo de sprint imediato.

---

## Go-live (referência)

Checkpoints técnicos (CP1–CP6): segurança → dados ops → deploy → UX/legal → QA → abertura.

---

## Backlog de produto

| ID | Item | Status | Prioridade |
|----|------|--------|------------|
| **BL-001** | **Manual do cliente final (PDF)** | 📋 Backlog | Alta (comercial) |
| **BL-002** | **Autenticação e notificações por e-mail** | 📋 Backlog | Média |

---

## BL-001 — Manual do cliente final (PDF)

### Objetivo

Documento PDF em português, linguagem simples, para o **cliente final** (stakeholder / dono da operação) entender:

1. **O que já existe e funciona** hoje  
2. **O que existe mas ainda não está 100%** → marcar **EM BREVE**  
3. **O que podemos evoluir depois** → seção “Podemos ter” (roadmap de produto, sem prometer prazo)

### Legenda obrigatória no PDF

| Selo | Significado |
|------|-------------|
| ✅ **Disponível** | Implementado e utilizável no fluxo normal |
| 🔜 **EM BREVE** | Já existe parcialmente ou está no app, mas **não está completo/estável** — não prometer como pronto |
| 💡 **Podemos ter** | Não implementado; ideia de evolução futura (opcional, sob demanda) |

> Regra: **nunca** apresentar item 🔜 como ✅. Na dúvida, usar **EM BREVE**.

---

### Parte A — Loja (cliente que compra)

| Funcionalidade | Status | Notas para o PDF |
|----------------|--------|------------------|
| Site institucional (home, como funciona, contato) | ✅ Disponível | Landing completa |
| Catálogo de produtos | ✅ Disponível | Produtos vêm do banco; catálogo demo pode ser trocado pelo real |
| Busca e filtros na loja | ✅ Disponível | |
| Página do produto (detalhe, preço, promo) | ✅ Disponível | |
| Carrinho (desktop e mobile) | ✅ Disponível | Barra fixa no celular |
| Cadastro e login | ✅ Disponível | Cadastro direto, sem e-mail de confirmação |
| Checkout — endereço com autocomplete | ✅ Disponível | Google Places |
| Checkout — escolha de bairro/cidade | ✅ Disponível | Bairros de Alagoinhas cadastrados |
| Checkout — agendamento (data + horário) | ✅ Disponível | Slots configuráveis no admin |
| Checkout — cupom de desconto | ✅ Disponível | Ex.: cupom demo `BEMVINDO10` |
| Checkout — pagamento Pix (Mercado Pago) | ✅ Disponível | Redireciona ao MP e volta ao pedido |
| Checkout — pagamento cartão crédito/débito | ✅ Disponível | Mapeamento corrigido; validar em produção antes de divulgar |
| Pagamento na entrega (dinheiro) | 🔜 **EM BREVE** | Aparece em textos internos; **não** está no checkout ainda |
| Acompanhar pedido (status + pagamento) | ✅ Disponível | Página `/pedido/:id` com atualização em tempo real |
| Histórico de pedidos no perfil | ✅ Disponível | |
| Endereços salvos no perfil | ✅ Disponível | |
| Alterar senha (logado) | ✅ Disponível | Perfil → Mudar Senha |
| Esqueci minha senha (e-mail) | 📋 **Backlog (BL-002)** | Removido do MVP; requer SMTP customizado |
| Confirmação de cadastro por e-mail | 📋 **Backlog (BL-002)** | Desligado no Supabase (`mailer_autoconfirm`) |
| Termos de uso e privacidade | ✅ Disponível | `/termos` e `/privacidade` |
| App instalável (PWA) | 💡 Podemos ter | |
| Notificações por WhatsApp/SMS do pedido | 💡 Podemos ter | |
| Programa de fidelidade / pontos | 💡 Podemos ter | |
| Assinatura / cesta semanal recorrente | 💡 Podemos ter | |

---

### Parte B — Painel administrativo (operação da loja)

| Funcionalidade | Status | Notas para o PDF |
|----------------|--------|------------------|
| Acesso `/admin` (somente administradores) | ✅ Disponível | Precisa promover usuário a admin |
| Dashboard (resumo) | ✅ Disponível | |
| Gestão de pedidos (lista, filtros, detalhe) | ✅ Disponível | |
| Produtos (CRUD, imagem, preço, promo) | ✅ Disponível | Upload em `product-images` |
| Categorias | ✅ Disponível | |
| Cupons | ✅ Disponível | |
| Configurações da loja (horário, frete, endereço) | ✅ Disponível | |
| Bairros atendidos | ✅ Disponível | Import IBGE + manual |
| Agenda — slots e exceções por data | ✅ Disponível | |
| Entregadores | ✅ Disponível | Cadastro básico |
| Rotas de entrega (otimização Google) | ✅ Disponível | Funciona melhor com lat/lng da loja preenchidos |
| Geocodificação em lote de pedidos | ✅ Disponível | |
| Admin no celular | ✅ Disponível (menu básico) | Drawer com hambúrguer; tabelas largas podem exigir scroll |
| Relatórios exportáveis (PDF/Excel) | 💡 Podemos ter | |
| Painel do entregador (app motorista) | 💡 Podemos ter | |
| Integração WhatsApp Business automática | 💡 Podemos ter | |
| Multi-loja / multi-cidade | 💡 Podemos ter | |

---

### Parte C — Pagamentos e integrações (visão negócio)

| Funcionalidade | Status | Notas para o PDF |
|----------------|--------|------------------|
| Mercado Pago — checkout hospedado | ✅ Disponível | |
| Webhook MP (confirma pagamento automaticamente) | ✅ Disponível | Testado 200 OK teste + produção |
| Google Maps — endereço e rotas | ✅ Disponível | Requer chave API configurada |
| Ambiente de produção (domínio público) | 🔜 **EM BREVE** | App roda em desenvolvimento; deploy do site ainda pendente |
| Modo teste de pedido (localhost) | ✅ Disponível | **Somente desenvolvimento** — não expor ao cliente final |

---

### Parte D — O que podemos ter (roadmap, sem prazo)

Ideias para a seção final do PDF — **não são promessas**, são evoluções possíveis:

- App mobile nativo (iOS/Android)
- Notificações push de status do pedido
- Rastreamento do entregador em mapa ao vivo
- Pagamento na entrega com confirmação no admin
- Segunda via de boleto / parcelamento avançado
- Área de assinaturas (cesta fixa semanal)
- Integração com Instagram Shopping / catálogo social
- Dashboard de vendas e métricas para o lojista
- Multi-idioma
- Área de avaliações pós-entrega

---

### Estrutura sugerida do PDF

1. **Capa** — ChamaOLucca + versão + data  
2. **O que é o sistema** — resumo em 1 página  
3. **Para quem compra** — tabela ✅ / 🔜 EM BREVE  
4. **Para quem administra a loja** — tabela ✅ / 🔜 EM BREVE  
5. **Pagamentos e entregas** — como funciona hoje  
6. **EM BREVE** — lista única de tudo que está chegando (transparência)  
7. **Podemos evoluir para…** — roadmap opcional  
8. **Glossário** — pedido, slot, cupom, webhook (sem jargão técnico)

### Critérios de aceite

- [ ] Três blocos claros: **temos** / **EM BREVE** / **podemos ter**
- [ ] Nenhum item parcial descrito como 100% pronto
- [ ] Capturas de tela reais do app (loja, checkout, admin)
- [ ] Revisão e aprovação do cliente antes de enviar PDF final
- [ ] Arquivo final: `docs/manual-cliente-chamaolucca-v1.pdf` (ou entrega externa)

### Próximo passo

1. **Tutorial completo (Markdown):** [`docs/MANUAL-USO-CHAMAOOLUCCA.md`](MANUAL-USO-CHAMAOOLUCCA.md) — passo a passo de **todas** as funcionalidades (loja + admin).
2. Revisar textos e incluir capturas de tela reais.
3. Exportar para PDF: `docs/manual-cliente-chamaolucca-v1.pdf` (ou entrega externa).
4. Validar com o cliente antes de distribuir.

---

## BL-002 — Autenticação e notificações por e-mail

### Escopo futuro (fora do MVP)

- Confirmação de cadastro por e-mail
- **Esqueci minha senha** (link por e-mail + tela `/redefinir-senha`)
- SMTP customizado no Supabase (Resend, SendGrid, etc.)
- Notificações transacionais por e-mail (pedido confirmado, etc.)

### MVP atual

- Cadastro **sem** envio de e-mail (`mailer_autoconfirm` no Supabase)
- Alterar senha **logado** no perfil (`/perfil` → Mudar Senha)
- Sem link “Esqueci minha senha” no login

### Pré-requisitos para implementar

1. SMTP customizado em Supabase → Authentication → SMTP Settings
2. Reativar fluxos de UI removidos (`AuthModal`, `/redefinir-senha`)
3. Testes E2E de recuperação de senha

---

## Histórico

| Data | Alteração |
|------|-----------|
| 2026-06-12 | BL-002 e-mail auth; MVP sem envio de e-mail no cadastro/recuperação |
| 2026-06-11 | Criado backlog; BL-001 manual PDF |
| 2026-06-11 | BL-001: matriz ✅ / 🔜 EM BREVE / 💡 podemos ter |
| 2026-06-11 | Manual de uso completo: `docs/MANUAL-USO-CHAMAOOLUCCA.md` |
