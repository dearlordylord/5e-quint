FROM node:22.19.0-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json app/
RUN pnpm install --frozen-lockfile --strict-peer-dependencies

COPY app/ app/
RUN pnpm --filter app run build

FROM node:22.19.0-alpine

RUN npm install -g serve

COPY --from=build /workspace/app/dist /app

EXPOSE 5000

CMD ["serve", "-s", "/app", "-l", "5000"]
