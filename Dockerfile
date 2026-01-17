FROM node:24.12.0-slim AS base

RUN corepack enable && corepack enable npm

FROM base as dev 

WORKDIR /app

CMD [ "sh", "-lc", "[ -f node_modules/.modules.yaml ] && [ -f node_modules/next/package.json ] || pnpm install; pnpm run dev" ]


FROM base AS dep 

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile 



FROM base AS builder

WORKDIR /app

COPY --from=dep /app/node_modules ./node_modules

COPY . .

RUN pnpm run build



FROM base AS runner

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --shell /bin/false nextjs

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./ 

COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD [ "node", "server.js" ]