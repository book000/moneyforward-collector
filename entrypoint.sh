#!/bin/sh

while :
do
  node index.js || true

  echo "Waiting 1 hour before restarting..."
  sleep 3600
done