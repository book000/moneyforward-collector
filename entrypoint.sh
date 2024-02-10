#!/bin/sh

while :
do
  pnpm start || true

  echo "Waiting 1 hour before restarting..."
  sleep 3600
done