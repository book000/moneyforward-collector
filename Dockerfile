# node:24.15.0-alpine から Node.js 24 のバイナリを取得するためのステージ
# zenika/alpine-chrome のベース (Alpine 3.19) には Node.js 20 しか含まれないため、
# pnpm v11 が必要とする node:sqlite (Node.js 22.5+) に対応するために Node.js 24 を使用する
# プロジェクトの .node-version (24.15.0) に合わせてパッチバージョンまで固定する
FROM node:24.16.0-alpine AS node24

FROM zenika/alpine-chrome:with-puppeteer-xvfb AS runner

# node:24-alpine から Node.js 24 のバイナリとモジュールをコピーして上書きする
# 注意: COPY --from はシンボリックリンクを解決してコピーするため、
# npm/npx/corepack のシンボリックリンクは RUN ステップで再作成する必要がある
COPY --from=node24 /usr/local/bin/node /usr/local/bin/node
COPY --from=node24 /usr/local/lib/node_modules /usr/local/lib/node_modules

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
  ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm && \
  ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx && \
  ln -sf /usr/local/lib/node_modules/corepack/dist/corepack.js /usr/local/bin/corepack && \
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
