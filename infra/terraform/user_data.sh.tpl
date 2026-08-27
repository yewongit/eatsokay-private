#!/bin/bash
set -euxo pipefail

dnf update -y

# Docker + Compose 플러그인 + 코드 배포용 git
dnf install -y docker nginx git
systemctl enable --now docker
usermod -aG docker ec2-user

DOCKER_CONFIG=/usr/local/lib/docker/cli-plugins
mkdir -p "$DOCKER_CONFIG"
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o "$DOCKER_CONFIG/docker-compose"
chmod +x "$DOCKER_CONFIG/docker-compose"

# Nginx: 80번 포트 요청을 백엔드 컨테이너(3000)로 리버스 프록시
cat > /etc/nginx/conf.d/kfood-lens.conf <<'NGINX'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

systemctl enable --now nginx

mkdir -p /opt/kfood-lens
chown ec2-user:ec2-user /opt/kfood-lens

# 실제 앱 배포(git clone, .env 작성, docker compose up)는 이 스크립트에서 하지 않는다.
# 코드/시크릿을 Terraform user_data(평문, 인스턴스 메타데이터로 조회 가능)에 두지 않기 위한 의도적인 분리.
echo "bootstrap done" > /opt/kfood-lens/BOOTSTRAPPED
