# CI/CD 自动化部署指南

本文档介绍如何为 DeepMed Search 项目设置完整的 CI/CD 流程。

> **📌 当前项目配置**  
> 本项目当前使用**双分支部署架构**：
> - `main` 分支：日常开发，推送不触发部署
> - `demo-without-gpu` 分支：演示环境，推送时自动部署
> - 服务器使用 `docker-compose.demo.yml`（无需编译，拉取预构建镜像）
> - 镜像从腾讯云容器镜像服务拉取
> 
> 详细配置请查看：
> - [分支策略说明](../../BRANCHING_STRATEGY.md)
> - [部署快速开始](../../DEPLOYMENT_QUICKSTART.md)
> - [腾讯云配置](./TENCENT_CLOUD_REGISTRY.md)
> 
> 以下内容作为参考文档，介绍多种 CI/CD 方案。

## 🏗️ 架构概览

```
开发者推送代码
    ↓
GitHub Repository
    ↓
GitHub Actions (构建镜像)
    ↓
容器注册表 (GHCR/Docker Hub)
    ↓
[方案一] SSH 部署 ←→ [方案二] Webhook ←→ [方案三] Watchtower
    ↓
服务器拉取镜像 (无需编译)
    ↓
Docker Compose + Traefik
    ↓
运行中的服务
```

**核心优势**：
- ✅ 镜像在 GitHub Actions 中构建（使用 GitHub 的免费资源）
- ✅ 服务器端只需拉取镜像（节省内存和 CPU）
- ✅ 使用 Traefik 作为反向代理（支持自动 SSL、负载均衡）
- ✅ 支持多种部署策略（SSH、Webhook、Watchtower）

## 📋 目录

