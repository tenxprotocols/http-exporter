FROM node:25.2.1-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.25.0

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm prune --prod

FROM node:25.2.1-slim
ENV NODE_ENV=production
WORKDIR /usr/src/app

LABEL org.opencontainers.image.source="https://github.com/tenx-ts/tenx-http-exporter"
LABEL org.opencontainers.image.description="A flexible OpenMetrics exporter for HTTP (RPC and REST) endpoints"
LABEL org.opencontainers.image.licenses="BUSL"

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./package.json

RUN npm link

EXPOSE 3000
CMD [ "tenx-http-exporter" ]
