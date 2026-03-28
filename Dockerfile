FROM node:22-alpine AS build

WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/ ./
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=build /app ./

EXPOSE 5000

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5000"]
