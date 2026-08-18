# Convenções do projeto — ChamãoLucca

Regras de código válidas para todo o repositório. Ao abrir uma tarefa de UI,
siga estes padrões. Eles evoluem: quando definirmos um padrão novo, registre aqui.

## UI / Front-end

### 1. Sem emojis na interface
Nunca usar emoji (🎉 ⚡ ⚠ …) como ícone de UI. Emoji renderiza diferente por
sistema, não herda cor/tamanho e quebra a consistência visual.
**Use ícones** do Material Symbols (`<span className="material-symbols-rounded">nome</span>`)
ou o componente `<Icon />` (`src/components/ui/Icon.jsx`).
- Party popper → `celebration`
- Raio/rápido → `bolt` ou `electric_bolt`
- Aviso → `warning` / `error`

### 2. Cores via tokens, nunca hex cru
A paleta vive em `src/styles/tokens.css` como variáveis CSS (`--c-primary`,
`--c-accent`, `--c-text-muted`, …). Em CSS use `var(--token)`; se precisar em
estilo inline, também use `var(--token)`. **Não** escreva `#16a34a` espalhado
pelo componente. Precisou de uma cor nova? Adicione um token primeiro.

### 3. Estilo em CSS, não inline
Prefira classes em arquivos `.css` a objetos de estilo inline. Inline só para
valor genuinamente dinâmico (ex.: `width: ${progress}%`). Estilos estáticos
repetidos viram classe. Motivo: inline duplicado é a causa raiz de telas que
divergem entre si.

### 4. Componentes reutilizáveis, uma fonte de verdade
Mesma UI em telas diferentes = **um componente** com props/`variant`, não cópias.
Regra de negócio (cálculos, condições) não se duplica: extraia para um hook ou
util compartilhado. Ex.: `FreeShippingBanner` (`variant="banner"|"compact"`)
serve checkout e carrinho a partir do mesmo código.

### 5. Acessibilidade mínima
- Texto essencial com contraste AA (use `--c-text` / `--c-text-muted`, não
  `--c-text-faint` para texto que precisa ser lido).
- Alvos de toque ≥ ~44px em mobile.
- Estado de botão selecionado comunicado além da cor (`aria-pressed`).

## Backend / dados
- Migrations em `supabase/migrations/`, numeradas e idempotentes quando possível
  (`IF NOT EXISTS`, `CREATE OR REPLACE`).
- Enforcement de regra crítica no servidor (edge function / trigger / índice),
  não só no front. O front valida para UX; o servidor valida para verdade.

## Supabase — qual MCP usar (importante)
Este projeto usa o MCP `supabase-pessoal` definido em `.mcp.json` na raiz
(ref `wjkytzvgbvkcaqjrqsbu`), autenticado por `${SUPABASE_PAT_PESSOAL}`.
Use sempre esse MCP aqui. Se houver outro servidor Supabase disponível no
ambiente, **não use** — em caso de dúvida sobre qual MCP chamar, pergunte antes.
O CLI `supabase` lê o token via `SUPABASE_ACCESS_TOKEN`, mapeado em
`.claude/settings.local.json` (não versionado).
