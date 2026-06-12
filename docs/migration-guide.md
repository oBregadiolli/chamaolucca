# Guia de Migracao — ChamaoLucca para Novo Projeto Supabase

Data: 07/04/2026 | Versao: 1.0

## Objetivo
Este documento guia a transferencia completa do banco de dados do projeto
ChamaoLucca para um novo projeto Supabase, em qualquer conta.

## Arquivos necessarios (nesta pasta)
- database-schema.sql  → cria todas as tabelas, RLS, triggers e seeds
- security-audit.md    → pendencias de seguranca a resolver apos migrar

---

## PASSO 1 — Criar novo projeto no Supabase

1. Acesse: https://supabase.com/dashboard
2. Clique em "New Project"
3. Escolha a organizacao de destino
4. Preencha:
   - Name: chamaolucca (ou o nome que preferir)
   - Database Password: gere uma senha forte e SALVE em local seguro
   - Region: sa-east-1 (Sao Paulo) — mais proximo dos usuarios BR
5. Clique "Create new project"
6. Aguarde ~2 minutos ate o projeto ficar pronto (status: Active)

---

## PASSO 2 — Executar o schema no novo banco

1. No dashboard do NOVO projeto, va em:
   SQL Editor (menu esquerdo) > New Query

2. Abra o arquivo database-schema.sql desta pasta

3. Cole TODO o conteudo no editor SQL

4. Clique em "Run" (Ctrl+Enter)

5. Deve aparecer: "Success. No rows returned"
   Se houver erros, veja a secao RESOLUCAO DE ERROS ao final deste documento.

---

## PASSO 3 — Configurar autenticacao

No dashboard do novo projeto, va em:
Authentication > Settings (URL Configuration)

Configure:
- Site URL: https://seu-dominio.com (ou http://localhost:5173 para dev)
- Redirect URLs (adicionar todas):
  - http://localhost:5173/**
  - https://seu-dominio.com/**
  - (Recuperação de senha por e-mail: backlog BL-002 — não incluir `/redefinir-senha` no MVP)

Va em Authentication > Providers:
- Email: deixe habilitado
- Confirm email: opcional (desabilite para facilitar testes)

---

## PASSO 4 — Pegar as credenciais do novo projeto

No dashboard do novo projeto, va em:
Project Settings > API

Anote:
- Project URL: https://XXXXXXXXXXXXXXXX.supabase.co
- anon public key: eyJhbG... (chave longa)

---

## PASSO 5 — Atualizar o .env do projeto

Abra o arquivo .env na raiz do projeto e substitua:

VITE_SUPABASE_URL=https://SEU-NOVO-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-NOVA-ANON-KEY-AQUI

Salve o arquivo. O servidor de desenvolvimento (npm run dev) vai recarregar automaticamente.

---

## PASSO 6 — Criar o primeiro usuario admin

No novo banco, o primeiro usuario precisa virar admin manualmente:

6a. Va para o novo app rodando localmente
6b. Crie uma conta normalmente pelo formulario de registro
6c. Va ao Supabase Dashboard > Table Editor > profiles
6d. Encontre o seu perfil recém criado
6e. Edite o campo role de 'customer' para 'admin'
6f. Salve

OU via SQL Editor:
  UPDATE public.profiles
  SET role = 'admin'
  WHERE email = 'seu@email.com';

---

## PASSO 7 — Configurar Storage (buckets para imagens)

Se o projeto usa upload de imagens de produtos ou categorias:

1. Va em Storage > New Bucket
2. Crie os buckets necessarios:
   - products → publico (para imagens dos produtos)
   - categories → publico (para imagens das categorias)

3. Em cada bucket, va em Policies e adicione:

Para leitura publica:
  CREATE POLICY "Leitura publica"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

Para upload apenas admin:
  CREATE POLICY "Upload admin"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

---

## PASSO 8 — Fazer deploy das Edge Functions

O projeto usa 3 Edge Functions ativas + 1 a criar:

