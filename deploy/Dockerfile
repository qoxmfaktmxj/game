FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/game-server/package.json apps/game-server/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/game-core/package.json packages/game-core/package.json
RUN npm ci
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json ./
COPY scripts/stage-web-public.mjs ./scripts/stage-web-public.mjs
ARG PUBLIC_ORIGIN=https://game.minseok91.cloud
ENV NEXT_PUBLIC_GAME_SERVER_URL=$PUBLIC_ORIGIN NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @moyeotable/game-server && npm run build --workspace @moyeotable/web

FROM node:24-bookworm-slim AS web
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/.web-public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM build AS server-deps
RUN npm prune --omit=dev

FROM node:24-bookworm-slim AS game
ENV NODE_ENV=production GAME_HOST=0.0.0.0 GAME_PORT=2567
WORKDIR /app
COPY --from=server-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/game-server/dist ./dist
USER node
EXPOSE 2567
CMD ["node", "dist/index.mjs"]
