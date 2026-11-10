# Fase 0: imagem funcional, sem otimizacao de tamanho.
# Copia o monorepo inteiro porque o pnpm usa links do workspace.
# A reducao de imagem (pnpm deploy) entra na fase 2, junto com o preDeployCommand.

FROM node:22-alpine AS build
RUN corepack enable && apk add --no-cache libc6-compat openssl
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @destak/shared build
RUN pnpm --filter @destak/api exec prisma generate
RUN pnpm --filter @destak/api build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl dumb-init
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo ./

USER node
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/api/dist/main.js"]
