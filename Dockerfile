# node:22-alpine から Node.js 22 のバイナリを取得するためのステージ
# zenika/alpine-chrome のベース (Alpine 3.19) には Node.js 20 しか含まれないため、
# pnpm v11 が必要とする node:sqlite (Node.js 22.5+) に対応するために Node.js 22 を使用する
FROM node:22-alpine AS node22

FROM zenika/alpine-chrome:with-puppeteer-xvfb AS runner

# node:22-alpine から Node.js 22 のバイナリ・ライブラリ一式をコピーして上書きする
COPY --from=node22 /usr/local/bin/node /usr/local/bin/node
COPY --from=node22 /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node22 /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node22 /usr/local/bin/corepack /usr/local/bin/corepack
COPY --from=node22 /usr/local/lib/node_modules /usr/local/lib/node_modules

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"

# hadolint ignore=DL3002
USER root

# hadolint ignore=DL3018,DL3016
RUN apk upgrade --no-cache --available && \
  apk update && \
  apk add --update --no-cache tzdata x11vnc && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apk del tzdata && \
  corepack enable

WORKDIR /app

COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

COPY tsconfig.json ./
COPY src src

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline

COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

ENV TZ=Asia/Tokyo
ENV NODE_ENV=production
ENV CONFIG_PATH=/data/config.json
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
ENV LOG_DIR=/data/logs/
ENV USER_DATA_BASE=/data/userdata

ENTRYPOINT ["tini", "--"]
CMD ["/app/entrypoint.sh"]
