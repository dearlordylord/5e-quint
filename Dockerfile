FROM node:22.19.0-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate
WORKDIR /workspace

COPY . .
RUN pnpm install --frozen-lockfile --strict-peer-dependencies
RUN pnpm --filter @dnd/app run build

FROM node:22.19.0-alpine

WORKDIR /srv/app
COPY --from=build --chown=node:node /workspace/packages/app/dist /srv/app/public
COPY --from=build --chown=node:node /workspace/packages/app/static-server.mjs /srv/app/static-server.mjs

USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "static-server.mjs", "/srv/app/public", "5000"]
