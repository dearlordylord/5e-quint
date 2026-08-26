FROM node:22-bookworm-slim AS builder

RUN corepack enable
WORKDIR /srv/dnd

COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @dnd/mcp deploy --prod --legacy /srv/deploy

FROM node:22-bookworm-slim

ARG DND_MCP_RELEASE
RUN test -n "$DND_MCP_RELEASE"
LABEL org.opencontainers.image.revision=$DND_MCP_RELEASE
ENV DND_MCP_RELEASE=$DND_MCP_RELEASE
WORKDIR /srv/dnd

COPY --from=builder --chown=node:node /srv/deploy/ ./

USER node
ENV NODE_ENV=production
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "--import", "tsx", "src/public-index.ts"]
