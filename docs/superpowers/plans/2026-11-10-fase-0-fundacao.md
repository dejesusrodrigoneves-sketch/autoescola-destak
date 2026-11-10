# Plano de implementação — Fase 0: fundação

**Referência:** `spec.md` 0.3.1 · §18, fase 0 · `decisions.md` 1.2.0
**Data:** 2026-11-10
**Objetivo da fase:** repositório que instala, compila, testa e faz deploy de um `/health`, com o tema do `design.md` aplicado. Nenhuma funcionalidade de negócio.

> **Como executar:** esta sessão não tem terminal (`pwsh` indisponível, sem backend de sandbox). Os comandos abaixo precisam ser rodados na sua máquina. Cada passo tem um critério de verificação — não avance sem ele.

## Estado em 2026-11-10

| Item | Situação |
|---|---|
| Passos 1 a 4 (monorepo, shared, API, web) | feitos |
| `pnpm install` | ✅ pnpm 9.15.9, 785 pacotes |
| `pnpm test` | ✅ 13 testes (10 shared, 1 api, 2 web) |
| `pnpm typecheck` | ✅ 3 pacotes |
| `pnpm lint` | ✅ 3 pacotes |
| `pnpm build` | ✅ shared, api e web |
| `test:e2e` da API | ✅ 2 testes (200 em `/health`, 404 em `/api/v1/health`) |
| Passo 5 (Postgres nativo) | pendente — não bloqueia a fase 0 |
| Passos 8 e 9 (Railway e Pages) | pendentes |

---

## 0. Decisões necessárias antes do passo 1

| ID | Decisão | Por que agora |
|---|---|---|
| D-04 | Zod compartilhado, React Hook Form, TanStack Query | define a estrutura de `packages/shared` e das dependências do web |
| D-11 | `/api/v1` + OpenAPI pelo NestJS | define o prefixo global e o bootstrap |
| D-13 | Vitest, Testing Library, Supertest, Playwright + CI | define os scripts de teste e o workflow |

D-03 (sessão/Argon2id), D-05 (BullMQ), D-07 (RLS), D-09 (Storage) entram nas fases 2 a 4 e podem esperar.

---

## 1. Pré-requisitos

| Item | Versão / observação |
|---|---|
| Node.js | 22 LTS |
| pnpm | 9 ou superior, via `corepack enable` |
| Git | qualquer versão recente |
| Conta GitHub | repositório `destak` |
| Conta Railway | projeto criado, ambiente `production` |
| Supabase | **dois** projetos: `destak-dev` e `destak-prod` (P-20) |
| Docker Desktop | **não é necessário** para desenvolvimento (ver passo 5); o Dockerfile é usado só no deploy |
| Cloudflare | acesso ao Pages e ao DNS |

```bash
node -v          # v22.x
pnpm -v          # 9.x ou 10.x
psql --version   # 16.x
```

**Verificação:** os três comandos respondem sem erro.

---

## 2. Estrutura-alvo

```
destak/
  apps/
    api/                 NestJS
      src/
        main.ts
        app.module.ts
        health/health.controller.ts
      Dockerfile
      package.json
    web/                 Vite + React
      src/
        main.tsx
        App.tsx
        styles/theme.css
      index.html
      package.json
  packages/
    shared/              tipos e schemas Zod
      src/index.ts
      package.json
  .github/workflows/ci.yml
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  .env.example
  .editorconfig
  .gitignore
  README.md
```

---

## 3. Passo 1 — Repositório e workspace

**Objetivo:** monorepo pnpm com os três pacotes vazios que instalam.

