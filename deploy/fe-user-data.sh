#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

REGION="ap-northeast-2"
ACCOUNT_ID="417780655988"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FE_IMAGE_TAG="__FE_IMAGE_TAG__"

if ! command -v aws &> /dev/null; then
  apt-get update -y
  apt-get install -y unzip curl
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
  unzip -q /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install
  rm -rf /tmp/awscliv2.zip /tmp/aws
fi

COMPOSE_DIR="/opt/app/compose"
mkdir -p "${COMPOSE_DIR}"

aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

cat > "${COMPOSE_DIR}/.env" <<EOF
ECR_REGISTRY=${ECR_REGISTRY}
FE_IMAGE_TAG=${FE_IMAGE_TAG}
API_BASE_URL=https://reeve.o-r.kr/api
EOF
chmod 600 "${COMPOSE_DIR}/.env"

cat > "${COMPOSE_DIR}/docker-compose.yml" <<'COMPOSE_EOF'
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  nodejs:
    image: ${ECR_REGISTRY}/reeve-fe:${FE_IMAGE_TAG}
    restart: unless-stopped
    environment:
      API_BASE_URL: ${API_BASE_URL}
    ports:
      - "3000:3000"
    networks:
      - reeve-fe-net
    logging: *default-logging

networks:
  reeve-fe-net:
    driver: bridge
COMPOSE_EOF

cd "${COMPOSE_DIR}"
docker compose pull
docker compose up -d