### 8a. create-mp-preference (Mercado Pago)
Variaveis de ambiente necessarias (Authentication > Edge Functions > Secrets):
  MP_ACCESS_TOKEN = seu token do Mercado Pago (obtido em https://www.mercadopago.com.br/developers)

### 8b. optimize-route (Google Maps)
Variaveis de ambiente necessarias:
  GOOGLE_MAPS_API_KEY = sua chave da API Google Maps Directions

### 8c. geocode-address (Google Maps)
Usa a mesma GOOGLE_MAPS_API_KEY acima.

Para adicionar os secrets:
1. Va em Project Settings > Edge Functions > Secrets
2. Adicione cada variavel

Para fazer deploy das funcoes (via Supabase CLI):
  supabase functions deploy create-mp-preference --project-ref SEU-PROJECT-ID
  supabase functions deploy optimize-route --project-ref SEU-PROJECT-ID
  supabase functions deploy geocode-address --project-ref SEU-PROJECT-ID

---

## PASSO 9 — Migrar dados existentes (opcional)

Se quiser trazer os dados do projeto antigo para o novo:

### Exportar do banco antigo (via Supabase Dashboard > SQL Editor):

-- Exporta categorias
SELECT * FROM public.categories;

-- Exporta produtos
SELECT * FROM public.products;

-- Exporta configuracoes da loja
SELECT * FROM public.store_settings;

-- Exporta usuarios (profiles — SEM senhas, apenas metadados)
SELECT id, name, email, phone, role FROM public.profiles;

-- Exporta pedidos (historico)
SELECT * FROM public.orders;
SELECT * FROM public.order_items;

Copie o resultado como CSV e importe no novo banco via:
Table Editor > Import data from CSV

ATENCAO: usuarios (auth.users) NAO podem ser migrados diretamente.
Os usuarios precisarao criar nova senha no novo sistema via "Esqueci minha senha".

---

## PASSO 10 — Verificar funcionamento

Checklist final antes de apontar o dominio de producao:

- [ ] Login e cadastro funcionando
- [ ] Catalogo de produtos carregando
- [ ] Carrinho adicionando e persistindo
- [ ] Checkout chegando ate o Mercado Pago
- [ ] Admin consegue acessar /admin
- [ ] Admin consegue ver pedidos
- [ ] Admin consegue criar rotas
- [ ] Admin consegue geocodificar enderecos
- [ ] Edge Function create-mp-preference respondendo
- [ ] Edge Function optimize-route respondendo

---

## RESOLUCAO DE ERROS COMUNS

### Erro: "relation already exists"
O schema ja foi executado antes. Execute apenas as partes que faltam,
ou rode: DROP SCHEMA public CASCADE; CREATE SCHEMA public;
(ATENCAO: apaga tudo — use apenas em banco novo e vazio)

### Erro: "permission denied for table auth.users"
Normal durante testes locais. No Supabase cloud o trigger funciona corretamente
pois o SQL roda com permissao de service_role.

### Erro no trigger on_auth_user_created
Va em Database > Functions e verifique se a funcao handle_new_user existe.
Se nao existir, execute apenas a parte do trigger do schema.

### Imagens nao carregam
Verifique se os buckets de Storage foram criados e se as policies de leitura
publica estao configuradas corretamente.

### Edge Function retorna 401
Adicione o anon key correto do NOVO projeto nas chamadas fetch.
O .env do front-end deve estar apontando para o novo projeto.

### Cupons nao funcionam
Verifique se a funcao increment_coupon_use foi criada:
  SELECT routine_name FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

---

## Mapa de tabelas e relacoes

profiles (1) ──────────────── (N) orders
                                      │
                                      └─── (N) order_items ──── (N) products
                                                                      │
                                                               categories (1)

profiles (1) ──── (N) addresses
profiles (1) ──── (N) carts ──── (N) cart_items ──── products

routes (N) ──── (1) drivers
routes (1) ──── (N) route_stops ──── orders

store_settings (standalone chave-valor)
delivery_slots (standalone)
delivery_slot_exceptions (standalone)
coupons (standalone)

---

## Variaveis de ambiente completas

Arquivo .env (nunca commitar no git):

VITE_SUPABASE_URL=https://SEU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Edge Function Secrets (Supabase Dashboard):

MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxxxxxxxxx
GOOGLE_MAPS_API_KEY=AIzaSy...

---

## Informacoes do projeto original

Project ID: cxhzclpsuxulzvroptyl
Project URL: https://cxhzclpsuxulzvroptyl.supabase.co
Region: Provavelmente sa-east-1 ou us-east-1
