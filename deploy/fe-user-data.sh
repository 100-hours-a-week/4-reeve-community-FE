#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/user-data.log) 2>&1

REGION="ap-northeast-2"
ACCOUNT_ID="417780655988"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
FE_IMAGE_TAG="__FE_IMAGE_TAG__"

# AWS CLI, Docker 둘 다 이 AMI엔 안 깔려있는 게 확인됨 - 없으면 설치
if ! command -v aws &> /dev/null || ! command -v docker &> /dev/null; then
  apt-get update -y
  apt-get install -y ca-certificates curl unzip

  if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install
    rm -rf /tmp/awscliv2.zip /tmp/aws
  fi

  # [추가] Docker 설치 블록 - BE와 동일하게 빠져있던 부분
  if ! command -v docker &> /dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
  fi
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