```bash
git init
corepack enable
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json` da raiz:
```json
{
  "name": "destak",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

`.gitignore` (mínimo):
```
node_modules/
dist/
.env
.env.*
!.env.example
coverage/
playwright-report/
```

**Verificação:**
```bash
pnpm install
git status --short   # apenas arquivos de configuração, sem node_modules
```

---

## 4. Passo 2 — `packages/shared`

**Objetivo:** pacote interno publicado no workspace, com um schema Zod real e um teste.

`packages/shared/package.json`:
```json
{
  "name": "@destak/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint src --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

`packages/shared/src/index.ts` — começar pequeno e verdadeiro (nada de tipo inventado):
```ts
import { z } from "zod";

/** Formato de telefone usado em todo o sistema: 10 ou 11 dígitos. */
export const phoneSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, {
    message: "Informe DDD e número",
  });

export const roleSchema = z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"]);
export type Role = z.infer<typeof roleSchema>;
```

Teste `packages/shared/src/index.test.ts` cobrindo normalização e rejeição.

**Verificação:**
```bash
pnpm --filter @destak/shared test
pnpm --filter @destak/shared typecheck
```

---

## 5. Passo 3 — `apps/api` (NestJS) com `/health`

**Objetivo:** API que sobe, responde `/api/v1/health` e tem teste de integração.

```bash
pnpm dlx @nestjs/cli new api --package-manager pnpm --directory apps/api --strict
```

Ajustes obrigatórios:

1. `main.ts`: `app.setGlobalPrefix("api/v1")`, `app.listen(port, "0.0.0.0")`, `app.set("trust proxy", 1)`, `helmet`, `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
2. `HealthController`: `GET /health` **fora** do prefixo (usar `app.setGlobalPrefix("api/v1", { exclude: ["health"] })`), retornando `{ status: "ok", db: "skip" }` na fase 0 e `db: "ok"` na fase 2, com `SELECT 1`.
3. Porta por `process.env.PORT ?? 3000`.
4. Teste e2e com Supertest batendo em `/health` e esperando 200.

**Verificação:**
```bash
pnpm --filter api dev
curl -i http://localhost:3000/health          # 200
curl -i http://localhost:3000/api/v1/health   # 404 (prova que o prefixo está certo)
pnpm --filter api test
```

---

## 6. Passo 4 — `apps/web` com tema

**Objetivo:** Vite + React + Tailwind 4 + shadcn/ui, com os tokens do `design.md` como fonte única de cor.

```bash
pnpm create vite apps/web --template react-ts
cd apps/web && pnpm add -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
```

`apps/web/src/styles/theme.css` — tokens transcritos do `design.md`:
```css
@import "tailwindcss";

@theme {
  --color-gold: #faae33;
  --color-rust: #823513;
  --color-saffron: #9f531b;
  --color-spice: #402011;
  --color-clove: #281006;
  --color-cardamom: #6b2e12;
  --color-chili: #d1255c;
  --font-display: "Antonio", ui-sans-serif, system-ui, sans-serif;
  --font-ui: "Inter", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 6px;
}
```

Regra de aceite: nenhum arquivo `.tsx` contém valor de cor literal (hex, `rgb`, `hsl`). Verificação por busca:
```bash
grep -rnE "#[0-9a-fA-F]{3,8}|rgb\(" apps/web/src --include=*.tsx
# esperado: nenhum resultado
```

Tela provisória: uma página com o nome do projeto e um botão que usa `bg-gold text-clove rounded-full`, provando que o token funciona.

**Verificação:**
```bash
pnpm --filter web dev     # abre em 5173 com o tema aplicado
pnpm --filter web build   # sem erro
```

> A identidade de marca (logo, fotos, textos) segue pendente em Q-17. O tema aqui é só a camada de tokens: trocar a paleta depois é editar este único arquivo.

---

## 7. Passo 5 — Banco local nativo (sem Docker)

**Objetivo:** PostgreSQL 16 rodando na máquina, com o papel e o banco que o `.env` espera. Redis fica de fora até a fase 5.

```powershell
winget install PostgreSQL.PostgreSQL.16
```

Depois, uma única vez:

```bash
psql -U postgres -h localhost -c "CREATE ROLE destak LOGIN PASSWORD 'destak' CREATEDB;"
psql -U postgres -h localhost -c "CREATE DATABASE destak OWNER destak;"
```

O `CREATEDB` não é enfeite: o Prisma cria um banco temporário (*shadow database*) nas migrations de desenvolvimento. Sem essa permissão, `prisma migrate dev` falha.

`.env.example` já aponta para `postgresql://destak:destak@localhost:5432/destak`. O Redis aparece comentado, com a nota de que volta na fase 5. Nenhuma variável de Docker é necessária.

**Verificação:**
```bash
psql "postgresql://destak:destak@localhost:5432/destak" -c "select version();"
# esperado: PostgreSQL 16.x
```

O `docker-compose.yml` fica apenas como comentário explicando a decisão; nenhum serviço sobe.

---

## 8. Passo 6 — Prisma (só conexão)

**Objetivo:** provar que a API alcança o banco, sem criar modelo de negócio ainda.

```bash
pnpm --filter api add prisma @prisma/client
pnpm --filter api exec prisma init --datasource-provider postgresql
```

- `schema.prisma` com `url = env("DATABASE_URL")` e `directUrl = env("DIRECT_URL")`.
- Sem `model` de negócio na fase 0. Os modelos da §12 entram na fase 2, em migrations separadas.

**Verificação:**
```bash
pnpm --filter api exec prisma db pull        # conecta e não reclama (schema vazio)
```

---

## 9. Passo 7 — CI

`.github/workflows/ci.yml`:
```yaml
name: ci
on:
  push: { branches: [main, develop] }
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

**Verificação:** abrir um PR de teste; os cinco passos ficam verdes. Merge só com CI verde.

---

## 10. Passo 8 — Railway (API)

Comandos (precisam do CLI e da conta):

```bash
npm i -g @railway/cli
railway login
railway init --name destak
railway add --service api --json
```

Configuração do serviço:

| Item | Valor |
|---|---|
| Root directory | repositório inteiro (o build precisa de `packages/shared`) |
| Builder | Dockerfile em `apps/api/Dockerfile` |
| Start command | `node dist/main.js` |
| Healthcheck | `/health`, timeout 60 s |
| Restart | `ON_FAILURE`, 5 tentativas |
| Variáveis | as do `.env.example`, com valores por ambiente |

`apps/api/Dockerfile` segue o modelo do runbook (`docs/ops/railway-setup.md`), com `prisma` em `dependencies` — obrigatório para a fase 2, quando entrar o `preDeployCommand`.

**Verificação:**
```bash
railway status --json
railway deployment list --json     # status SUCCESS
curl -i https://<dominio-do-servico>/health   # 200
```

Critério: `SUCCESS` observado no deployment, não apenas exit 0 do comando.

---

## 11. Passo 9 — Cloudflare Pages (web)

| Item | Valor |
|---|---|
| Build command | `pnpm --filter web build` |
| Output | `apps/web/dist` |
| Variável | `VITE_API_URL` |
| Branch de produção | `main` |

**Verificação:** URL do Pages abre a tela provisória com o tema; abrir uma rota inexistente não dá 404 do Pages (fallback de SPA configurado — exigência da §16.4).

> O fallback de SPA é obrigatório e será testado de verdade na fase 1, quando existirem rotas.

---

## 12. Passo 10 — Documentação mínima

- `README.md`: o que é, como instalar, como rodar, como testar, como fazer deploy, variáveis necessárias.
- `decisions.md`: registrar nesta etapa qualquer desvio que aparecer, e marcar D-04, D-11 e D-13 como aprovadas quando você aprovar.
- `docs/ops/railway-setup.md`: já existe; atualizar o que divergir na prática.

**Verificação:** alguém que nunca viu o projeto consegue rodar `pnpm install && pnpm dev` seguindo só o README.

---

## 13. Definição de pronto da fase 0

- [ ] `pnpm install` sem erro a partir de clone limpo.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` verdes localmente.
- [ ] CI verde no PR.
- [ ] PostgreSQL 16 local responde em `localhost:5432` e `prisma db pull` conecta.
- [ ] API responde `/health` em 200 local e na Railway.
- [ ] `/api/v1/health` responde 404 (prefixo funcionando).
- [ ] Web builda e abre com os tokens aplicados.
- [ ] Nenhum hex literal no JSX.
- [ ] `.env.example` completo e nenhum `.env` versionado.
- [ ] Deployment da Railway com status `SUCCESS` observado.
- [ ] README permite subir o projeto do zero.

---

## 14. Riscos desta fase

| Risco | Mitigação |
|---|---|
| `pnpm deploy`/Docker falhar no monorepo | construir a imagem localmente uma vez (`docker build -f apps/api/Dockerfile .`) antes de subir para a Railway |
| Tailwind 4 + shadcn/ui com configuração divergente | fixar as versões e não misturar com `tailwind.config.js` legado |
| Railway sem região no Brasil | aceito; latência entra no orçamento de desempenho da fase 1 |
| `design.md` sem aprovação de marca (Q-17) | o tema é só tokens; troca em um arquivo, sem tocar em componente |
| Sem shell nesta sessão | todo o plano é executável por você; eu reviso saída e corrijo |

---

## 15. O que a fase 1 vai precisar de você

| Item | Usado em |
|---|---|
| Logo em SVG/PNG | cabeçalho e rodapé |
| Fotos reais (escola, frota, alunos com autorização) | topo e carrosséis |
| Textos da landing (ou aprovação dos textos que eu propuser, marcados como proposta) | todas as seções |
| Planos, valores e o que cada um inclui | cards de plano |
| Telefone, WhatsApp, endereço, horário, CNPJ, razão social | contato, rodapé, dados estruturados |
| Número exclusivo para notificações (diferente do principal) | fase 5 |
