# Traefik + Let's Encrypt SSL 配置指南

## 概述

本项目已配置 Traefik 作为反向代理，并集成 Let's Encrypt 自动获取和续期 SSL 证书。

域名: **www.deepmedsearch.cloud**

## 目录结构

```
traefik/
├── traefik.yml          # Traefik 主配置文件
└── dynamic/
    └── tls.yml          # TLS 动态配置
```

## 配置说明

### 1. Traefik 主配置 (`traefik/traefik.yml`)

- **入口点**:
  - `web` (端口 80): HTTP 流量，自动重定向到 HTTPS
  - `websecure` (端口 443): HTTPS 流量

- **Let's Encrypt 配置**:
  - 证书解析器: `letsencrypt`
  - 挑战方式: HTTP-01
  - 证书存储: `/letsencrypt/acme.json`
  - 通知邮箱: `admin@deepmedsearch.cloud` (请根据需要修改)

### 2. 服务配置

#### 主应用 (app)
- 域名: `www.deepmedsearch.cloud`
- 自动 HTTPS
- 包含安全头配置 (HSTS, XSS Protection 等)

#### Traefik 仪表板
- 访问地址: `https://www.deepmedsearch.cloud/dashboard/`
- 建议启用基本认证 (见下文)

## 部署步骤

### 1. 确保 DNS 配置正确

确保域名 `www.deepmedsearch.cloud` 的 A 记录指向服务器的公网 IP。

```bash
# 验证 DNS 解析
dig www.deepmedsearch.cloud +short
# 或者
nslookup www.deepmedsearch.cloud
```

### 2. 修改邮箱地址

编辑 `traefik/traefik.yml`，将邮箱修改为您的真实邮箱：

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: wang-hao@shu.edu.cn  # 修改这里
```

### 3. 启动服务

```bash
# 创建必要的目录
mkdir -p traefik/dynamic

# 启动所有服务
docker-compose up -d

# 查看 Traefik 日志
docker-compose logs -f traefik
```

### 4. 验证证书

访问 `https://www.deepmedsearch.cloud`，检查浏览器地址栏是否显示安全锁图标。

```bash
# 使用 openssl 检查证书
openssl s_client -connect www.deepmedsearch.cloud:443 -servername www.deepmedsearch.cloud < /dev/null | grep -A 5 "Certificate chain"
```

## 可选配置

### 启用 Traefik 仪表板认证

1. 生成密码哈希：

```bash
# 安装 htpasswd (如果未安装)
# Ubuntu/Debian:
sudo apt-get install apache2-utils

# CentOS/RHEL:
# sudo yum install httpd-tools

# 生成用户名和密码 (用户名: admin)
htpasswd -nb admin your_password
```

2. 编辑 `docker-compose.yml`，取消注释并添加生成的哈希：

```yaml
traefik:
  labels:
    # ...
    - "traefik.http.routers.traefik.middlewares=auth"
    - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$H6uskkkW$$IgXLP6ewTrSuBkTrqE8wj/"  # 替换为您的哈希
```

注意: 在 docker-compose.yml 中需要使用 `$$` 转义 `$` 符号。

3. 重启 Traefik：

```bash
docker-compose up -d traefik
```

### 添加其他服务的 HTTPS 支持

如需为其他服务（如 MinIO 控制台、Attu 等）添加 HTTPS，可以添加类似的 labels：

```yaml
minio:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.minio.rule=Host(`minio.deepmedsearch.cloud`)"
    - "traefik.http.routers.minio.entrypoints=websecure"
    - "traefik.http.routers.minio.tls.certresolver=letsencrypt"
    - "traefik.http.services.minio.loadbalancer.server.port=9001"
  networks:
    - traefik-public
    - default
```

## 故障排查

### 证书获取失败

1. **DNS 未正确配置**:
   ```bash
   # 确认 DNS 解析到正确的 IP
   dig www.deepmedsearch.cloud +short
   ```

2. **防火墙阻止端口 80/443**:
   ```bash
   # 检查端口是否开放
   sudo ufw status
   sudo firewall-cmd --list-all  # CentOS/RHEL
   
   # 开放端口
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

3. **查看 Traefik 日志**:
   ```bash
   docker-compose logs traefik | grep -i error
   docker-compose logs traefik | grep -i acme
   ```

4. **Let's Encrypt 速率限制**:
   - 每周每域名限制 50 个证书
   - 如果超限，请等待一周或使用测试环境

### 测试环境

如需在测试环境使用 Let's Encrypt Staging（避免速率限制），修改 `traefik/traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory
      # ...
```

### 证书存储权限问题

```bash
# 检查证书文件权限
docker-compose exec traefik ls -la /letsencrypt/

# 如果需要，重新创建证书卷
docker-compose down
docker volume rm deepmed-search_traefik-certificates
docker-compose up -d
```

## 证书续期

Let's Encrypt 证书有效期为 90 天，Traefik 会自动在证书到期前 30 天内尝试续期。

查看证书续期日志：

```bash
docker-compose logs traefik | grep -i "renew"
```

## 环境变量

在 `.env` 文件中可配置的变量：

```bash
# Traefik 相关 (可选)
TRAEFIK_DASHBOARD_PORT=8080
```

## 访问地址

配置完成后的访问地址：

- **主应用**: https://www.deepmedsearch.cloud
- **Traefik 仪表板**: https://www.deepmedsearch.cloud/dashboard/ (需要认证)

## 安全建议

1. ✅ 启用 Traefik 仪表板的基本认证
2. ✅ 定期检查证书状态
3. ✅ 保持 Traefik 版本更新
4. ✅ 限制仪表板访问（可使用 IP 白名单）
5. ✅ 定期备份 `traefik-certificates` 卷

## 更新 Traefik

```bash
# 拉取最新镜像
docker-compose pull traefik

# 重启服务
docker-compose up -d traefik
```

## 参考资料

- [Traefik 官方文档](https://doc.traefik.io/traefik/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [Traefik + Docker 配置指南](https://doc.traefik.io/traefik/providers/docker/)

