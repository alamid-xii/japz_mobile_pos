# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app

# Install bcrypt's Linux binary inside Linux; never copy Windows node_modules.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && node --input-type=module -e "import bcrypt from 'bcrypt'; const hash = await bcrypt.hash('docker-build-check', 4); if (!await bcrypt.compare('docker-build-check', hash)) process.exit(1);" \
    && npm cache clean --force

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
EXPOSE 5000
CMD ["node", "index.js"]
