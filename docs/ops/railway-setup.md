# Runbook — Backend na Railway (dev e produção)

Complementa a §13 da [spec](../superpowers/specs/2026-11-10-autoescola-destak-design.md).
Status: **documento de operação** — os arquivos citados (Dockerfile, `railway.json`)
são criados na implementação, depois do plano aprovado.

> **Aviso de ambiente:** a sessão que escreveu este runbook não tem terminal
> (`pwsh` ausente, sem backend de sandbox). Nenhum comando abaixo foi executado
> aqui. Rode-os na sua máquina ou numa sessão com shell.

---

## 0. Modelo mental da Railway

```
Workspace  (billing)
└─ Project "destak"
   ├─ Environment "production"   ← variáveis, deploy e histórico próprios
   │  └─ Service "api"           ← o container
   └─ Environment "development"  ← mesmas configs, outros valores
      └─ Service "api"
```

O **mesmo serviço** existe nos dois ambientes, mas variáveis, deploy e domínio
são por ambiente. Variável em `production` não existe em `development`.

---

## 1. Pré-requisitos

| Item | Observação |
|---|---|
| Conta Railway | plano Hobby já basta |
| CLI | `npm i -g @railway/cli` (ou `curl -fsSL agents.railway.com \| sh`) |
| Repositório GitHub | a Railway faz deploy por branch (`develop`, `main`) |
| Supabase | **dois** projetos: `destak-dev` e `destak-prod` |
| Cloudflare | DNS de `destak.com.br` |
| Asaas | conta sandbox (dev) e conta produção |
| Domínio | `www.destak.com.br` (front) e `api.destak.com.br` (API) |

```bash
railway --version
railway whoami
```

---

## 2. Criar projeto e serviço

```bash
railway init --name destak
railway add --service api --json
railway status --json          # confirme project/environment/service
```

Se preferir o caminho de deploy direto do diretório atual:

```bash
railway up --detach -m "primeiro deploy"
railway deployment list --json   # acompanhe até SUCCESS
```

> Deploy só é considerado bem-sucedido quando o `railway deployment list`
> mostra `SUCCESS` para aquele deployment. `up --detach` retorna em `QUEUED`.

---

## 3. Ambientes

Crie o ambiente de desenvolvimento pelo dashboard (**Environments → New
Environment → `development`**) ou pela CLI, conferindo a sintaxe da sua versão:

```bash
railway environment --help
```

Resultado esperado: `production` e `development`, cada um com seu próprio
serviço `api`, suas variáveis e seu histórico de deploy.

Ligue o auto-deploy por branch, no serviço → **Settings → Source**:

| Ambiente | Branch |
|---|---|
| `production` | `main` |
| `development` | `develop` |

---

## 4. Arquivos de deploy (a criar na implementação)

### 4.1 `apps/api/Dockerfile`

```dockerfile
# ---------- build ----------
FROM node:22-alpine AS build
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @destak/api exec prisma generate
RUN pnpm --filter @destak/api build
RUN pnpm --filter @destak/api deploy --prod /out

# ---------- runtime ----------
FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl dumb-init
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./
USER node
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

Duas armadilhas que esse Dockerfile resolve:

1. **`prisma` precisa estar em `dependencies`**, não em `devDependencies` — o
   `preDeployCommand` roda dentro da imagem e o `pnpm deploy --prod` remove devDeps.
2. Se o `pnpm deploy` reclamar de `inject-workspace-packages`, use
   `pnpm --filter @destak/api deploy --prod --legacy /out`.

### 4.2 `railway.json` (na raiz do repositório)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/main.js",
    "preDeployCommand": "npx prisma migrate deploy",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5,
    "numReplicas": 1
  }
}
```

`/health` fica **fora** do prefixo `/api` — a Railway aponta o healthcheck para
a raiz do serviço.

### 4.3 `.dockerignore` (raiz)

```
**/node_modules
**/dist
**/.env*
**/coverage
**/.git
**/docs
**/*.md
```

### 4.4 `.env.example` (raiz, sem valores)

```dotenv
NODE_ENV=development
PORT=3000
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_ACCESS_TTL=15m
REFRESH_TTL=30d
APP_PUBLIC_URL=http://localhost:5173
API_PUBLIC_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173
ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
STORAGE_DRIVER=local
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=media-dev
WHATSAPP_DRIVER=outbox
EVOLUTION_BASE_URL=
EVOLUTION_API_KEY=
SCHOOL_WHATSAPP=
LOG_LEVEL=info
```

---

## 5. Variáveis por ambiente

