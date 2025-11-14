# SSL 快速启动指南

## 🚀 快速开始

为您的 DeepMed Search 项目启用 HTTPS 仅需 3 步！

### 1️⃣ 确认 DNS 配置

确保域名 `www.deepmedsearch.cloud` 的 A 记录已指向您的服务器 IP。

```bash
# 检查 DNS 解析
dig www.deepmedsearch.cloud +short
```

### 2️⃣ 运行配置脚本

```bash
# 执行自动配置脚本
./setup-ssl.sh
```

脚本会自动：
- ✅ 检查 DNS 配置
- ✅ 检查端口占用
- ✅ 配置 Let's Encrypt 邮箱
- ✅ 启动 Traefik 和应用

### 3️⃣ 访问您的应用

```
https://www.deepmedsearch.cloud
```

就是这么简单！🎉

---

## 📋 手动配置（可选）

如果您不想使用自动脚本，可以手动配置：

### 步骤 1: 修改邮箱

编辑 `traefik/traefik.yml` 文件，修改 Let's Encrypt 通知邮箱：

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: wang-hao@shu.edu.cn  # 改为您的邮箱
```

### 步骤 2: 配置环境变量

编辑 `.env` 文件，设置 NEXTAUTH_URL 为 HTTPS 地址：

```bash
NEXTAUTH_URL=https://www.deepmedsearch.cloud
```

### 步骤 3: 启动服务

```bash
# 创建配置目录
mkdir -p traefik/dynamic

# 启动所有服务
docker compose up -d

# 查看 Traefik 日志
docker compose logs -f traefik
```

### 步骤 4: 验证证书

等待 1-2 分钟后访问：

```
https://www.deepmedsearch.cloud
```

---

## 🔍 故障排查

### 证书获取失败？

1. **检查 DNS**:
   ```bash
   dig www.deepmedsearch.cloud +short
   ```
   确保解析到正确的服务器 IP

2. **检查端口**:
   ```bash
   # 确保端口 80 和 443 未被占用
   sudo lsof -i :80
   sudo lsof -i :443
   ```

3. **检查防火墙**:
   ```bash
   # Ubuntu/Debian (ufw)
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   
   # CentOS/RHEL (firewalld)
   sudo firewall-cmd --permanent --add-port=80/tcp
   sudo firewall-cmd --permanent --add-port=443/tcp
   sudo firewall-cmd --reload
   ```

4. **查看日志**:
   ```bash
   docker compose logs traefik | grep -i error
   docker compose logs traefik | grep -i acme
   ```

### 证书显示不安全？

首次获取证书可能需要 1-2 分钟，请稍等后刷新页面。

---

## 🔐 启用仪表板认证（推荐）

### 1. 生成密码

```bash
# 安装 htpasswd (如未安装)
sudo apt-get install apache2-utils

# 生成密码（用户名: admin）
htpasswd -nb admin your_password
```

### 2. 添加到配置

编辑 `docker-compose.yml`，在 `traefik` 服务的 `labels` 中取消注释并添加：

```yaml
- "traefik.http.routers.traefik.middlewares=auth"
- "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."  # 粘贴上面生成的密码
```

⚠️ **注意**: 在 docker-compose.yml 中，`$` 符号需要写成 `$$`

### 3. 重启服务

```bash
docker compose up -d traefik
```

现在访问 `https://www.deepmedsearch.cloud/dashboard/` 需要输入用户名和密码。

---

## 📚 更多信息

详细配置说明请查看: [TRAEFIK_SSL_SETUP.md](./TRAEFIK_SSL_SETUP.md)

---

## 🆘 需要帮助？

- 检查日志: `docker compose logs traefik`
- 查看状态: `docker compose ps`
- 重启服务: `docker compose restart traefik`

---

## 🎯 配置文件

- `traefik/traefik.yml` - Traefik 主配置
- `traefik/dynamic/tls.yml` - TLS 设置
- `docker-compose.yml` - 服务配置

