#!/bin/sh
# Pulls the newest images and restarts the stack. Run from the folder holding
# docker-compose.production.yml (the GitHub Action runs it there over SSH).
#   IMAGE_NAMESPACE  Docker Hub namespace the images were pushed to (required)
#   TAG              image tag to run (default: latest)
set -eu

: "${IMAGE_NAMESPACE:?IMAGE_NAMESPACE is not set}"
TAG="${TAG:-latest}"

if [ ! -f backend.env ]; then
  echo "backend.env is missing in $(pwd). Create it from backend/.env.example first." >&2
  exit 1
fi

# Remembered so plain `docker compose` commands work here later too.
printf 'IMAGE_NAMESPACE=%s\nTAG=%s\n' "$IMAGE_NAMESPACE" "$TAG" > .env

# Shared with Nginx Proxy Manager; created on the first deploy if missing.
docker network inspect proxy > /dev/null 2>&1 || docker network create proxy

COMPOSE="docker compose -f docker-compose.production.yml"
$COMPOSE pull backend frontend
$COMPOSE up -d --remove-orphans
docker image prune -f

$COMPOSE ps