```bash
# produção
railway variable set NODE_ENV=production --service api --environment production
railway variable set DATABASE_URL="postgresql://...destak-prod...:6543/postgres?pgbouncer=true" --service api --environment production
railway variable set DIRECT_URL="postgresql://...destak-prod...:5432/postgres" --service api --environment production
railway variable set JWT_SECRET="$(openssl rand -hex 32)" --service api --environment production
railway variable set APP_PUBLIC_URL=https://www.destak.com.br --service api --environment production
railway variable set API_PUBLIC_URL=https://api.destak.com.br --service api --environment production
railway variable set CORS_ORIGINS=https://www.destak.com.br,https://destak.com.br --service api --environment production
railway variable set ASAAS_BASE_URL=https://api.asaas.com/v3 --service api --environment production
railway variable set ASAAS_API_KEY="<chave de produção>" --service api --environment production
railway variable set ASAAS_WEBHOOK_TOKEN="<token do webhook>" --service api --environment production
railway variable set STORAGE_DRIVER=supabase --service api --environment production
railway variable set SUPABASE_BUCKET=media --service api --environment production

# desenvolvimento
railway variable set NODE_ENV=development --service api --environment development
railway variable set DATABASE_URL="postgresql://...destak-dev...:6543/postgres?pgbouncer=true" --service api --environment development
railway variable set DIRECT_URL="postgresql://...destak-dev...:5432/postgres" --service api --environment development
railway variable set APP_PUBLIC_URL=https://dev.destak.com.br --service api --environment development
railway variable set CORS_ORIGINS=https://dev.destak.com.br --service api --environment development
railway variable set ASAAS_BASE_URL=https://sandbox.asaas.com/api/v3 --service api --environment development
railway variable set SUPABASE_BUCKET=media-dev --service api --environment development
railway variable set WHATSAPP_DRIVER=outbox --service api --environment development
```

Se a sua versão do CLI reclamar de `--environment`, confira
`railway variable set --help` (o atalho costuma ser `-e`).

**Nunca** replique `ASAAS_API_KEY` de produção em `development`, nem
`SUPABASE_SERVICE_ROLE_KEY` do projeto `destak-prod`.

Conferência:

```bash
railway variable list --service api --environment development --json
railway variable list --service api --environment production --json
```

---

## 6. Domínios

1. Serviço `api` → **Settings → Networking → Custom Domain**.
2. Adicione `api.destak.com.br` (ambiente `production`) e `api-dev.destak.com.br` (`development`).
3. A Railway mostra o alvo (CNAME). No Cloudflare:

| Tipo | Nome | Conteúdo | Proxy |
|---|---|---|---|
| CNAME | `api` | alvo informado pela Railway | **DNS only** (nuvem cinza) |
| CNAME | `api-dev` | alvo do ambiente de dev | DNS only |

Proxy laranja no mesmo hostname da API pode quebrar o TLS da Railway e o IP
real usada no rate limit. Deixe cinza; se quiser Cloudflare na frente, valide
`trust proxy` e `X-Forwarded-For` antes.

4. TLS é emitido automaticamente após o DNS propagar.
5. **Front** (Cloudflare Pages): domínio próprio `www.destak.com.br` é
   obrigatório (D-022). Sem ele, o cookie de refresh vira `SameSite=None`.

---

## 7. Ordem do primeiro deploy

1. Variáveis do ambiente `development` cadastradas.
2. `railway up --detach -m "bootstrap"` ou push em `develop`.
3. Acompanhar:

```bash
railway deployment list --json
railway logs --service api --environment development --lines 200
```

4. Esperado no log: `Prisma migrations applied`, `Nest application successfully started`, `Listening on 0.0.0.0:3000`.
5. Healthcheck:

```bash
curl -i https://api-dev.destak.com.br/health
# 200 {"status":"ok","db":"ok"}
```

Se o container subir mas o healthcheck falhar com 502, a causa mais comum é
`app.listen(PORT)` sem host — precisa ser `app.listen(port, '0.0.0.0')`.

---

## 8. Banco: migrations e primeiro admin

Migrations rodam sozinhas no deploy (`preDeployCommand`). Para o seed inicial
(planos de rascunho + admin):

```bash
railway run --service api --environment development -- pnpm --filter @destak/api seed
```

`railway run` executa com as variáveis daquele ambiente. Alternativa pontual,
a partir da sua máquina:

```bash
railway variables --service api --environment development --json > /tmp/dev.json
# use DIRECT_URL (porta 5432), não a URL do pooler
pnpm --filter @destak/api prisma migrate deploy
pnpm --filter @destak/api prisma db seed
```

Regras: **nunca** `prisma migrate dev` contra banco remoto; seed nunca cria
admin com senha fixa conhecida — gera senha aleatória e imprime uma vez.

---

## 9. Webhook do Asaas

| Ambiente | URL |
|---|---|
| produção | `https://api.destak.com.br/api/webhooks/asaas` |
| desenvolvimento | `https://api-dev.destak.com.br/api/webhooks/asaas` |

No painel do Asaas, cadastre o webhook com o mesmo valor de
`ASAAS_WEBHOOK_TOKEN` do ambiente correspondente. Teste:

```bash
curl -i -X POST https://api-dev.destak.com.br/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -d '{"id":"evt_teste_1","event":"PAYMENT_RECEIVED","payment":{"id":"pay_inexistente"}}'
```

Esperado: `200`. Repita a mesma chamada: `200` também, mas **sem** novo efeito
(idempotência por `eventId`). Sem o header: `401`.

---

## 10. Front no Cloudflare Pages

