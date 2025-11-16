# 🏭 生产环境部署指南

完整的生产环境部署配置，包含安全加固、HTTPS、监控和备份。

> **适用场景**：生产环境、正式上线、高可用部署

[English](./PRODUCTION.md) | [快速部署](./QUICKSTART.zh-CN.md) | [CI/CD 自动部署](./CICD.zh-CN.md)

## 📋 部署前检查清单

### ✅ 基础设施要求

- [ ] Linux 服务器（Ubuntu 20.04+ 推荐）
- [ ] 4GB+ RAM，8GB+ 推荐
- [ ] 50GB+ 磁盘空间
- [ ] 公网 IP 地址
- [ ] 域名（必需，用于 HTTPS）
- [ ] Docker 和 Docker Compose 已安装

### ✅ DNS 配置

- [ ] 域名 A 记录指向服务器公网 IP
- [ ] 验证 DNS 解析正常

```bash
# 验证 DNS 解析
dig your-domain.com +short

# 应该返回您的服务器 IP
```

### ✅ 防火墙配置

- [ ] 开放端口 80 (HTTP)
- [ ] 开放端口 443 (HTTPS)
- [ ] 开放端口 22 (SSH，限制来源 IP)
- [ ] 关闭不必要的端口

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 🔐 安全配置

### 1. 生成安全密钥

```bash
# 生成 NEXTAUTH_SECRET（用于会话加密）
openssl rand -base64 32

# 生成 ENCRYPTION_KEY（用于 API 密钥加密）
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 16

# 生成 MinIO 密钥
openssl rand -base64 24
```

### 2. 配置环境变量

创建 `.env` 文件：

```bash
cd /path/to/deepmed-search
cp .env.example .env
nano .env
```

**必需配置：**

```bash
# ==================== NextAuth 配置 ====================
NEXTAUTH_URL=https://your-domain.com  # ⚠️ 必须使用 HTTPS
NEXTAUTH_SECRET=<生成的密钥>

# ==================== 加密配置 ====================
ENCRYPTION_KEY=<生成的密钥>

# ==================== 数据库配置 ====================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<强密码>
POSTGRES_DB=deepmed
DATABASE_URL=postgresql://postgres:<密码>@postgres:5432/deepmed

# ==================== Redis 配置 ====================
REDIS_URL=redis://redis:6379
# 可选：设置 Redis 密码
# REDIS_PASSWORD=<强密码>
# REDIS_URL=redis://:密码@redis:6379

# ==================== MinIO 配置 ====================
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=<自定义密钥>
MINIO_SECRET_KEY=<强密码>
MINIO_PUBLIC_URL=https://your-domain.com
MINIO_BROWSER_REDIRECT_URL=https://your-domain.com

# ==================== Milvus 配置 ====================
MILVUS_HOST=milvus-standalone
MILVUS_PORT=19530

# ==================== 文档解析器 ====================
MARKITDOWN_URL=http://markitdown:5000
# MINERU_URL=http://mineru:8000  # 如使用 MinerU
```

### 3. Traefik SSL 配置

编辑 `traefik/traefik.yml`：

```yaml
# 修改邮箱地址为您的邮箱
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com  # ⚠️ 修改这里
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### 4. Docker Compose 配置

确保 `docker-compose.yml` 中 app 服务正确配置：

```yaml
app:
  # ⚠️ 注释掉直接端口映射，仅通过 Traefik 访问
  # ports:
  #   - "3000:3000"
  expose:
    - "3000"  # ✅ 仅在内部网络暴露
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.app.rule=Host(`your-domain.com`)"
    - "traefik.http.routers.app.entrypoints=websecure"
    - "traefik.http.routers.app.tls.certresolver=letsencrypt"
```

## 🚀 部署步骤

### 方法一：自动部署脚本（推荐）

```bash
cd /path/to/deepmed-search

# 运行 SSL 配置脚本
./docs/deployment/setup-ssl.sh

# 脚本会自动：
# 1. 检查 DNS 配置
# 2. 检查防火墙端口
# 3. 配置 Traefik
# 4. 启动服务
# 5. 获取 SSL 证书
```

### 方法二：手动部署

#### 1. 克隆项目

```bash
cd /opt
sudo git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search

# 生产环境使用 main 分支
git checkout main
```

#### 2. 配置环境

```bash
# 复制并编辑环境变量
cp .env.example .env
nano .env

# 配置 Traefik
nano traefik/traefik.yml

# 创建必要的目录
mkdir -p traefik/dynamic
mkdir -p logs
chmod 777 logs
```

#### 3. 启动服务

```bash
# 拉取镜像（如使用预构建镜像）
docker compose pull

# 或构建镜像（如本地构建）
# docker compose build

# 启动所有服务
docker compose up -d

# 查看状态
docker compose ps
```

#### 4. 初始化数据库

```bash
# 运行数据库迁移
docker compose exec app npx prisma db push --skip-generate --accept-data-loss

# 或从主机运行
npx prisma db push
```

#### 5. 创建管理员账号

```bash
# 创建默认测试用户
npm run create:user

# 或手动创建用户（登录后在 /register 页面）
```

## 🔍 验证部署

### 1. 检查服务状态

```bash
# 查看所有容器状态
docker compose ps

# 所有服务应显示 "Up" 或 "healthy"
```

### 2. 检查 SSL 证书

```bash
# 浏览器访问
https://your-domain.com

# 命令行检查
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# 查看证书详情
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 3. 检查日志

```bash
# Traefik 日志（检查 SSL 证书获取）
docker compose logs traefik | grep -i acme
docker compose logs traefik | grep -i error

# 应用日志
docker compose logs -f app

# 数据库日志
docker compose logs postgres
```

