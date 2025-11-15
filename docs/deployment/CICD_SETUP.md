# CI/CD 自动化部署指南

本文档介绍如何为 DeepMed Search 项目设置完整的 CI/CD 流程。

## 📋 目录

- [方案概述](#方案概述)
- [方案一：GitHub Actions + SSH](#方案一github-actions--ssh)
- [方案二：Webhook 自动部署](#方案二webhook-自动部署)
- [方案三：Watchtower 自动更新](#方案三watchtower-自动更新)
- [故障排查](#故障排查)

## 方案概述

我们提供三种 CI/CD 方案：

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| GitHub Actions + SSH | 灵活、功能强大 | 需要配置 SSH | 完全控制部署流程 |
| Webhook | 轻量、实时 | 需要开放端口 | 快速自动部署 |
| Watchtower | 零配置 | 需要 Docker Hub | 镜像自动更新 |

---

## 方案一：GitHub Actions + SSH

### 1. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

需要添加的 Secrets：

```bash
SERVER_HOST=your.server.ip.address
SERVER_USER=deploy
SERVER_PORT=22
SSH_PRIVATE_KEY=<your-ssh-private-key>

# 可选：Docker Hub 凭证
DOCKER_USERNAME=your-docker-username
DOCKER_PASSWORD=your-docker-token
```

### 2. 生成 SSH 密钥

在本地或服务器上生成 SSH 密钥对：

```bash
# 生成密钥（不设置密码）
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions.pub deploy@your-server

# 将私钥内容复制到 GitHub Secrets
cat ~/.ssh/github_actions
```

### 3. 配置服务器

在服务器上准备项目目录：

```bash
# 切换到部署用户
sudo su - deploy

# 克隆项目
cd /home/deploy
git clone https://github.com/your-org/deepmed-search.git
cd deepmed-search

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 确保部署脚本可执行
chmod +x scripts/deploy.sh
```

### 4. 测试部署

```bash
# 手动触发部署测试
bash scripts/deploy.sh
```

### 5. 触发自动部署

推送代码到 main 或 demo-without-gpu 分支：

```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

GitHub Actions 会自动触发部署。查看部署日志：

```
https://github.com/your-org/deepmed-search/actions
```

---

## 方案二：Webhook 自动部署

### 1. 安装 Webhook 服务

在服务器上设置 Webhook 服务：

```bash
# 安装 Node.js（如果未安装）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 配置 Webhook 服务
cd /home/deploy/deepmed-search

# 设置环境变量
cat > .env.webhook << EOF
WEBHOOK_PORT=9000
WEBHOOK_SECRET=$(openssl rand -hex 32)
PROJECT_DIR=/home/deploy/deepmed-search
EOF

# 安装 systemd 服务
sudo cp scripts/webhook.service /etc/systemd/system/
sudo nano /etc/systemd/system/webhook.service  # 修改路径和密钥

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook

# 检查状态
sudo systemctl status webhook
```

### 2. 配置防火墙

开放 Webhook 端口：

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 9000/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=9000/tcp
sudo firewall-cmd --reload
```

### 3. 配置 Nginx 反向代理（推荐）

```nginx
# /etc/nginx/sites-available/webhook
server {
    listen 80;
    server_name webhook.yourdomain.com;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置 GitHub Webhook

在 GitHub 仓库设置中添加 Webhook：

```
Settings → Webhooks → Add webhook
```

配置：
- **Payload URL**: `http://your-server:9000/webhook` 或 `https://webhook.yourdomain.com/webhook`
- **Content type**: `application/json`
- **Secret**: 使用生成的 WEBHOOK_SECRET
- **Events**: 选择 "Just the push event"
- **Active**: ✓

### 5. 测试 Webhook

```bash
# 查看 Webhook 日志
tail -f /home/deploy/deepmed-search/webhook.log

# 推送代码触发部署
git push origin main
```

---

## 方案三：Watchtower 自动更新

Watchtower 可以自动检测并更新 Docker 容器。

### 1. 添加 Watchtower 服务

在 `docker-compose.yml` 中添加：

```yaml
services:
  # ... 其他服务 ...

  watchtower:
    image: containrrr/watchtower
    container_name: deepmed-watchtower
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # 每天凌晨 2 点检查更新
      - WATCHTOWER_SCHEDULE=0 0 2 * * *
      # 只监控特定容器
      - WATCHTOWER_MONITOR_ONLY=false
      # 清理旧镜像
      - WATCHTOWER_CLEANUP=true
      # 通知设置（可选）
      # - WATCHTOWER_NOTIFICATION_URL=slack://...
    command: --interval 3600  # 每小时检查一次
```

### 2. 推送镜像到 Docker Hub

修改 GitHub Actions 启用镜像推送：

```yaml
# .github/workflows/deploy.yml
- name: Build and push Docker images
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      yourusername/deepmed-search:latest
      yourusername/deepmed-search:${{ github.sha }}
```

### 3. 使用 Docker Hub 镜像

修改 `docker-compose.yml`：

```yaml
services:
  app:
    image: yourusername/deepmed-search:latest
    # build:
    #   context: .
    #   dockerfile: Dockerfile
```

### 4. 启动 Watchtower

```bash
docker compose up -d watchtower
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

1. 配置 GitHub Secrets
2. 推送代码到 main 分支
3. GitHub Actions 自动部署

### 完整配置（推荐生产）

1. 配置 GitHub Actions（构建和测试）
2. 设置 Webhook 服务（实时部署）
3. 启用 Watchtower（自动更新）
4. 配置监控和告警

---

**最后更新**: 2024-11-15

