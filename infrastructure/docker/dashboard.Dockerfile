FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.19.0
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/dashboard ./apps/dashboard
COPY packages ./packages
COPY scripts/prepare-editor.mjs ./scripts/prepare-editor.mjs
RUN pnpm install --frozen-lockfile && node scripts/prepare-editor.mjs && pnpm build
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3100 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/dashboard/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build --chown=node:node /app/apps/dashboard/public ./apps/dashboard/public
USER node
CMD ["node", "apps/dashboard/server.js"]
