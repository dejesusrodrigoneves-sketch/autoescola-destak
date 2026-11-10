# Autoescola Destak

Monorepo do site e do painel da Autoescola Destak.
A fonte da verdade é a [`spec.md`](spec.md) (versão 0.3.1); decisões e premissas ficam em
[`decisions.md`](decisions.md); o visual segue o [`design.md`](DESIGN.md).

> **Estado atual:** fase 0 (fundação). Existe apenas uma tela provisória e um endpoint `/health`.
> Nenhuma funcionalidade de negócio foi implementada.

## Estrutura

```
apps/
  api/      NestJS (Node 22 + TypeScript + Prisma)
  web/      Vite + React + Tailwind 4 + shadcn/ui
packages/
  shared/   tipos e schemas Zod usados pelos dois lados
```

## Requisitos

- Node.js 22
- pnpm 9 (via `corepack enable`)
- PostgreSQL 16 instalado na máquina (sem Docker)

## Instalação

```bash
corepack enable
pnpm install
cp .env.example .env      # preencha os valores necessários
```

O banco local precisa existir antes de rodar migrations. Veja a seção
[Banco local](#banco-local).

## Banco local (sem Docker)

Instale o PostgreSQL 16 de uma das duas formas:

```powershell
winget install PostgreSQL.PostgreSQL.16
```

ou pelo instalador oficial em <https://www.postgresql.org/download/windows/>. O instalador já traz
o pgAdmin e registra o serviço do Windows.

Depois, crie o papel e o banco uma única vez (o `CREATEDB` é necessário porque o Prisma usa um
banco temporário nas migrations de desenvolvimento):

```bash
psql -U postgres -h localhost -c "CREATE ROLE destak LOGIN PASSWORD 'destak' CREATEDB;"
psql -U postgres -h localhost -c "CREATE DATABASE destak OWNER destak;"
```

`psql` fica em `C:\Program Files\PostgreSQL\16\bin` — adicione ao PATH ou chame pelo caminho
completo. As credenciais resultantes batem com o `.env.example`:

```
DATABASE_URL=postgresql://destak:destak@localhost:5432/destak
DIRECT_URL=postgresql://destak:destak@localhost:5432/destak
```

Conferindo:

```bash
psql "postgresql://destak:destak@localhost:5432/destak" -c "select version();"
```

Redis fica de fora até a fase 5, quando entram as filas de notificação.

## Desenvolvimento

```bash
pnpm dev          # API em :3000 e web em :5173
```

Verificações:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## API

| Rota | Descrição |
|---|---|
| `GET /health` | healthcheck da hospedagem (fora do prefixo) |
| `/api/v1/*` | rotas de negócio, a partir da fase 2 |

O prefixo `api/v1` é global: `GET /api/v1/health` responde **404** de propósito, e existe um teste
e2e que garante isso.

## Banco

Prisma, PostgreSQL no Supabase. Duas conexões:

- `DATABASE_URL`: pooler, usada pela aplicação;
- `DIRECT_URL`: conexão direta, usada apenas por migrations.

Migrations são aditivas e rodam no deploy, nunca à mão em banco remoto (ver `spec.md`, I-15).

Em desenvolvimento o banco é o PostgreSQL 16 local descrito acima — o mesmo engine do Supabase, para
que migration escrita aqui se comporte igual em produção.

## Deploy

- **Web:** Cloudflare Pages. Build `pnpm --filter web build`, saída `apps/web/dist`. O fallback da SPA
  está em `apps/web/public/_redirects` e os cabeçalhos de segurança em `apps/web/public/_headers`.
- **API:** Railway, via `apps/api/Dockerfile` e [`railway.json`](railway.json).

O passo a passo está em [`docs/ops/railway-setup.md`](docs/ops/railway-setup.md).

## Documentos

| Arquivo | Conteúdo |
|---|---|
| [`spec.md`](spec.md) | requisitos, regras, modelo de dados, API, NFRs |
| [`decisions.md`](decisions.md) | respostas do dono, decisões técnicas, premissas, histórico |
| [`DESIGN.md`](DESIGN.md) | referência visual e tokens |
| [`docs/superpowers/plans/`](docs/superpowers/plans) | planos por fase |
| [`docs/ops/`](docs/ops) | runbooks de operação |
