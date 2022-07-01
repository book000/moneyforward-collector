FROM alpine:edge

RUN apk update

# japanese font
RUN apk add --no-cache curl fontconfig font-noto-cjk \
  && fc-cache -fv

# Installs latest Chromium (76) package.
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  freetype-dev \
  harfbuzz \
  ca-certificates \
  ttf-freefont \
  nodejs \
  yarn

# timezone
RUN apk add --update --no-cache tzdata && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  apk del tzdata

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn
COPY . .


CMD ["yarn", "build"]