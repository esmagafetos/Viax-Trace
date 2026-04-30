# Contribuindo com o ViaX:Trace

Obrigado pelo interesse em contribuir! Este documento descreve o fluxo recomendado para que sua contribuição seja aceita rapidamente.

## Código de conduta

Ao participar deste projeto, você concorda em seguir o nosso [Código de Conduta](CODE_OF_CONDUCT.md). Trate todos com respeito.

## Como posso contribuir?

- 🐛 **Reportar bugs** — abra uma [issue de bug](https://github.com/ViaXTrace/Viax-Trace/issues/new?template=bug_report.md)
- ✨ **Sugerir funcionalidades** — abra uma [issue de feature](https://github.com/ViaXTrace/Viax-Trace/issues/new?template=feature_request.md)
- 📝 **Melhorar a documentação** — qualquer melhoria no `README.md`, comentários, ou exemplos é bem-vinda
- 🔧 **Enviar código** — siga o fluxo abaixo

## Setup de desenvolvimento

### Pré-requisitos
- Node.js **20+**
- pnpm **9+** (`npm install -g pnpm`)
- PostgreSQL **14+**

### Passos
```bash
# 1. Faça fork e clone seu fork
git clone https://github.com/SEU-USUARIO/Viax-Scout.git
cd Viax-Scout

# 2. Adicione o upstream para sincronizar
git remote add upstream https://github.com/ViaXTrace/Viax-Trace.git

# 3. Instale dependências
pnpm install

# 4. Configure variáveis
cp .env.example .env
# Edite .env com suas credenciais

# 5. Aplique o schema
pnpm --filter @workspace/db run push

# 6. Inicie em modo dev
pnpm run dev
```

## Estrutura do monorepo

```
artifacts/
  api-server/        # Express 5 — porta 8080
  viax-scout/        # React 19 + Vite — porta 5173
  geocodebr-service/ # R + plumber — porta 8002 (opcional)
lib/
  db/                # Drizzle ORM + schema
  api-spec/          # openapi.yaml + codegen
  api-zod/           # schemas Zod (gerado)
  api-client-react/  # hooks TanStack Query (gerado)
```

Mais detalhes em [`README.md`](README.md#-arquitetura) e [`replit.md`](replit.md).

## Fluxo de contribuição

1. **Crie uma branch** a partir de `main`:
   ```bash
   git checkout -b feat/minha-feature
   # ou: fix/bug-x, docs/melhoria-y
   ```
2. **Implemente** suas alterações seguindo os padrões existentes (TypeScript estrito, ESM, sem `any` desnecessário).
3. **Valide** localmente:
   ```bash
   pnpm run typecheck   # obrigatório — não pode ter erros
   pnpm run build       # opcional, mas recomendado
   ```
4. **Commit** seguindo [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: adiciona suporte a CEP no parser`
   - `fix: corrige timeout no Photon`
   - `docs: atualiza instruções de Termux`
   - `chore(deps): atualiza drizzle para 0.36`
5. **Sincronize com o upstream** antes de abrir o PR:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
6. **Abra um Pull Request** preenchendo o template. Vincule a issue relacionada (`Closes #123`).

## Padrões de código

- **TypeScript estrito** — sem `// @ts-ignore` sem justificativa
- **Imports relativos curtos** dentro do mesmo pacote, alias `@workspace/*` entre pacotes
- **Não introduza placeholders ou mocks silenciosos** — falhe explicitamente
- **Logs via `pino`** (no backend) e via console no frontend apenas em desenvolvimento
- **Sem segredos commitados** — use `.env` e `process.env`

### Mudanças na API
1. Edite `lib/api-spec/openapi.yaml`
2. Rode `pnpm --filter @workspace/api-spec run codegen`
3. Implemente a rota em `artifacts/api-server/src/routes/`
4. Use o hook gerado em `@workspace/api-client-react`

### Mudanças no banco
1. Edite `lib/db/src/schema/`
2. Rode `pnpm --filter @workspace/db run push`

### Mudanças nos instaladores
- Teste o script alvo (`install.sh`, `install.ps1`, `install-geocodebr-termux.sh`)
- Para `*.sh`, valide com `bash -n script.sh` e idealmente `shellcheck`

## Revisão de PR

- PRs precisam passar no CI (typecheck + build + shellcheck)
- Pelo menos 1 aprovação do mantenedor
- Squash merge é o padrão — mantenha o título do PR limpo e descritivo

## Dúvidas

Use [GitHub Discussions](https://github.com/ViaXTrace/Viax-Trace/discussions) para perguntas abertas e [Issues](https://github.com/ViaXTrace/Viax-Trace/issues) apenas para bugs e features.

---

Feito com ☕ no Brasil.
