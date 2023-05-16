#!/bin/sh

while :
do
  yarn start || true

  echo "Waiting 1 hour before restarting..."
  sleep 3600
done