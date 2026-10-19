FROM node:24-slim AS build

RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY scripts scripts
COPY src src
COPY components-jsx components-jsx

RUN apt-get update && apt-get install -y jq && rm -rf /var/lib/apt/lists/*

RUN jq "del(.scripts.postinstall)" package.json > package.tmp.json && mv package.tmp.json package.json
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:24-slim

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY assets ./assets

CMD ["node", "--enable-source-maps", "."]
