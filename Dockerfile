FROM postgres:16-alpine AS database
# pgvector is compiled into the same Alpine image; switching to a Debian-based image would change the
# C library under the existing data volume and can invalidate text indexes
ARG PGVECTOR_VERSION=v0.8.7
RUN apk add --no-cache --virtual .pgvector-build git build-base \
    && git clone --branch "$PGVECTOR_VERSION" --depth 1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && make -C /tmp/pgvector with_llvm=no OPTFLAGS="" \
    && make -C /tmp/pgvector with_llvm=no install \
    && rm -rf /tmp/pgvector \
    && apk del .pgvector-build
COPY db/init.sql /docker-entrypoint-initdb.d/01-init.sql

FROM node:22-alpine AS api-build
WORKDIR /app
COPY api/package*.json ./
RUN npm ci
COPY api/tsconfig.json api/prisma.config.ts ./
COPY api/prisma ./prisma
COPY api/supabase ./supabase
COPY api/src ./src
# prisma generate reads the config, which requires DATABASE_URL, but never connects
RUN DATABASE_URL=postgresql://build@localhost/build npm run build && npm prune --omit=dev

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-build /app/package*.json /app/prisma.config.ts ./
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/prisma ./prisma
COPY --from=api-build /app/supabase ./supabase
COPY --from=api-build /app/dist ./dist
EXPOSE 8000
# Apply pending database migrations, then start the API
CMD ["sh", "-c", "node prisma/deploy.mjs && node dist/server.js"]

# Nous Research's Hermes Agent, serving its OpenAI-compatible API on 8642. The PrepPros MCP server
# (api/agent) runs inside it as the agent's only toolset, with Needle 3 for local recipe search.
FROM nousresearch/hermes-agent:v0.22.5 AS hermes-agent
USER root
WORKDIR /opt/preppros
COPY api/agent/package*.json ./
RUN npm ci --omit=dev
COPY api/agent/agents ./agents
RUN node agents/hermes/downloadModel.ts
COPY api/agent/hermes ./hermes
COPY --chmod=755 api/agent/hermes/preppros-config.sh /etc/cont-init.d/03-preppros-config
WORKDIR /opt/hermes
ENV API_SERVER_ENABLED=true \
    API_SERVER_HOST=0.0.0.0 \
    API_SERVER_PORT=8642
EXPOSE 8642
CMD ["gateway", "run"]
