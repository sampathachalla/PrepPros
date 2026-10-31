FROM postgres:16-alpine AS database
COPY db/init.sql /docker-entrypoint-initdb.d/01-init.sql

FROM node:22-alpine AS api
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY api/src ./src
EXPOSE 8000
CMD ["node", "src/index.js"]

FROM node:22-alpine AS hermes-agent
WORKDIR /app
COPY api/agent/package*.json ./
RUN npm ci --omit=dev
COPY api/agent/src ./src
EXPOSE 8001
CMD ["node", "src/index.js"]
