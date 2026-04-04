FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json app/
RUN pnpm install --frozen-lockfile

COPY app/ app/
RUN pnpm --filter app run build

FROM node:22-alpine

RUN npm install -g serve

COPY --from=build /workspace/app/dist /app

EXPOSE 5000

CMD ["serve", "-s", "/app", "-l", "5000"]
