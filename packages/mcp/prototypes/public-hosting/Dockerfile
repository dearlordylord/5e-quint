FROM node:22-slim

WORKDIR /app
COPY public-hosting-prototype.mjs /app/server.mjs
USER node
EXPOSE 8787
CMD ["node", "/app/server.mjs"]
