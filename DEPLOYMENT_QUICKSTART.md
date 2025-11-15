# 🚀 部署快速开始指南

本指南帮助你快速部署 DeepMed Search 项目，使用腾讯云容器镜像服务。

## 📋 部署架构

**当前部署方式**（双分支架构）：
- **main 分支**：日常开发，推送不触发部署，用户本地使用
- **demo-without-gpu 分支**：演示环境，推送时自动部署到服务器
- 服务器：运行 `demo-without-gpu` 分支 + `docker-compose.demo.yml`
- 镜像来源：腾讯云 TCR（预构建镜像）
- 服务器要求：小内存（2GB+）即可

## 🎯 架构优势

- ✅ **无需编译**：服务器端只拉取镜像，节省内存和 CPU
- ✅ **快速部署**：几分钟内完成部署
- ✅ **国内友好**：使用腾讯云，访问速度快
- ✅ **避免频繁部署**：main 推送不触发部署，只有 demo 分支推送才部署
- ✅ **轻量配置**：无需 GPU，使用 Markitdown 解析文档

---

## 📦 快速部署

### 1️⃣ 配置 GitHub Secrets

在 GitHub 仓库添加 Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

添加以下内容：

```bash
TENCENT_REGISTRY_USER=你的腾讯云账号ID
TENCENT_REGISTRY_PASSWORD=你的TCR访问密码
SERVER_HOST=你的服务器IP
SERVER_USER=deploy
SSH_PRIVATE_KEY=你的SSH私钥内容
```

**获取腾讯云凭证**：
1. 访问 https://console.cloud.tencent.com/tcr
2. 访问管理 → 访问凭证 → 生成密码

### 2️⃣ 服务器准备

```bash
# 1. 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER

# 2. 创建部署用户
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# 3. 配置 SSH 密钥
sudo su - deploy
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 4. 登录腾讯云容器镜像服务
docker login jpccr.ccs.tencentyun.com -u <账号ID> -p <TCR密码>

# 5. 克隆项目
cd /home/deploy
git clone https://github.com/your-org/deepmed-search.git
cd deepmed-search
# 默认就是 main 分支

# 6. 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 7. 首次部署
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d

# 8. 查看状态
docker compose -f docker-compose.demo.yml ps
docker compose -f docker-compose.demo.yml logs -f app
```

### 3️⃣ 日常开发

**在 main 分支开发**（不触发部署）：

```bash
git checkout main
git add .
git commit -m "feat: 添加新功能"
git push origin main
# main 分支推送不触发自动部署
```

**更新演示环境**（触发自动部署）：

```bash
# 将 main 的更新合并到 demo 分支
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
# demo 分支推送触发自动部署
```

GitHub Actions 会自动：
1. 构建镜像并推送到腾讯云
2. SSH 到服务器
3. 拉取最新代码（demo-without-gpu 分支）
4. 拉取最新镜像（从腾讯云）
5. 重启服务

**完成！** 🎉

---

## 📖 分支策略说明

详细的分支使用策略请查看：[分支策略文档](BRANCHING_STRATEGY.md)

---

## 🌐 Traefik 配置（可选）

如果需要 HTTPS 和域名访问：

### 1. 创建 Traefik 配置文件

```bash
mkdir -p traefik
nano traefik/traefik.yml
```

```yaml
api:
  dashboard: true
  insecure: false

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

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-public
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO
```

### 2. 启动 Traefik

```bash
docker compose up -d traefik
```

### 3. 访问服务

- 主应用：https://www.yourdomain.com
- Traefik 仪表板：https://www.yourdomain.com/dashboard/

---

## ✅ 验证部署

### 检查服务状态

```bash
# 查看所有服务
docker compose ps

# 查看日志
docker compose logs -f app
docker compose logs -f queue-worker

# 测试应用
curl http://localhost:3000
# 或访问 https://your-domain.com
```

### 检查资源使用

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理未使用的镜像
docker image prune -f
```

---

## 🔧 常见问题

### 1. 内存不足

**Demo 分支**：已经使用预构建镜像，不需要编译。如果还是不够：

```bash
# 停止不必要的服务
docker compose stop attu bull-board
```

**Main 分支**：需要至少 8GB 内存用于编译。

### 2. 拉取镜像失败

```bash
# 检查是否登录
docker login jpccr.ccs.tencentyun.com

# 手动拉取测试
docker pull jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search:latest
```

### 3. 端口被占用

```bash
# 检查端口占用
sudo lsof -i :80
sudo lsof -i :443
sudo lsof -i :3000

# 停止占用端口的服务
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### 4. GitHub Actions 失败

- 检查 GitHub Secrets 是否正确配置
- 查看 Actions 日志：`https://github.com/your-org/deepmed-search/actions`
- 确认服务器可以通过 SSH 访问

---

## 📚 更多文档

- [详细 CI/CD 配置](docs/deployment/CICD_SETUP.md)
- [腾讯云容器镜像服务配置](docs/deployment/TENCENT_CLOUD_REGISTRY.md)
- [Docker Compose 使用指南](docs/deployment/DOCKER_COMPOSE_USAGE.zh-CN.md)
- [故障排查指南](docs/troubleshooting/)

---

## 🆘 获取帮助

如遇到问题：

1. 查看日志：`docker compose logs -f`
2. 检查服务状态：`docker compose ps`
3. 查看文档：`docs/` 目录
4. 提交 Issue：GitHub Issues

---

**快速命令参考**

```bash
# 快速部署（使用预构建镜像）
cd /home/deploy/deepmed-search
git checkout main
git pull origin main
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d

# 查看日志
docker compose logs -f app

# 重启服务
docker compose restart app

# 停止所有服务
docker compose down

# 完全清理重新开始
docker compose down -v
docker system prune -a
```

---

**祝你部署顺利！** 🎉

