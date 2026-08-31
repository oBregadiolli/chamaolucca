-- Migration 008: cupom com limite de 1 uso por cliente + CPF único por conta

-- ── Parte 1: cupom de uso único por cliente ──
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS single_use_per_customer boolean NOT NULL DEFAULT false;

-- ── Parte 2: CPF único por conta ──

-- 2.1 Normaliza os CPFs já gravados para apenas dígitos.
--     O app passou a gravar sem máscara; sem este passo,
--     '123.456.789-00' e '12345678900' contariam como CPFs
--     diferentes e o índice único deixaria a duplicata passar.
UPDATE public.profiles
SET    cpf = regexp_replace(cpf, '\D', '', 'g')
WHERE  cpf IS NOT NULL
  AND  cpf <> regexp_replace(cpf, '\D', '', 'g');

-- 2.2 String vazia vira NULL, para o índice parcial ignorar.
UPDATE public.profiles
SET    cpf = NULL
WHERE  cpf IS NOT NULL
  AND  btrim(cpf) = '';

-- 2.3 Aborta se já houver CPF repetido no banco. Decidir qual conta
--     mantém o CPF é decisão de negócio e não pode ser automatizada.
DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(cpf || ' (' || n || ' contas)', ', ')
  INTO   dupes
  FROM   (SELECT cpf, count(*) AS n
          FROM   public.profiles
          WHERE  cpf IS NOT NULL
          GROUP  BY cpf
          HAVING count(*) > 1) d;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION
      'CPFs duplicados em profiles: %. Resolva manualmente antes de aplicar esta migration.', dupes;
  END IF;
END $$;

-- 2.4 Índice parcial único: vários NULL são permitidos,
--     CPF preenchido não pode repetir entre contas.
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL AND cpf <> '';

-- 2.5 Trigger de criação de conta agora grava o CPF vindo do cadastro.
--     Por que aqui e não num UPDATE do cliente pós-cadastro:
--     se o CPF fosse gravado depois, um cadastro com CPF duplicado ainda
--     criaria uma conta usável (user_id novo, sem pedidos) e derrotaria o
--     limite de "1 uso por cliente" do cupom. Gravando dentro do trigger,
--     o índice único acima faz a transação inteira reverter → nenhuma
--     conta é criada quando o CPF já existe. Enforcement atômico.
--     Preserva o comportamento da migration 003 (nunca sobrescreve role no
--     conflito; mantém name/phone existentes) e apenas adiciona o cpf.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cpf text;
BEGIN
  -- normaliza para apenas dígitos; vazio → NULL (índice parcial ignora)
  v_cpf := NULLIF(regexp_replace(COALESCE(new.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');

  INSERT INTO public.profiles (id, name, email, phone, cpf, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    v_cpf,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = excluded.email,
    name  = COALESCE(public.profiles.name, excluded.name),
    phone = COALESCE(public.profiles.phone, excluded.phone),
    cpf   = COALESCE(public.profiles.cpf, excluded.cpf);
  RETURN new;
END;
$$;

-- 2.6 Pré-checagem de CPF disponível, para o cadastro dar um erro limpo
--     ("CPF já cadastrado") antes de tentar o signup, em vez do erro
--     genérico do Supabase Auth quando o índice único dispara.
--     SECURITY DEFINER: roda como owner e ignora RLS para conseguir ler
--     profiles. Retorna apenas boolean — não expõe dados de ninguém.
CREATE OR REPLACE FUNCTION public.cpf_disponivel(p_cpf text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM   public.profiles
    WHERE  cpf = NULLIF(regexp_replace(COALESCE(p_cpf, ''), '\D', '', 'g'), '')
  );
$$;

-- anon: chamado no cadastro (usuário ainda não autenticado)
-- authenticated: chamado ao editar o perfil já logado
GRANT EXECUTE ON FUNCTION public.cpf_disponivel(text) TO anon, authenticated;