### 4. 功能测试

- [ ] 访问 `https://your-domain.com`
- [ ] 确认 HTTPS 正常（绿色锁图标）
- [ ] 测试用户注册和登录
- [ ] 配置 API Keys（`/settings/llm`）
- [ ] 创建知识库并上传文档
- [ ] 测试各种搜索功能
- [ ] 测试 Deep Research 功能

## 🔐 安全加固

### 1. 限制管理界面访问

建议限制以下管理界面仅内网访问，或添加认证：

```yaml
# docker-compose.yml 中
services:
  attu:  # Milvus 管理界面
    ports:
      - "127.0.0.1:8001:3000"  # 仅本地访问

  redis-insight:  # Redis 管理界面
    ports:
      - "127.0.0.1:8002:8001"  # 仅本地访问

  bull-board:  # 队列监控
    ports:
      - "127.0.0.1:8003:3000"  # 仅本地访问
```

### 2. 启用 Traefik 仪表板认证

```bash
# 生成认证密码
htpasswd -nb admin your_password

# 在 docker-compose.yml 中添加
traefik:
  labels:
    - "traefik.http.routers.traefik.middlewares=auth"
    - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
```

### 3. 配置 fail2ban

```bash
# 安装 fail2ban
sudo apt-get install fail2ban

# 配置 SSH 保护
sudo nano /etc/fail2ban/jail.local

# 添加
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600

# 重启 fail2ban
sudo systemctl restart fail2ban
```

### 4. 定期安全更新

```bash
# 设置自动安全更新
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 💾 备份策略

### 1. 数据库备份

```bash
# 创建备份脚本
cat > /opt/backup-postgres.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U postgres deepmed | gzip > $BACKUP_DIR/deepmed_$DATE.sql.gz

# 保留最近30天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup-postgres.sh

# 添加到 crontab（每天凌晨2点备份）
crontab -e
# 添加：0 2 * * * /opt/backup-postgres.sh
```

### 2. 文件备份

```bash
# 备份重要卷
docker run --rm \
  -v deepmed-search_postgres-data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .

docker run --rm \
  -v deepmed-search_minio-data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/minio-data-$(date +%Y%m%d).tar.gz -C /data .
```

### 3. 配置文件备份

```bash
# 备份配置
tar czf /opt/backups/config-$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  traefik/
```

## 📊 监控

### 1. 服务健康检查

```bash
# 检查容器状态
docker compose ps

# 检查容器资源使用
docker stats

# 检查磁盘使用
df -h
docker system df
```

### 2. 日志监控

```bash
# 实时查看所有日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f traefik

# 查看错误日志
docker compose logs | grep -i error
docker compose logs | grep -i fatal
```

### 3. 证书监控

```bash
# 检查证书到期时间
echo | openssl s_client -servername your-domain.com \
  -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Traefik 会自动续期证书（到期前30天）
```

### 4. 性能监控

建议安装监控工具：
- **Prometheus + Grafana**：指标监控和可视化
- **Loki**：日志聚合
- **Uptime Kuma**：服务可用性监控

## 🔄 更新和维护

### 更新应用

```bash
cd /opt/deepmed-search

# 拉取最新代码
git pull origin main

# 拉取最新镜像
docker compose pull

# 重启服务
docker compose up -d

# 查看状态
docker compose ps
```

### 清理资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷（谨慎使用！）
docker volume prune

# 查看磁盘使用
docker system df
```

## ❗ 故障排查

### 问题 1：SSL 证书获取失败

**可能原因：**
- DNS 未正确解析到服务器
- 防火墙端口 80 未开放
- 域名已存在其他 SSL 证书

**解决方法：**

```bash
# 1. 检查 DNS
dig your-domain.com +short

# 2. 检查端口
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 3. 查看 Traefik 日志
docker compose logs traefik | grep -i acme

# 4. 重新获取证书
docker compose restart traefik
```

### 问题 2：应用无法访问

**检查步骤：**

```bash
# 1. 检查容器状态
docker compose ps

# 2. 检查应用日志
docker compose logs app

# 3. 检查环境变量
docker compose exec app env | grep NEXTAUTH

# 4. 重启应用
docker compose restart app
```

### 问题 3：数据库连接失败

```bash
# 1. 检查数据库状态
docker compose ps postgres

# 2. 测试连接
docker compose exec app sh -c "npx prisma db push --help"

# 3. 检查 DATABASE_URL
cat .env | grep DATABASE_URL

# 4. 重启数据库
docker compose restart postgres
```

### 问题 4：内存不足

```bash
# 查看内存使用
free -h
docker stats

# 停止不必要的服务
docker compose stop attu bull-board redis-insight

# 或升级服务器配置
```

## 📚 相关文档

- [快速部署指南](./QUICKSTART.zh-CN.md) - 快速体验部署
- [CI/CD 自动部署](./CICD.zh-CN.md) - GitHub Actions 自动化
- [SSL 配置详解](./TRAEFIK_SSL_SETUP.md) - Traefik SSL 详细配置
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md) - 完整检查清单

## 🆘 获取帮助

遇到问题？

1. 查看 [故障排查指南](../troubleshooting/)
2. 查看 [完整文档](../README.md)
3. 提交 [GitHub Issue](https://github.com/hint-lab/deepmed-search/issues)
4. 发送邮件：wang-hao@shu.edu.cn

---

**生产环境部署完成！** 🎉

**安全提示**：
- 定期更新系统和 Docker 镜像
- 监控服务器资源使用情况
- 定期备份重要数据
- 及时更新应用到最新版本

