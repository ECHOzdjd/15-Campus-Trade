FROM node:18-alpine AS base

WORKDIR /app

COPY package*.json ./

FROM base AS deps
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS dev
ENV NODE_ENV=development
RUN npm ci
COPY --chown=node:node . .
RUN mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["npm", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && mkdir -p uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3001/health || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/app.js"]