| Configuração | Valor |
|---|---|
| Build command | `pnpm --filter @destak/web build` |
| Output directory | `apps/web/dist` |
| Variável | `VITE_API_URL=https://api.destak.com.br` |
| Branch produção | `main` |
| Branch preview | `develop` → `dev.destak.com.br` |

CORS da API só aceita as origens listadas em `CORS_ORIGINS`. Preview de PR não
está na lista — use `development` para testar com cookie.

---

## 11. Verificação de isolamento dev × prod

Guarda na subida da API (falha o boot, não só loga):

```
se NODE_ENV !== 'production' e DATABASE_URL contém o ref do projeto destak-prod → aborta
se NODE_ENV === 'production' e DATABASE_URL contém o ref do projeto destak-dev → aborta
```

Teste manual depois do deploy de dev:

```bash
curl -s https://api-dev.destak.com.br/health | jq
curl -s https://api.destak.com.br/health | jq
```

Os dois respondem 200, mas com bancos diferentes. Confirme pela contagem de
planos ou por um endpoint `/health` que devolve `db: "destak-dev"` no ambiente
de desenvolvimento.

---

## 12. Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Build falha em `pnpm --filter @destak/api` | filtro errado no nome do pacote | nome do pacote no `package.json` deve ser `@destak/api` |
| `Prisma Client not generated` | `prisma generate` não rodou no build | chamada explícita no Dockerfile antes do `build` |
| Container sobe e o healthcheck dá 502 | escutando em `localhost` | `app.listen(port, '0.0.0.0')` |
| `preDeployCommand` falha com `prisma: not found` | `prisma` em devDependencies | mover para `dependencies` |
| Login funciona mas o refresh falha (401) | cookie cross-site | front precisa de domínio próprio; conferir `Domain`, `SameSite`, `Secure` |
| `P1001` / conexão recusada | usando `DIRECT_URL` na app | app usa pooler `:6543`, migrations usam `:5432` |
| `too many connections` | sem pooler | `?pgbouncer=true` na `DATABASE_URL` |
| Upload some após deploy | disco efêmero | `STORAGE_DRIVER=supabase` |
| 429 em produção sem tráfego | `trust proxy` desligado | `app.set('trust proxy', 1)` |

---

## 13. Migração para VPS (Hostinger) — sem reescrever código

Pré-requisito: a imagem já é o artefato. Nada na aplicação conhece a Railway.

### 13.1 Antes do corte

- [ ] Baixar o TTL do DNS de `api.destak.com.br` para 300 s (24 h antes).
- [ ] Publicar a imagem num registry (`ghcr.io` ou Docker Hub) no CI.
- [ ] Criar `/opt/destak/.env` na VPS com as mesmas chaves de `production`.
- [ ] Testar a imagem localmente com `docker run --env-file .env -p 3000:3000 <imagem>`.
- [ ] Conferir que a VPS tem saída para o Supabase e para o Asaas.

### 13.2 `docker-compose.yml` na VPS

```yaml
services:
  api:
    image: ghcr.io/<org>/destak-api:latest
    restart: unless-stopped
    env_file: .env
    expose: ["3000"]
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 5
    logging:
      driver: json-file
      options: { max-size: "10m", max-file: "3" }

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on: [api]

volumes:
  caddy_data:
```

### 13.3 `Caddyfile`

```
api.destak.com.br {
  encode gzip
  reverse_proxy api:3000
}
```

Caddy emite e renova o TLS sozinho. Se preferir Nginx, o equivalente com
`certbot` funciona igual — o contrato é só "proxy reverso → 3000".

### 13.4 Corte

1. `docker compose up -d` na VPS; validar `curl -i https://<IP>/health` com
   `Host: api.destak.com.br` ou via `/etc/hosts` local.
2. Rodar `prisma migrate deploy` uma vez na VPS (a imagem já tem o cliente).
3. Trocar o DNS de `api` para o IP da VPS.
4. Atualizar a URL do webhook no Asaas (se a URL mudar — normalmente não muda,
   porque o domínio é o mesmo).
5. Manter a Railway ligada 48 h como standby.
6. Desligar o serviço na Railway e remover o projeto depois da janela.

### 13.5 Rollback do corte

DNS volta para o alvo da Railway; TTL de 300 s faz o retorno em ~5 min.

---

## 14. Checklist final

**Development**
- [ ] `/health` 200 em `api-dev.destak.com.br`
- [ ] `DATABASE_URL` aponta para `destak-dev`
- [ ] `ASAAS_BASE_URL` = sandbox
- [ ] bucket `media-dev`
- [ ] webhook de homologação cadastrado
- [ ] login + refresh funcionando com cookie

**Production**
- [ ] `/health` 200 em `api.destak.com.br`
- [ ] `DATABASE_URL` aponta para `destak-prod`, com `pgbouncer=true`
- [ ] `JWT_SECRET` diferente do de dev
- [ ] bucket `media`
- [ ] webhook de produção cadastrado e testado
- [ ] `CORS_ORIGINS` só com domínios reais
- [ ] rollback testado uma vez
- [ ] backup do Supabase habilitado
