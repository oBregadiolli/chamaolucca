# 🧹 PROMPT DE CLEANUP — Trocar Supabase Antigo pelo Novo

> Cole este prompt na sessão que tem acesso ao projeto ChamaoLucca.
> Ele vai trocar as credenciais antigas pelas novas no código.

---

## INSTRUÇÃO

O projeto ChamaoLucca em `c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca` ainda aponta para o Supabase ANTIGO (projeto `cxhzclpsuxulzvroptyl` que não existe mais).

Faça o cleanup completo:

### PASSO 1: Buscar o Project Ref e Anon Key do NOVO projeto

Execute via Supabase MCP:
```
list_projects → encontrar o projeto ChamaoLucca
get_project → pegar o ref
get_publishable_keys → pegar a anon key
```

### PASSO 2: Atualizar o arquivo `.env`

O arquivo está em: `c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca\.env`

Conteúdo ATUAL (ANTIGO — NÃO FUNCIONA MAIS):
```
VITE_SUPABASE_URL=https://cxhzclpsuxulzvroptyl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Substituir por:
```
VITE_SUPABASE_URL=https://NOVO-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=NOVA-ANON-KEY
```

### PASSO 3: Criar `.env.example`

Criar `c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca\.env.example`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### PASSO 4: Deletar build antigo

```powershell
Remove-Item -Recurse -Force "c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca\dist"
```

### PASSO 5: Verificar que nenhum arquivo fonte tem referência hardcoded

```powershell
Get-ChildItem -Recurse -Include *.js,*.jsx,*.css,*.html -Path "c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca\src" | Select-String -Pattern "cxhzclps" -SimpleMatch
```

Se retornar algo, corrija.

### PASSO 6: Confirmar que o `.env` NÃO está sendo commitado

Verificar que `.gitignore` contém `.env`:
```powershell
Select-String -Path "c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca\.gitignore" -Pattern "^\.env$"
```

### PASSO 7: Rebuild e teste

```powershell
cd c:\Users\brega\OneDrive\Documentos\Projetos\ChamaoLucca
npm run build
```

Se o build passar, abra em `npm run dev` e verifique no DevTools (Network tab) que TODAS as requests vão para o NOVO `*.supabase.co`, NÃO para `cxhzclpsuxulzvroptyl`.

---

## RESULTADO ESPERADO

Após o cleanup:
- `.env` → aponta para novo Supabase
- `.env.example` → criado (sem valores reais)
- `dist/` → deletado (será recriado com `npm run build`)
- Nenhuma referência a `cxhzclpsuxulzvroptyl` no código fonte
- Build funciona sem erros
