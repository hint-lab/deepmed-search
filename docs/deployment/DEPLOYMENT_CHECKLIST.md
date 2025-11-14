# 🚀 部署检查清单

在部署 DeepMed Search 到生产环境之前，请完成以下检查项：

## ✅ 必须配置项

### 1. DNS 配置
- [ ] 确保 `www.deepmedsearch.cloud` 的 A 记录指向服务器公网 IP
- [ ] 验证 DNS 解析：`dig www.deepmedsearch.cloud +short`

### 2. 防火墙规则
- [ ] 开放端口 80 (HTTP)
- [ ] 开放端口 443 (HTTPS)
- [ ] 开放端口 5432 (PostgreSQL，如需外部访问)

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 3. 环境变量配置 (.env)

#### 必须设置：
```bash
# NextAuth 配置
NEXTAUTH_URL=https://www.deepmedsearch.cloud  # ⚠️ 必须使用 HTTPS
NEXTAUTH_SECRET=<运行: openssl rand -base64 32>

# 加密密钥
ENCRYPTION_KEY=<运行: openssl rand -base64 32>

# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<强密码>
POSTGRES_DB=deepmed
DATABASE_URL=postgresql://postgres:<密码>@postgres:5432/deepmed
```

#### 推荐设置：
```bash
# MinIO 配置
MINIO_ACCESS_KEY=<自定义>
MINIO_SECRET_KEY=<强密码>
MINIO_PUBLIC_URL=https://www.deepmedsearch.cloud

# Redis 配置（可选设置密码）
REDIS_PASSWORD=<强密码>
REDIS_URL=redis://:密码@redis:6379
```

### 4. Traefik 配置
- [ ] 修改 `traefik/traefik.yml` 中的邮箱地址
- [ ] 确认 `docker-compose.yml` 中 app 服务的 3000 端口已注释（仅通过 Traefik 访问）

### 5. Docker Compose 配置
- [ ] 检查 `docker-compose.yml` 中 app 服务配置：
  ```yaml
  app:
    # ports:  # 已注释，仅通过 Traefik 访问
    #   - "3000:3000"
    expose:
      - "3000"  # ✅ 正确：仅在内部网络暴露
  ```

## 🔐 安全加固（推荐）

### 1. 启用 Traefik 仪表板认证
```bash
# 生成认证密码
htpasswd -nb admin your_password

# 在 docker-compose.yml 中取消注释并添加
traefik:
  labels:
    - "traefik.http.routers.traefik.middlewares=auth"
    - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
```

### 2. 定期备份
- [ ] 设置数据库自动备份
- [ ] 备份重要卷：
  - `postgres-data`
  - `minio-data`
  - `traefik-certificates`

### 3. 限制管理工具访问
考虑限制以下服务仅内网访问：
- Traefik 仪表板 (8080)
- Attu - Milvus 管理 (8001)
- RedisInsight (8002)
- BullMQ Board (8003)

## 📋 部署步骤

### 快速部署（推荐）
```bash
./setup-ssl.sh
```

### 手动部署
```bash
# 1. 检查 DNS
dig www.deepmedsearch.cloud +short

# 2. 创建并配置 .env 文件
cp .env.example .env
nano .env  # 修改必要的配置

# 3. 修改 Traefik 邮箱
nano traefik/traefik.yml

# 4. 创建配置目录
mkdir -p traefik/dynamic

# 5. 启动服务
docker compose up -d

# 6. 查看日志
docker compose logs -f traefik
```

## 🔍 验证部署

### 1. 检查服务状态
```bash
docker compose ps
```

所有服务应该显示 `Up` 或 `healthy`。

### 2. 检查证书
```bash
# 浏览器访问
https://www.deepmedsearch.cloud

# 命令行检查
openssl s_client -connect www.deepmedsearch.cloud:443 -servername www.deepmedsearch.cloud < /dev/null
```

### 3. 检查 Traefik 日志
```bash
docker compose logs traefik | grep -i acme
docker compose logs traefik | grep -i error
```

### 4. 访问应用
- [ ] 主应用: https://www.deepmedsearch.cloud
- [ ] 确认 HTTPS 正常工作（绿色锁图标）
- [ ] 测试登录功能
- [ ] 测试文件上传功能

## 🚨 常见问题

### 证书获取失败
1. 检查 DNS 是否正确解析
2. 检查防火墙端口 80 是否开放
3. 查看 Traefik 日志：`docker compose logs traefik`

### 应用无法访问
1. 检查 Docker 服务状态：`docker compose ps`
2. 检查应用日志：`docker compose logs app`
3. 确认 NEXTAUTH_URL 使用 HTTPS

### 登录后重定向失败
1. 确认 `.env` 中 `NEXTAUTH_URL=https://www.deepmedsearch.cloud`
2. 重启应用：`docker compose restart app`

## 📊 监控

### 实时日志
```bash
# 所有服务
docker compose logs -f

# 特定服务
docker compose logs -f app
docker compose logs -f traefik
docker compose logs -f postgres
```

### 资源使用
```bash
# 容器资源使用
docker stats

# 磁盘使用
docker system df
```

### 证书到期时间
```bash
# 查看证书信息
docker compose exec traefik cat /letsencrypt/acme.json | grep -i "NotAfter"
```

## 📚 相关文档

- [SSL 快速启动](./SSL_QUICKSTART.md)
- [Traefik 详细配置](./TRAEFIK_SSL_SETUP.md)
- [README](./README.md)

## 🆘 获取帮助

如遇到问题：
1. 查看日志：`docker compose logs`
2. 检查配置：确认上述检查清单全部完成
3. 重启服务：`docker compose restart`
4. 完全重建：`docker compose down && docker compose up -d`

---

**最后更新**: 2024
**维护者**: DeepMed Search Team