- [架构概览](#架构概览)
- [方案概述](#方案概述)
- [方案一：GitHub Actions + 镜像推送](#方案一github-actions--镜像推送)
- [方案二：Webhook 自动部署](#方案二webhook-自动部署)
- [方案三：Watchtower 自动更新](#方案三watchtower-自动更新)
- [Traefik 配置说明](#traefik-配置说明)
- [故障排查](#故障排查)

## 方案概述

我们提供三种 CI/CD 方案，**所有方案均使用预构建镜像**（服务器端不需要编译，节省内存）：

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| GitHub Actions + 镜像推送 | 灵活、功能强大、服务器端轻量 | 需要配置 SSH + 容器注册表 | 完全控制部署流程 |
| Webhook | 轻量、实时响应 | 需要开放端口 | 快速自动部署 |
| Watchtower | 零配置、全自动 | 依赖容器注册表 | 镜像自动更新 |

**部署架构说明**：
- ✅ 在 GitHub Actions 中构建镜像并推送到容器注册表（Docker Hub/GitHub Container Registry）
- ✅ 服务器端直接拉取预构建镜像（无需编译，节省内存和时间）
- ✅ 使用 Traefik 作为反向代理和负载均衡器

---

## 方案一：GitHub Actions + 镜像推送

此方案在 GitHub Actions 中构建镜像，推送到容器注册表，服务器端直接拉取镜像部署。

### 1. 选择容器注册表

你可以选择以下任一注册表：

**选项 A：GitHub Container Registry (推荐，免费)**
- 镜像地址：`ghcr.io/your-username/deepmed-search`
- 无需额外账号，使用 GitHub 账号
- 私有仓库免费

**选项 B：Docker Hub**
- 镜像地址：`your-username/deepmed-search`
- 需要 Docker Hub 账号
- 私有仓库需要付费（公开仓库免费）

### 2. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

需要添加的 Secrets：

```bash
# 服务器 SSH 连接配置
SERVER_HOST=your.server.ip.address
SERVER_USER=deploy
SERVER_PORT=22
SSH_PRIVATE_KEY=<your-ssh-private-key>

# 容器注册表凭证（根据你的选择配置）

# 选项 A：使用 GitHub Container Registry（推荐）
# 使用内置的 GITHUB_TOKEN，无需额外配置
# GITHUB_TOKEN 会自动注入，有 packages:write 权限

# 选项 B：使用 Docker Hub
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-token  # 使用 Access Token，不是密码
```

**获取 Docker Hub Access Token**（如果使用 Docker Hub）：
```
1. 登录 Docker Hub → Account Settings → Security → New Access Token
2. 权限选择：Read, Write, Delete
3. 复制生成的 Token 并添加到 GitHub Secrets
```

### 3. 生成 SSH 密钥

在本地或服务器上生成 SSH 密钥对：

```bash
# 生成密钥（不设置密码）
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions.pub deploy@your-server

# 将私钥内容复制到 GitHub Secrets
cat ~/.ssh/github_actions
```

### 4. 配置服务器

在服务器上准备项目目录和 Docker 登录：

```bash
# 切换到部署用户
sudo su - deploy

# 克隆项目（仅用于获取 docker-compose 配置文件）
cd /home/deploy
git clone https://github.com/your-org/deepmed-search.git
cd deepmed-search

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 重要：修改 docker-compose 文件，使用预构建镜像而不是本地构建
# 如果使用 GitHub Container Registry
nano docker-compose.yml  # 或 docker-compose.demo.yml
```

**修改 docker-compose.yml 使用预构建镜像**：

```yaml
# 将这部分：
app:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: deepmed-app
  # ...

# 改为：
app:
  image: ghcr.io/your-org/deepmed-search:latest  # 或 your-username/deepmed-search:latest
  container_name: deepmed-app
  # ...

# 同样修改 queue-worker 服务：
queue-worker:
  image: ghcr.io/your-org/deepmed-search-worker:latest
  container_name: deepmed-queue-worker
  # ...
```

**登录容器注册表**：

```bash
# 选项 A：登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin

# 选项 B：登录 Docker Hub
echo $DOCKER_TOKEN | docker login -u your-username --password-stdin

# 确保部署脚本可执行
chmod +x scripts/deploy.sh
```

**修改部署脚本（重要）**：

编辑 `scripts/deploy.sh`，将构建步骤改为拉取镜像：

```bash
# 找到这部分（大约在第162-167行）：
# 5. 构建新镜像
log "🔨 构建新镜像..."
docker compose -f "$COMPOSE_FILE" build --no-cache || {
    error "构建失败"
    rollback
}

# 替换为：
# 5. 拉取最新镜像
log "📥 拉取最新镜像..."
docker compose -f "$COMPOSE_FILE" pull || {
    error "拉取镜像失败"
    rollback
}
```

或者使用以下命令快速替换：

```bash
cd /home/deploy/deepmed-search
sed -i 's/log "🔨 构建新镜像..."/log "📥 拉取最新镜像..."/' scripts/deploy.sh
sed -i 's/docker compose -f "\$COMPOSE_FILE" build --no-cache/docker compose -f "\$COMPOSE_FILE" pull/' scripts/deploy.sh
sed -i 's/error "构建失败"/error "拉取镜像失败"/' scripts/deploy.sh
```

### 5. 更新 GitHub Actions 工作流

修改 `.github/workflows/deploy.yml`，添加镜像构建和推送：

**使用 GitHub Container Registry 的配置**：

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, demo-without-gpu]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push app image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push worker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.worker
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-worker:${{ github.ref_name }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-worker:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    
    steps:
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          port: ${{ secrets.SERVER_PORT || 22 }}
          script: |
            cd /home/deploy/deepmed-search
            
            # 拉取最新的 docker-compose 配置
            git pull origin ${{ github.ref_name }}
            
            # 根据分支选择配置文件
            if [ "${{ github.ref_name }}" = "demo-without-gpu" ]; then
              export COMPOSE_FILE="docker-compose.demo.yml"
            else
              export COMPOSE_FILE="docker-compose.yml"
            fi
            
            # 拉取最新镜像并重启服务
            docker compose -f $COMPOSE_FILE pull
            docker compose -f $COMPOSE_FILE up -d
            
            # 清理未使用的镜像
            docker image prune -f
            
            echo "✅ 部署完成！"
```

**使用 Docker Hub 的配置**（将 `REGISTRY` 和登录部分替换为）：

```yaml
- name: Login to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKER_USERNAME }}
    password: ${{ secrets.DOCKER_PASSWORD }}

- name: Build and push app image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      ${{ secrets.DOCKER_USERNAME }}/deepmed-search:latest
      ${{ secrets.DOCKER_USERNAME }}/deepmed-search:${{ github.sha }}
```

### 6. 测试部署

```bash
# 首次手动拉取镜像并启动
cd /home/deploy/deepmed-search
docker compose pull
docker compose up -d

# 查看服务状态
docker compose ps
docker compose logs -f app
```

### 7. 触发自动部署

推送代码到 main 或 demo-without-gpu 分支：

```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

GitHub Actions 会自动：
1. 构建 Docker 镜像
2. 推送到容器注册表
3. SSH 到服务器
4. 拉取最新镜像
5. 重启服务

查看部署日志：`https://github.com/your-org/deepmed-search/actions`

---

## 方案二：Webhook 自动部署

此方案使用 Webhook 服务监听 GitHub push 事件，服务器端自动拉取最新镜像并部署。

### 1. 前置准备

确保已完成**方案一**中的容器注册表配置和镜像推送设置。Webhook 方案依赖预构建的镜像。

### 2. 安装 Webhook 服务

在服务器上设置 Webhook 服务：

```bash
# 安装 Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 配置 Webhook 服务
cd /home/deploy/deepmed-search

# 生成 Webhook 密钥
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "保存此密钥，稍后添加到 GitHub Webhook 配置: $WEBHOOK_SECRET"

# 设置环境变量
cat > .env.webhook << EOF
WEBHOOK_PORT=9000
WEBHOOK_SECRET=$WEBHOOK_SECRET
PROJECT_DIR=/home/deploy/deepmed-search
REGISTRY=ghcr.io  # 或 docker.io (Docker Hub)
IMAGE_PREFIX=your-org/deepmed-search  # 修改为你的镜像前缀
EOF

# 修改 webhook-server.js，改为拉取镜像而不是构建
# 将部署命令从 'docker compose build' 改为 'docker compose pull'

# 安装 systemd 服务
sudo cp scripts/webhook.service /etc/systemd/system/
sudo nano /etc/systemd/system/webhook.service  # 检查路径配置

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook

# 检查状态
sudo systemctl status webhook
sudo journalctl -u webhook -f  # 查看日志
```

### 3. 配置 Traefik 反向代理

在你的 Traefik 配置中添加 Webhook 路由。有两种方式：

**方式 A：使用 Docker Labels（推荐）**

创建 `docker-compose.webhook.yml`：

```yaml
version: '3.8'

services:
  webhook:
    image: node:20-alpine
    container_name: deepmed-webhook
    restart: always
    working_dir: /app
    volumes:
      - ./scripts/webhook-server.js:/app/webhook-server.js:ro
      - ./.env.webhook:/app/.env:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    command: node webhook-server.js
    environment:
      NODE_ENV: production
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.webhook.rule=Host(`webhook.yourdomain.com`)"
      - "traefik.http.routers.webhook.entrypoints=websecure"
      - "traefik.http.routers.webhook.tls.certresolver=letsencrypt"
      - "traefik.http.services.webhook.loadbalancer.server.port=9000"
    networks:
      - traefik-public

networks:
  traefik-public:
    external: true
```

启动 Webhook 服务：

```bash
docker compose -f docker-compose.webhook.yml up -d
```

**方式 B：使用 Traefik 动态配置文件**

在 `traefik/dynamic/` 目录下创建 `webhook.yml`：

```yaml
http:
  routers:
    webhook:
      rule: "Host(`webhook.yourdomain.com`)"
      entryPoints:
        - websecure
      service: webhook
      tls:
        certResolver: letsencrypt

  services:
    webhook:
      loadBalancer:
        servers:
          - url: "http://localhost:9000"
```

重启 Traefik：

```bash
docker compose restart traefik
```

### 4. 配置 GitHub Webhook

在 GitHub 仓库设置中添加 Webhook：

```
Settings → Webhooks → Add webhook
```

配置：
- **Payload URL**: `https://webhook.yourdomain.com/webhook`
- **Content type**: `application/json`
- **Secret**: 使用之前生成的 WEBHOOK_SECRET
- **Which events**: 选择 "Just the push event"
- **Active**: ✓

### 5. 配置 GitHub Actions 构建镜像

确保 `.github/workflows/deploy.yml` 配置了镜像构建和推送（参考方案一的配置），但移除 SSH 部署步骤：

```yaml
name: Build and Push Images

on:
  push:
    branches: [main, demo-without-gpu]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push app image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Build and push worker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile.worker
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-worker:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}-worker:${{ github.sha }}
```

### 6. 测试 Webhook

```bash
# 查看 Webhook 日志（如果使用 systemd）
sudo journalctl -u webhook -f

# 或者查看容器日志（如果使用 Docker）
docker logs -f deepmed-webhook

# 推送代码触发自动部署
git add .
git commit -m "test: 测试 Webhook 自动部署"
git push origin main
```

**部署流程**：
1. 推送代码到 GitHub
2. GitHub Actions 构建镜像并推送到容器注册表
3. GitHub 触发 Webhook
4. Webhook 服务器收到通知
5. 自动执行 `docker compose pull` 拉取最新镜像
6. 重启服务完成部署

**查看 GitHub Webhook 交付状态**：
```
仓库 Settings → Webhooks → 点击你的 Webhook → Recent Deliveries
```

---

## 方案三：Watchtower 自动更新

Watchtower 是最简单的方案，可以自动检测容器注册表中的镜像更新并重启容器。

### 1. 前置准备

确保已完成：
- 容器注册表配置（GitHub Container Registry 或 Docker Hub）
- GitHub Actions 自动构建并推送镜像
- docker-compose.yml 配置使用远程镜像（不是本地构建）

### 2. 添加 Watchtower 服务

在 `docker-compose.yml` 中添加：

```yaml
services:
  # ... 其他服务 ...

  watchtower:
    image: containrrr/watchtower:latest
    container_name: deepmed-watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Cron 表达式：每天凌晨 2 点检查更新
      - WATCHTOWER_SCHEDULE=0 0 2 * * *
      # 自动清理旧镜像
      - WATCHTOWER_CLEANUP=true
      # 只更新特定标签的镜像
      - WATCHTOWER_LABEL_ENABLE=false
      # 如果使用私有的 GitHub Container Registry
      - REPO_USER=your-github-username
      - REPO_PASS=your-github-token  # 使用 GitHub PAT
      # 通知设置（可选）
      # - WATCHTOWER_NOTIFICATION_URL=slack://...
      # - WATCHTOWER_NOTIFICATIONS=email
    # 或使用命令行参数：每小时检查一次
    # command: --interval 3600 --cleanup
```

**配置私有容器注册表认证**（如果使用私有仓库）：

```yaml
watchtower:
  image: containrrr/watchtower:latest
  environment:
    # GitHub Container Registry
    - REPO_USER=your-github-username
    - REPO_PASS=ghp_your_github_personal_access_token
  # 或者挂载 Docker 配置文件
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ~/.docker/config.json:/config.json:ro
  command: --interval 3600 --cleanup
```

### 3. 配置 GitHub Actions

使用方案一或方案二的 GitHub Actions 配置，确保推送镜像到容器注册表：

```yaml
name: Build and Push

on:
  push:
    branches: [main, demo-without-gpu]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 4. 修改 docker-compose.yml 使用远程镜像

```yaml
services:
  app:
    # 注释掉 build 配置
    # build:
    #   context: .
    #   dockerfile: Dockerfile
    
    # 使用远程镜像
    image: ghcr.io/your-org/deepmed-search:latest
    container_name: deepmed-app
    # ...

  queue-worker:
    # build:
    #   context: .
    #   dockerfile: Dockerfile.worker
    
    image: ghcr.io/your-org/deepmed-search-worker:latest
    container_name: deepmed-queue-worker
    # ...
```

### 5. 启动 Watchtower

```bash
# 启动所有服务（包括 Watchtower）
docker compose up -d

# 或只启动 Watchtower
docker compose up -d watchtower

# 查看 Watchtower 日志
docker logs -f deepmed-watchtower
```

### 6. 测试自动更新

```bash
# 1. 推送代码触发镜像构建
git push origin main

# 2. 等待 GitHub Actions 完成构建并推送镜像

# 3. 手动触发 Watchtower 检查（测试）
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  containrrr/watchtower --run-once --cleanup

# 4. 查看容器是否已更新
docker compose ps
docker compose logs app
```

**Watchtower 工作原理**：
1. 定期（根据 SCHEDULE 配置）检查容器使用的镜像
2. 向容器注册表查询是否有新版本
3. 如果有更新，拉取新镜像
4. 停止旧容器，使用新镜像启动新容器
5. 清理旧镜像（如果启用 CLEANUP）

---

## 🌐 Traefik 配置说明

Traefik 是一个现代化的反向代理和负载均衡器，相比 Nginx 具有以下优势：
- 自动服务发现（通过 Docker labels）
- 自动 SSL 证书管理（Let's Encrypt）
- 实时配置更新（无需重启）
- 内置仪表板和监控

### 1. 基础配置

项目中已包含 Traefik 配置（在 `docker-compose.demo.yml` 中），主要配置文件：

```yaml
# docker-compose.yml 或 docker-compose.demo.yml
traefik:
  image: traefik:v2.10
  container_name: deepmed-traefik
  restart: always
  ports:
    - "80:80"      # HTTP
    - "443:443"    # HTTPS
    - "8080:8080"  # Traefik Dashboard (可选)
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
    - ./traefik/dynamic:/etc/traefik/dynamic:ro
    - traefik-certificates:/letsencrypt
  networks:
    - traefik-public
    - default
```

### 2. Traefik 静态配置

创建 `traefik/traefik.yml`：

```yaml
# API 和仪表板
api:
  dashboard: true
  insecure: false  # 生产环境设为 false

# 入口点配置
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

# Docker 提供商
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false  # 只暴露明确标记的服务
    network: traefik-public
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

# Let's Encrypt 配置
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

# 日志配置
log:
  level: INFO
  filePath: /var/log/traefik/traefik.log

accessLog:
  filePath: /var/log/traefik/access.log
```

### 3. 服务配置（Docker Labels）

在 `docker-compose.yml` 中为应用配置 Traefik 标签：

```yaml
app:
  image: ghcr.io/your-org/deepmed-search:latest
  labels:
    # 启用 Traefik
    - "traefik.enable=true"
    
    # 路由配置
    - "traefik.http.routers.app.rule=Host(`yourdomain.com`)"
    - "traefik.http.routers.app.entrypoints=websecure"
    - "traefik.http.routers.app.tls.certresolver=letsencrypt"
    
    # 服务配置
    - "traefik.http.services.app.loadbalancer.server.port=3000"
    
    # 安全头（可选但推荐）
    - "traefik.http.middlewares.security-headers.headers.frameDeny=true"
    - "traefik.http.middlewares.security-headers.headers.contentTypeNosniff=true"
    - "traefik.http.middlewares.security-headers.headers.browserXssFilter=true"
    - "traefik.http.routers.app.middlewares=security-headers"
  networks:
    - traefik-public
    - default
```

### 4. 多域名配置

如果需要为不同服务配置不同域名：

```yaml
# 主应用
app:
  labels:
    - "traefik.http.routers.app.rule=Host(`www.yourdomain.com`)"

# API 服务
api:
  labels:
    - "traefik.http.routers.api.rule=Host(`api.yourdomain.com`)"

# Webhook
webhook:
  labels:
    - "traefik.http.routers.webhook.rule=Host(`webhook.yourdomain.com`)"
```

### 5. 认证中间件（保护管理界面）

为 Traefik 仪表板或其他管理界面添加认证：

```bash
# 生成密码（htpasswd 格式）
# 安装 apache2-utils
sudo apt-get install apache2-utils

# 生成用户名和密码
htpasswd -nb admin your-password
# 输出类似：admin:$apr1$...

# 在 docker-compose.yml 中使用（注意双 $ 符号）
traefik:
  labels:
    - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
    - "traefik.http.routers.dashboard.middlewares=auth"
```

### 6. 速率限制

为 API 添加速率限制：

```yaml
# 在 traefik/dynamic/middleware.yml 中
http:
  middlewares:
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1m

# 在服务中使用
app:
  labels:
    - "traefik.http.routers.app.middlewares=rate-limit"
```

### 7. 启动和测试

```bash
# 启动 Traefik
docker compose up -d traefik

# 查看日志
docker logs -f deepmed-traefik

# 访问仪表板（如果配置了）
# http://localhost:8080 或 https://traefik.yourdomain.com

# 测试 SSL 证书
curl -I https://yourdomain.com

# 查看 Traefik 配置
docker exec deepmed-traefik traefik version
```

### 8. 常见问题

**问题：证书获取失败**

```bash
# 检查 acme.json 权限
sudo chmod 600 traefik/letsencrypt/acme.json

# 查看证书日志
docker logs deepmed-traefik | grep acme
```

**问题：服务无法访问**

```bash
# 检查服务是否在正确的网络
docker network inspect traefik-public

# 查看 Traefik 路由配置
curl http://localhost:8080/api/http/routers
```

**问题：80/443 端口被占用**

```bash
# 查看端口占用
sudo lsof -i :80
sudo lsof -i :443

# 如果是 Nginx 或 Apache
sudo systemctl stop nginx
sudo systemctl disable nginx
```

---

## 🔒 安全最佳实践

### 1. SSH 密钥安全

```bash
# 使用专用的部署密钥
ssh-keygen -t ed25519 -C "deploy-only" -f ~/.ssh/deploy_key

# 限制密钥只能执行特定命令（在 authorized_keys 中）
command="/home/deploy/deploy-wrapper.sh" ssh-ed25519 AAAA...
```

### 2. Webhook Secret 强度

```bash
# 生成强随机密钥
openssl rand -hex 32

# 定期轮换密钥
```

### 3. 服务器安全

```bash
# 禁用密码登录
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no

# 启用防火墙
sudo ufw enable

# 只开放必要端口
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
```

### 4. Docker 安全

```bash
# 创建专用的部署用户
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# 限制 Docker 权限
sudo chmod 660 /var/run/docker.sock
```

---

## 📊 监控和日志

### 1. 查看部署日志

```bash
# Webhook 日志
tail -f /home/deploy/deepmed-search/webhook.log

# 部署脚本日志
tail -f /home/deploy/deepmed-search/deploy.log

# Docker 日志
docker compose logs -f app
```

### 2. 设置日志轮转

```bash
# /etc/logrotate.d/deepmed-search
/home/deploy/deepmed-search/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 deploy deploy
}
```

### 3. 监控服务状态

```bash
# 创建监控脚本
cat > /home/deploy/monitor.sh << 'EOF'
#!/bin/bash
if ! docker compose ps | grep -q "Up"; then
    echo "服务异常！" | mail -s "DeepMed Alert" admin@example.com
    docker compose restart
fi
EOF

chmod +x /home/deploy/monitor.sh

# 添加到 crontab
crontab -e
# */5 * * * * /home/deploy/monitor.sh
```

---

## 🚨 故障排查

### 部署失败

```bash
# 检查部署日志
cat /home/deploy/deepmed-search/deploy.log

# 检查磁盘空间
df -h

# 检查 Docker 状态
docker ps -a
docker compose logs

# 手动回滚
cd /home/deploy/deepmed-search
git log --oneline -10
git reset --hard <previous-commit>
docker compose down && docker compose up -d
```

### Webhook 不触发

```bash
# 检查 Webhook 服务状态
sudo systemctl status webhook

# 检查日志
tail -50 /home/deploy/deepmed-search/webhook.log

# 测试端口
curl http://localhost:9000/health

# 检查 GitHub Webhook 配置
# Settings → Webhooks → Recent Deliveries
```

### 容器启动失败

```bash
# 查看详细错误
docker compose logs app

# 检查配置文件
docker compose config

# 检查端口占用
sudo lsof -i :3000

# 重新构建
docker compose build --no-cache app
docker compose up -d app
```

---

## 📚 相关文档

- [Docker 部署指南](./DEPLOYMENT_CHECKLIST.md)
- [SSL 配置](./SSL_QUICKSTART.md)
- [故障排查](../troubleshooting/)

---

## 🎯 快速开始

### 最小化配置（推荐新手）

1. **在 GitHub 上配置 Secrets**（SERVER_HOST、SERVER_USER、SSH_PRIVATE_KEY）
2. **服务器端准备**：
   - 安装 Docker 和 Docker Compose
   - 配置 Traefik（使用 docker-compose.demo.yml 中的配置）
   - 修改 docker-compose 文件使用远程镜像
   - 登录容器注册表
3. **配置 GitHub Actions**：构建并推送镜像到 GHCR
4. **推送代码**到 main 分支，自动触发部署

**优势**：服务器端只需拉取镜像，无需编译，内存占用小。

### 完整配置（推荐生产环境）

1. **容器注册表**：选择 GitHub Container Registry（免费）或 Docker Hub
2. **GitHub Actions**：
   - 自动构建多架构镜像
   - 推送到容器注册表
   - SSH 到服务器拉取并部署
3. **Webhook 服务**（可选）：
   - 配置 Traefik 反向代理
   - 实时响应 GitHub push 事件
   - 自动拉取镜像并重启服务
4. **Watchtower**（可选）：
   - 定期检查镜像更新
   - 全自动更新容器
5. **监控和告警**：
   - 日志收集和分析
   - 服务健康检查
   - 异常告警通知

### 推荐方案组合

| 场景 | 推荐方案 | 说明 |
|------|---------|------|
| 小型项目 | 方案一 | GitHub Actions + SSH，简单可靠 |
| 中型项目 | 方案一 + 方案三 | Actions 部署 + Watchtower 自动更新 |
| 大型项目 | 方案二 + 方案三 | Webhook 实时部署 + Watchtower 备用 |
| 开发环境 | 方案三 | Watchtower 自动更新，无需配置 |

---

**最后更新**: 2025-11-15

**主要变更**：
- ✅ 使用预构建镜像部署（服务器端无需编译）
- ✅ 集成 Traefik 反向代理（替代 Nginx）
- ✅ 支持 GitHub Container Registry 和 Docker Hub
- ✅ 优化了 CI/CD 流程，节省服务器资源

