FROM node:24-slim AS build

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY patches patches
COPY scripts scripts
COPY src src
COPY components-jsx components-jsx

RUN apt-get update \
    && apt-get install -y --no-install-recommends jq git \
    && rm -rf /var/lib/apt/lists/*

RUN jq "del(.scripts.postinstall)" package.json > package.tmp.json && mv package.tmp.json package.json
RUN pnpm install --frozen-lockfile

# Copied after installing dependencies so commits don't invalidate the dependency layer
COPY .git .git

RUN pnpm build
RUN pnpm prune --prod

FROM node:24-slim

# Fastify defaults to localhost, which would make the published port unreachable
ENV HTTP_HOST=0.0.0.0
ENV VENBOT_CONTAINER=1
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node assets ./assets

RUN mkdir -p data /var/www/badges.vencord.dev \
    && chown -R node:node data /var/www/badges.vencord.dev

USER node

EXPOSE 8152

CMD ["node", "--enable-source-maps", "."]
