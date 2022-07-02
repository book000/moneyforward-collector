#!/bin/bash

cd "$(dirname "$0")" || exit 1

git pull
docker compose down || true
docker-compose up -d
