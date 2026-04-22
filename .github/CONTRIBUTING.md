# Guia de Contribuição — ViaX:Trace

Obrigado por dedicar seu tempo a melhorar o ViaX:Trace. Este documento define o processo para contribuir com código, reportar bugs e propor novas funcionalidades.

---

## Índice

- [Código de Conduta](#código-de-conduta)
- [Como contribuir](#como-contribuir)
- [Configurar o ambiente de desenvolvimento](#configurar-o-ambiente-de-desenvolvimento)
- [Fluxo de trabalho com Git](#fluxo-de-trabalho-com-git)
- [Convenções de código](#convenções-de-código)
- [Testes e validação](#testes-e-validação)
- [Reportar bugs](#reportar-bugs)
- [Propor funcionalidades](#propor-funcionalidades)

---

## Código de Conduta

Esperamos respeito e profissionalismo em todas as interações. Contribuições ofensivas, discriminatórias ou de má-fé serão removidas sem aviso.

---

## Como contribuir

1. **Fork** o repositório e clone localmente
2. Crie uma **branch descritiva** a partir de `main`
3. Faça suas alterações com commits atômicos e bem descritos
4. Execute as validações locais (veja [Testes e validação](#testes-e-validação))
5. Abra um **Pull Request** usando o template fornecido

---

## Configurar o ambiente de desenvolvimento

### Pré-requisitos

- Node.js 20+
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL 14+

### Setup

```bash
git clone https://github.com/esmagafetos/Viax-Scout.git
cd Viax-Scout

pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com DATABASE_URL e SESSION_SECRET

# Aplique o schema no banco
pnpm --filter @workspace/db run push

# Inicie todos os serviços
pnpm run dev
```

---

## Fluxo de trabalho com Git

### Nomenclatura de branches

```
feat/nome-da-feature     ← nova funcionalidade
fix/descricao-do-bug     ← correção de bug
chore/descricao          ← manutenção, refatoração, deps
docs/descricao           ← documentação
```

### Conventional Commits

Todos os commits devem seguir o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adiciona suporte a CEP com hífen no parser
fix: corrige cálculo de similaridade para endereços com POI
chore: atualiza dependência express para 5.1.0
docs: adiciona exemplo de planilha no README
refactor: extrai lógica de geocodificação reversa para módulo próprio
```

**Tipos aceitos:** `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`

---

## Convenções de código

### TypeScript

- Tipagem explícita em todas as funções públicas
- Sem `any` implícito — use tipos precisos ou `unknown`
- Use `zod` para validação de entrada em rotas da API

### Estrutura de arquivos

- Novas rotas da API → `artifacts/api-server/src/routes/`
- Novas páginas → `artifacts/viax-scout/src/pages/`
- Componentes reutilizáveis → `artifacts/viax-scout/src/components/`
- Alterações de schema → `lib/db/src/schema/`

### Adicionando endpoints

1. Defina o contrato em `lib/api-spec/openapi.yaml`
2. Execute o codegen: `pnpm --filter @workspace/api-spec run codegen`
3. Implemente a rota no servidor
4. Use o hook gerado no frontend via `@workspace/api-client-react`

---

## Testes e validação

Antes de abrir um PR, valide:

```bash
# Typecheck completo do monorepo
pnpm run typecheck

# Build de produção
pnpm run build
```

---

## Reportar bugs

Abra uma [issue de bug](https://github.com/esmagafetos/Viax-Scout/issues/new?template=bug_report.md) incluindo:

- Passos para reproduzir (mínimo reproduzível)
- Comportamento esperado vs. observado
- Versão do Node.js (`node -v`) e sistema operacional
- Logs relevantes (sem dados sensíveis)

---

## Propor funcionalidades

Abra uma [issue de feature](https://github.com/esmagafetos/Viax-Scout/issues/new?template=feature_request.md) descrevendo:

- O problema que a funcionalidade resolve
- A solução proposta
- Alternativas consideradas
- Impacto estimado (performance, segurança, UX)
