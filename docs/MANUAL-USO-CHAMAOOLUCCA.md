# Manual de uso — ChamaOLucca

**Versão:** 1.0  
**Data:** junho/2026  
**Público:** cliente final (quem compra), operador da loja (admin) e equipe de entrega  
**Formato:** tutorial passo a passo — ensina a usar **todas** as funcionalidades do sistema

---

## Como ler este manual

| Selo | Significado |
|------|-------------|
| ✅ **Disponível** | Funcionalidade pronta para uso no fluxo normal |
| 🔜 **EM BREVE** | Existe parcialmente ou ainda não está 100% estável — use com cautela |
| 💡 **Podemos ter** | Ideia de evolução futura — ainda **não** está no sistema |

> **Regra:** se algo estiver marcado 🔜, não trate como 100% pronto. Na dúvida, consulte a seção [EM BREVE — o que ainda está chegando](#em-breve--o-que-ainda-está-chegando).

---

## Sumário

1. [O que é o ChamaOLucca](#1-o-que-é-o-chamaolucca)
2. [Antes de começar](#2-antes-de-começar)
3. [Parte I — Quem compra (loja online)](#parte-i--quem-compra-loja-online)
4. [Parte II — Quem administra a loja](#parte-ii--quem-administra-a-loja)
5. [Parte III — Pagamentos e pedidos (visão completa)](#parte-iii--pagamentos-e-pedidos-visão-completa)
6. [EM BREVE — o que ainda está chegando](#em-breve--o-que-ainda-está-chegando)
7. [Podemos evoluir para… (roadmap)](#podemos-evoluir-para-roadmap)
8. [Glossário](#glossário)
9. [Solução de problemas comuns](#solução-de-problemas-comuns)

---

## 1. O que é o ChamaOLucca

O **ChamaOLucca** é o sistema de delivery do **Lucca Mercado**. Ele permite que o cliente:

- navegue pelo catálogo de produtos;
- monte a sacola de compras;
- escolha endereço, data e horário de entrega;
- pague via **Mercado Pago** (Pix e, em evolução, cartão);
- acompanhe o status do pedido em tempo real.

Para a operação da loja, existe o **Painel Admin** (`/admin`), onde você gerencia pedidos, produtos, frete, cupons, agenda de entregas, rotas e entregadores.

---

## 2. Antes de começar

### 2.1 Endereços importantes

| Página | URL |
|--------|-----|
| Página inicial | `/` |
| Loja (catálogo) | `/loja` |
| Detalhe de um produto | `/item/{id-do-produto}` |
| Checkout (finalizar compra) | `/checkout` |
| Meu perfil | `/perfil` |
| Acompanhar pedido | `/pedido/{id-do-pedido}` |
| Painel admin | `/admin` |

### 2.2 O que você precisa ter

**Para comprar:**

- Navegador atualizado (Chrome, Edge, Safari ou Firefox);
- Conta criada no site (e-mail e senha);
- Endereço em bairro atendido pela loja;
- Forma de pagamento online (Pix recomendado).

**Para administrar:**

- Conta com perfil **administrador** (promovida pela equipe técnica);
- Computador ou tablet (o admin funciona no celular com menu lateral, mas telas grandes são mais confortáveis).

### 2.3 Ícones e botões que aparecem em quase todo lugar

| Elemento | Onde | Para quê |
|----------|------|----------|
| **Entrar** | Cabeçalho | Abre login ou cadastro |
| **Como chegar?** | Cabeçalho (exceto na home) | Endereço da loja física + mapa |
| **Carrinho / sacola** | Cabeçalho (desktop) ou barra inferior (celular) | Ver itens e ir ao checkout |
| **Ver sacola** | Barra verde fixa no celular | Atalho rápido para o carrinho |

---

# Parte I — Quem compra (loja online)

---

## 3. Página inicial (Home) ✅

**Rota:** `/`

### O que você vê

- Apresentação do mercado e benefícios;
- Depoimentos e categorias ilustrativas;
- Botão principal **「FAÇA TEU MERCADO AQUI」**.

### Tutorial — ir para a loja

1. Abra o site na página inicial.
2. Role a página para conhecer o serviço (opcional).
3. Toque ou clique em **FAÇA TEU MERCADO AQUI**.
4. Você será levado para **`/loja`**, onde escolhe os produtos.

> **Observação:** as categorias mostradas na home são ilustrativas. O catálogo real está na loja (`/loja`).

---

## 4. Cadastro e login ✅

**Onde abrir:** botão **Entrar** no topo de qualquer página (exceto fluxos já logados).

### Tutorial — criar conta

1. Clique em **Entrar**.
2. Na janela que abrir, clique em **Não tenho Cadastro** (ou equivalente).
3. Preencha:
   - **Nome**
   - **E-mail**
   - **Telefone** (com DDD)
   - **Senha**
4. Clique em **Cadastrar**.
5. Se tudo estiver correto, a janela fecha e você fica logado.

### Tutorial — entrar na conta

1. Clique em **Entrar**.
2. Informe **e-mail** e **senha**.
3. Clique em **Entrar**.
4. Pronto — você pode comprar e acessar **Meu perfil**.

### Tutorial — esqueci a senha 🔜 EM BREVE

1. Clique em **Entrar** → **Esqueceu a sua senha?**
2. Digite seu e-mail e clique em **Enviar email**.
3. Verifique a caixa de entrada do e-mail.
4. **Limitação atual:** o link de recuperação leva ao perfil; a tela dedicada de **nova senha** ainda está em desenvolvimento. Se não conseguir redefinir sozinho, peça ajuda ao suporte da loja.

---

## 5. Loja — catálogo e sacola ✅

**Rota:** `/loja`

### O que você vê

- Título **「Nada de filas ッ」**;
- Indicadores **Menu Disponível** e horário **Aberto** (conforme configuração da loja);
- Seção **Seleção da Velocidade** (destaques);
- Produtos organizados por **categoria** (Frutas, Hortifrúti, etc.);
- No **celular**: barra inferior **Ver sacola** quando há itens;
- No **computador**: coluna **Monte sua Sacola** à direita.

### Tutorial — adicionar produtos

1. Acesse **`/loja`**.
2. Role até a categoria desejada ou use a seção de destaques.
3. Em cada produto, clique no botão **+** para adicionar **1 unidade**.
4. Clique de novo para aumentar a quantidade (ou abra o produto — ver seção 6).
5. Confira o total na sacola (sidebar ou barra mobile).

### Tutorial — abrir detalhe do produto

1. Clique no **card do produto** (não só no botão +).
2. Você vai para **`/item/{id}`** (ver seção 6).

### Tutorial — ir para o checkout

**No celular:**

1. Adicione itens à sacola.
2. Toque na barra verde **Ver sacola** (parte inferior).
3. No painel, confira os itens e toque **Prosseguir**.
4. Se não estiver logado, toque **Fazer login para continuar**, entre na conta e repita.

**No computador:**

1. Adicione itens.
2. Na coluna **Monte sua Sacola**, clique **Prosseguir**.
3. Faça login se solicitado.

5. Você chega em **`/checkout`**.

> **Busca por nome na loja:** 🔜 **EM BREVE** — hoje a navegação é por scroll e categorias, sem campo de busca.

---

## 6. Página do produto ✅

**Rota:** `/item/{id-do-produto}`

### Tutorial — comprar com observação

1. Abra o produto pela loja.
2. Use **−** e **+** para ajustar a quantidade.
3. (Opcional) Escreva em **Alguma observação?** — ex.: “maduras”, “sem plástico”.
4. A quantidade é salva automaticamente no carrinho ao alterar.
5. Use **Voltar ao início** ou o breadcrumb **Categorias** para retornar à loja.
6. Siga para o checkout pela sacola (seção 5).

---

## 7. Carrinho (painel lateral) ✅

**Onde:** ícone de carrinho no topo (desktop) ou **Ver sacola** (mobile).

### Tutorial — revisar antes de pagar

1. Abra a sacola.
2. Veja a lista **Lista de compra**.
3. Use **Remover** em itens que não quer mais.
4. Clique **Prosseguir** (logado) ou **Fazer login para continuar**.
5. Você vai para **`/checkout`**.

> **Botão Editar:** aparece na interface, mas ainda não abre edição avançada de itens — use **− / +** na loja ou remova e adicione de novo. 🔜 **EM BREVE**

---

## 8. Checkout — finalizar compra ✅

**Rota:** `/checkout`  
**Pré-requisito:** sacola com itens + usuário logado.

O checkout tem **4 etapas**, indicadas no topo:

**Endereço → Agendamento → Pagamento → Revisão**

---

### 8.1 Etapa 1 — Endereço ✅

#### Tutorial — usar endereço já salvo

1. Se você já cadastrou endereços no perfil, eles aparecem em **Usar um endereço salvo**.
2. Clique no endereço desejado.
3. Confira telefone e complemento.
4. Clique **Avançar**.

#### Tutorial — cadastrar endereço novo no checkout

1. Digite a **rua** — o sistema sugere endereços (autocomplete).
2. Selecione a sugestão correta ou preencha manualmente:
   - **Número**
   - **Complemento**
   - **Bairro**
   - **CEP**
   - **Telefone** para contato na entrega
   - **Ponto de referência** (opcional, ajuda o entregador)
3. (Opcional) Marque **Definir como endereço padrão**.
4. (Opcional) Use **Usar minha localização atual** para ajudar no preenchimento.
5. Clique **Avançar**.

> Se o bairro **não for atendido**, o sistema avisa — ajuste o endereço ou escolha outro bairro da área de cobertura.

---

### 8.2 Etapa 2 — Agendamento ✅

Você escolhe **como** quer receber:

| Modo | Quando usar |
|------|-------------|
| **Programada** | Escolhe **dia** + **faixa de horário** (ex.: 14:00–16:00) |
| **Rápida ⚡** | Entrega prioritária, quando disponível no seu bairro |

#### Tutorial — entrega programada

1. Mantenha **Programada** selecionada.
2. Toque no **dia** desejado na grade de datas.
3. Escolha um **horário** disponível (slots **Lotado** não podem ser selecionados).
4. Clique **Avançar**.

#### Tutorial — entrega rápida

1. Selecione **Rápida ⚡**.
2. Leia a mensagem de disponibilidade (depende do bairro — ex.: **Jardim Petrolar**).
3. Se disponível, confirme e clique **Avançar**.
4. Se **Indisponível no bairro**, volte e use **Programada** ou altere o endereço.

---

### 8.3 Etapa 3 — Pagamento ✅ / 🔜

Escolha uma forma:

| Opção | Status | Observação |
|-------|--------|------------|
| **Pix** | ✅ Recomendado | Aprovação rápida no Mercado Pago |
| **Crédito** | 🔜 EM BREVE | Fluxo existe; confirme no ambiente real antes de divulgar |
| **Débito** | 🔜 EM BREVE | Idem crédito |

#### Tutorial — pagar com Pix

1. Selecione **Pix** (tag **Recomendado**).
2. Clique **Continuar**.
3. Na etapa **Revisão**, confira totais e clique **Ir para Pagamento** (ou **Pagar Agora ⚡** se entrega rápida).
4. Você será redirecionado ao **Mercado Pago**.
5. Conclua o Pix no app ou site do MP.
6. Ao voltar, acompanhe em **`/pedido/{id}`**.

> **Dinheiro na entrega:** 🔜 **EM BREVE** — ainda não aparece como opção no checkout.

---

### 8.4 Etapa 4 — Revisão e cupom ✅

#### Tutorial — aplicar cupom de desconto

1. Na revisão, localize **Tem um cupom de desconto?**
2. Digite o código (ex.: cupom de demonstração **`BEMVINDO10`**).
3. Clique **Aplicar**.
4. Confira o desconto no resumo.
5. Clique **Ir para Pagamento** para ir ao Mercado Pago.

#### Tutorial — conferir o pedido antes de pagar

1. Revise: itens, endereço, data/horário, frete, desconto e **total**.
2. Clique **Ir para Pagamento**.
3. Aguarde o redirecionamento — não feche a aba durante o processo.

---

## 9. Acompanhar pedido ✅

**Rota:** `/pedido/{id-do-pedido}`

### O que você vê

- Confirmação **Pedido recebido** ou **Pedido confirmado 🎉** (se pago);
- Status do **pagamento** (Mercado Pago);
- Linha do tempo: **Pedido recebido → Em preparação → Em entrega → Entregue**;
- Botão **Tentar pagamento novamente** (se pagamento pendente ou recusado);
- **Atualizar** para buscar status mais recente;
- **Voltar para início**.

### Tutorial — depois de pagar no Mercado Pago

1. Ao concluir (ou cancelar) no MP, você volta automaticamente para esta página.
2. Se o pagamento ainda aparecer **Aguardando**, aguarde alguns segundos — o sistema atualiza sozinho.
3. Use **Tentar pagamento novamente** se necessário.
4. Acompanhe a preparação até **Entregue**.

### Tutorial — abrir pedido antigo

1. Entre em **Perfil** → **Meus Pedidos**.
2. Clique no pedido desejado ou em **Ver acompanhamento completo**.
3. Você chega em **`/pedido/{id}`**.

> Precisa estar **logado** com a mesma conta que fez o pedido.

---

## 10. Meu perfil ✅

**Rota:** `/perfil`  
**Pré-requisito:** login. Sem login, você é redirecionado à home.

Menu lateral (ou horizontal no celular):

- **Informações Básicas**
- **Endereço de Entrega**
- **Meus Pedidos**
- **E-mails Promocionais**
- **Mudar Senha**
- **Finalizar sessão**

---

### 10.1 Informações básicas ✅

#### Tutorial — atualizar dados

1. Acesse **`/perfil`** → **Informações Básicas**.
2. Edite **Nome**, **CPF**, **WhatsApp**.
3. O **e-mail** aparece somente leitura.
4. Salve as alterações (botão de salvar da seção).
5. Aguarde a mensagem de confirmação.

---

### 10.2 Endereços de entrega ✅

#### Tutorial — cadastrar endereço

1. Vá em **Endereço de Entrega**.
2. Clique **+ Novo Endereço** (ou **Novo Endereço**).
3. Preencha rua, número, bairro, cidade, CEP, complemento e rótulo (ex.: Casa).
4. Clique **Salvar Endereço**.
5. O endereço fica disponível no checkout.

#### Tutorial — remover endereço

1. Na lista de endereços, use a opção de **excluir/remover** do endereço desejado.
2. Confirme se solicitado.

---

### 10.3 Meus pedidos ✅

#### Tutorial — ver histórico e pagar pendente

1. Abra **Meus Pedidos**.
2. Clique em um pedido para abrir o **detalhe** (gaveta lateral).
3. Veja itens, valores, status e pagamento.
4. Se o pagamento falhou ou está pendente, use **Tentar pagamento novamente**.
5. Use **Ver acompanhamento completo** para ir à página do pedido.
6. **Voltar para a loja** retorna ao catálogo.

---

### 10.4 E-mails promocionais ✅

#### Tutorial — ativar ou desativar ofertas por e-mail

1. Vá em **E-mails Promocionais**.
2. Ligue ou desligue o interruptor de opt-in.
3. Salve se houver botão de confirmação.

---

### 10.5 Mudar senha ✅

#### Tutorial — trocar senha estando logado

1. Acesse **Mudar Senha**.
2. Informe a **senha atual**, a **nova senha** e a **confirmação**.
3. Salve.
4. Na próxima vez, use a nova senha em **Entrar**.

---

### 10.6 Sair da conta ✅

1. Clique **Finalizar sessão**.
2. Você volta a navegar como visitante (precisará entrar de novo para comprar).

---

## 11. Como chegar? (loja física) ✅

**Onde:** botão **Como chegar?** no cabeçalho (não aparece na home).

### Tutorial

1. Clique **Como chegar?**.
2. Leia endereço, horário e mapa embutido.
3. Clique **Abrir no Google Maps** para navegação no celular.
4. Feche o diálogo com **×** quando terminar.

---

## 12. Página não encontrada ✅

Se você digitar um endereço que não existe, verá:

- **Página não encontrada**
- Botão **Voltar ao início**

---

# Parte II — Quem administra a loja

---

## 13. Acesso ao painel admin ✅

**Rota:** `/admin`

### Pré-requisitos

- Conta criada no site;
- Perfil promovido para **`admin`** pela equipe técnica (não basta criar conta normal).

### Tutorial — entrar no admin

1. Faça login no site com seu e-mail de administrador.
2. Acesse **`/admin`** no navegador.
3. Se tiver permissão, verá o painel com menu lateral.
4. Se **não** for admin, você volta para a loja sem mensagem de erro (por segurança).

### Menu do admin

| Item | Função |
|------|--------|
| **Dashboard** | Resumo geral |
| **Pedidos** | Operar pedidos do dia |
| **Produtos** | Catálogo |
| **Categorias** | Organização da loja |
| **Configurações** | Horário, frete, bairros, slots |
| **Cupons** | Descontos |
| **Agenda** | Exceções de capacidade por data |
| **Rotas** | Rotas de entrega |
| **Entregadores** | Cadastro de motoristas |
| **Geocódigos** | Endereços no mapa para rotas |

Rodapé do menu: **Sair**, **Ver loja ↗** (abre a loja em nova aba).

### Admin no celular ✅ (menu básico)

1. No celular, abra **`/admin`**.
2. Toque no ícone **☰ (menu)** no topo.
3. Escolha a seção desejada.
4. Toque fora do menu ou no overlay para fechar.

> Telas muito largas (tabelas de pedidos) podem exigir scroll horizontal — prefira tablet ou computador para operação intensa.

---

## 14. Dashboard ✅

**Rota:** `/admin`

### Tutorial — visão geral do dia

1. Ao entrar, veja os cards:
   - **Total de Pedidos**
   - Por status: **Recebidos**, **Preparando**, **Entregando**, **Entregues**, **Cancelados**
   - **Produtos** e **Categorias** cadastrados
2. Use **Ações Rápidas**:
   - **Ver Pedidos** → `/admin/pedidos`
   - **Adicionar Produto** → `/admin/produtos`
   - **Categorias** → `/admin/categorias`

---

## 15. Pedidos ✅

**Rota:** `/admin/pedidos`

Esta é a tela mais usada no dia a dia.

### Tutorial — encontrar um pedido

1. Abra **Pedidos**.
2. Use a busca: **Buscar por nº, cliente, e-mail, telefone…** (atalho **Ctrl+K** no computador).
3. Filtre por **status** (Recebido, Preparando, etc.) ou **pagamento** (Aguardando, Pago…).
4. Clique na linha do pedido para ver **detalhes**.

### Tutorial — atualizar status de um pedido

1. Abra o detalhe do pedido.
2. Altere o status conforme a operação:
   - **Recebido** — pedido novo;
   - **Preparando** — separação no mercado;
   - **Entregando** — saiu para entrega;
   - **Entregue** — cliente recebeu;
   - **Cancelado** — pedido cancelado.
3. Confirme se o sistema pedir (ex.: cancelamento).

> O cliente vê essa mudança em tempo real em **`/pedido/{id}`**.

### Tutorial — criar rota de entrega a partir de pedidos

1. Filtre pedidos em status **Preparando** (ou prontos para sair).
2. Marque os pedidos desejados (checkbox).
3. Clique **Criar rota com N pedidos**.
4. Se passar do limite de paradas, use **Dividir em N rotas**.
5. Confirme — os pedidos vão para **Entregando** e a rota aparece em **Rotas**.

---

## 16. Produtos ✅

**Rota:** `/admin/produtos`

### Tutorial — cadastrar produto novo

1. Clique **Novo Produto**.
2. Preencha:
   - **Nome** e **descrição**
   - **Preço** e **unidade** (kg, un, etc.)
   - **Categoria**
   - **Imagem** (upload — aparece na loja)
   - **Produto ativo** (ligado = visível na loja)
3. Clique **Criar** ou **Salvar alterações**.

### Tutorial — editar ou desativar produto

1. Na lista, use **Editar** no produto.
2. Altere campos necessários.
3. Desligue **Produto ativo** para **ocultar** da loja sem apagar.
4. Salve.

### Tutorial — filtrar lista

- Use **Todos / Ativos / Inativos** e a busca por nome.

---

## 17. Categorias ✅

**Rota:** `/admin/categorias`

### Tutorial — nova categoria

1. Clique **+ Nova Categoria**.
2. Informe **nome**, **slug** (URL amigável), **ordem** e descrição.
3. Marque **Categoria ativa**.
4. Clique **Criar Categoria**.

### Tutorial — editar categoria

1. Clique **Editar** na linha desejada.
2. Ajuste nome, ordem ou status.
3. **Salvar**.

> A ordem e o slug afetam como a categoria aparece em **`/loja#cat-{slug}`**.

---

## 18. Configurações da loja ✅

**Rota:** `/admin/configuracoes`

Configure tudo que impacta checkout, frete e rotas.

### 18.1 Horário de funcionamento

1. Ajuste **Abertura** e **Fechamento**.
2. Salve o formulário.
3. O cliente vê horário no diálogo **Como chegar?** e indicadores da loja.

### 18.2 Área de entrega (cidades)

1. Em **Cidades atendidas**, adicione ou remova cidades.
2. Salve.

### 18.3 Bairros atendidos

1. Escolha a aba da **cidade**.
2. **Importar do IBGE** ou adicione bairros **manualmente**.
3. **Ative/desative** bairros com o toggle — só bairros ativos aceitam pedidos.
4. Use **Excluir** para remover bairros obsoletos.

### 18.4 Frete

1. **Valor fixo do frete (R$)** — taxa padrão.
2. **Frete grátis acima de (R$)** — valor mínimo do pedido.
3. **Frete grátis habilitado** — liga/desliga a regra.
4. Salve.

### 18.5 Horários de entrega (slots)

1. Veja a lista de faixas (ex.: 08:00–10:00).
2. Ajuste **capacidade máxima** por slot.
3. Ative/desative slots com o toggle.
4. Alterações afetam o checkout na hora.

### 18.6 Origem das rotas (loja no mapa)

1. Preencha **Cidade da loja**, **Endereço da loja**.
2. Informe **Latitude** e **Longitude** quando disponíveis (melhora otimização).
3. Salve — usado ao gerar rotas no Google Maps.

---

## 19. Cupons ✅

**Rota:** `/admin/cupons`

### Tutorial — criar cupom

1. Clique **Novo Cupom**.
2. Defina:
   - **Código** (ex.: `BEMVINDO10`)
   - **Tipo** — percentual ou valor fixo
   - **Valor do desconto**
   - **Validade** e **limite de uso** (se aplicável)
   - **Cupom ativo**
3. Clique **Criar cupom**.

### Tutorial — desativar cupom

1. Edite o cupom ou use o status **● Ativo**.
2. Desative **Cupom ativo** para impedir novos usos.

---

## 20. Agenda (exceções de entrega) ✅

**Rota:** `/admin/agenda`

Use quando um dia ou horário precisa de capacidade diferente (feriado, chuva, equipe reduzida).

### Tutorial — reduzir capacidade de um horário

1. Selecione a **data** no calendário.
2. Na linha do slot, marque **Exceção ativa** e informe a **nova capacidade**.
3. Salve — o checkout mostrará **Lotado** mais cedo se necessário.

### Tutorial — bloquear o dia inteiro

1. Selecione a data.
2. Clique **Bloquear dia inteiro**.
3. Confirme **Bloquear dia inteiro?**
4. Nenhum slot ficará disponível nessa data.

### Tutorial — limpar exceções

1. Clique **Limpar todas as exceções** da data selecionada.
2. Confirme — volta ao padrão dos slots normais.

---

## 21. Rotas de entrega ✅

**Rota:** `/admin/rotas` e **`/admin/rotas/{id}`**

### Tutorial — acompanhar rotas

1. Abra **Rotas**.
2. Use as abas: **Rascunho**, **Ativa**, **Concluída**, **Cancelada**.
3. Clique em uma rota para abrir o **detalhe**.

### Tutorial — operar uma rota (detalhe)

1. Em **`/admin/rotas/{id}`**, veja a lista de **paradas** (pedidos).
2. Selecione o **Entregador** responsável.
3. Abra o link do **Google Maps** para navegação.
4. Conforme entrega cada pedido, atualize o status da parada.
5. Ao terminar todas, clique **Concluir rota**.
6. Para interromper, use **Cancelar rota** (com cuidado).

---

## 22. Entregadores ✅

**Rota:** `/admin/entregadores`

### Tutorial — cadastrar entregador

1. Clique **Novo entregador**.
2. Preencha nome, telefone e dados solicitados.
3. Clique **Criar entregador**.

### Tutorial — editar ou excluir

1. **Editar** — altera dados.
2. **Excluir** — só funciona se o entregador **não** estiver em rota ativa.

---

## 23. Geocodificação ✅

**Rota:** `/admin/geocodificacao`

Converte endereços de pedidos em coordenadas no mapa — necessário para rotas otimizadas.

### Tutorial — geocodificar em lote

1. Veja o resumo: **Total ativos**, **Geocodificados**, **Sem geocódigo**.
2. Clique **Geocodificar lote (50 pedidos)**.
3. Aguarde o processamento.
4. Clique **Atualizar** para ver a barra de cobertura subir.

### Tutorial — geocodificar um pedido

1. Na tabela de pendentes, clique **Geocodificar** na linha do pedido.
2. Aguarde status **OK**.

> A lista mostra até **100** pedidos pendentes por vez — repita o lote se necessário.

---

# Parte III — Pagamentos e pedidos (visão completa)

## 24. Fluxo completo — do clique à entrega ✅

```
Cliente monta sacola (/loja)
    → Checkout: endereço + agendamento + pagamento + revisão
    → Sistema cria pedido (place-order)
    → Redireciona ao Mercado Pago
    → Cliente paga (Pix)
    → Webhook MP confirma pagamento
    → Admin vê pedido "Pago" e muda para Preparando
    → Admin cria rota → Entregando
    → Entregador conclui paradas
    → Status Entregue — cliente vê na página do pedido
```

## 25. O que o cliente vê vs. o que o admin faz

| Momento | Cliente | Admin |
|---------|---------|-------|
| Pedido criado | Página do pedido — aguardando pagamento | Pedido na lista — pagamento pendente |
| Pix aprovado | "Pagamento confirmado" | Pagamento **Pago** |
| Separando | "Em preparação" | Status **Preparando** |
| Saiu para entrega | "Em entrega" | Status **Entregando** + rota ativa |
| Recebeu | "Entregue" | Status **Entregue** + rota concluída |

---

## EM BREVE — o que ainda está chegando

| Funcionalidade | Situação |
|----------------|----------|
| Pagamento cartão crédito/débito no MP | Ajuste fino em produção |
| Pagamento dinheiro na entrega | Não no checkout |
| Esqueci minha senha — tela de nova senha | E-mail envia; fluxo incompleto |
| Termos de uso e política de privacidade | Links placeholder |
| Busca por nome na loja | Não implementada |
| Botão **Editar** do carrinho | Sem ação completa |
| Site em domínio público de produção | Deploy pendiente |
| Relatórios PDF/Excel no admin | 💡 futuro |

---

## Podemos evoluir para… (roadmap)

💡 Ideias possíveis — **sem prazo garantido**:

- App mobile nativo (iOS/Android)
- Notificações WhatsApp/SMS de status
- Rastreamento do entregador ao vivo no mapa
- Programa de fidelidade
- Cesta semanal por assinatura
- Painel do entregador (app motorista)
- Multi-loja / multi-cidade
- PWA instalável na tela inicial

---

## Glossário

| Termo | Significado simples |
|-------|---------------------|
| **Sacola / carrinho** | Lista temporária de produtos antes de pagar |
| **Checkout** | Processo de finalizar compra (endereço → pagamento) |
| **Slot** | Faixa de horário de entrega (ex.: 14h–16h) |
| **Cupom** | Código de desconto |
| **Pedido** | Compra confirmada no sistema (tem número) |
| **Webhook** | Aviso automático do Mercado Pago quando o Pix é pago |
| **Rota** | Sequência de entregas para um entregador |
| **Geocódigo** | Transformar endereço em ponto no mapa |
| **Admin** | Painel de gestão da loja |

---

## Solução de problemas comuns

### Não consigo entrar no `/perfil`

- Faça **Entrar** primeiro. Sem login, o sistema redireciona para a home.

### Checkout manda de volta para a loja

- A **sacola está vazia**. Adicione produtos antes de **`/checkout`**.

### Bairro não atendido

- Verifique se digitou o bairro correto. Peça ao admin para **ativar o bairro** em Configurações.

### Horário aparece "Lotado"

- Todos os slots daquele horário encheram. Escolha outro horário ou outro dia. Admin pode aumentar capacidade em **Configurações** ou **Agenda**.

### Paguei no Pix mas ainda aparece "Aguardando"

- Aguarde até 1–2 minutos. Use **Atualizar** na página do pedido. Se persistir, admin verifica webhook do Mercado Pago.

### Não tenho acesso ao `/admin`

- Sua conta precisa ser promovida a **administrador** — contate a equipe técnica.

### Produto não aparece na loja

- No admin, confira se **Produto ativo** está ligado e se a categoria está ativa.

---

## Próximo passo — gerar PDF

Este arquivo é a **fonte** do manual. Para entregar PDF ao cliente:

1. Revisar textos e capturas de tela reais;
2. Exportar para PDF (ex.: `docs/manual-cliente-chamaolucca-v1.pdf`);
3. Validar com o cliente antes de distribuir.

---

*ChamaOLucca — Manual de uso v1.0*
