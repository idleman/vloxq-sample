FROM node:bookworm-slim

WORKDIR /app

COPY . .

ENV NODE_ENV=production
RUN npm ci --omit=dev --workspaces

ENV PORT=8080

USER node

EXPOSE 8080

ENTRYPOINT ["node", "packages/service-sample/bin/sample.mjs"]
