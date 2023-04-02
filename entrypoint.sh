#!/bin/sh

while :
do
  yarn build || true

  echo "Waiting 1 hour before restarting..."
  sleep 3600
done