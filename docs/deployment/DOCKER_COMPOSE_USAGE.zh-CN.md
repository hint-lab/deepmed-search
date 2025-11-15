# Docker Compose 使用快速指南

## 📦 两种配置选择

DeepMed Search 提供两个配置文件，根据您的服务器条件选择：

### 🚀 完整版 `docker-compose.yml`
- **需要**: GPU 服务器
- **包含**: 所有功能（含 MinerU 高级解析）
- **适用**: 生产环境

### 💡 Demo 版 `docker-compose.demo.yml`  
- **需要**: 普通服务器（无 GPU 要求）
- **包含**: 核心功能（仅 Markitdown 解析）
- **适用**: 演示/开发/测试

---

## 🎯 快速开始

### 如果您有 GPU

```bash
# 使用完整版（默认）
docker compose up -d
```

### 如果您没有 GPU

```bash
# 使用 Demo 版
docker compose -f docker-compose.demo.yml up -d
```

就是这么简单！🎉

---

## 📚 常用命令

### 启动服务

```bash
# 完整版
docker compose up -d

# Demo 版
docker compose -f docker-compose.demo.yml up -d

# 查看日志
docker compose logs -f app
```

### 停止服务

```bash
# 完整版
docker compose down

# Demo 版
docker compose -f docker-compose.demo.yml down

# 停止并删除数据卷（慎用！）
docker compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart app
```

### 查看状态

```bash
# 查看运行状态
docker compose ps

# 查看资源使用
docker stats
```

### 更新服务

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build
```

---

## 🔄 切换配置

### 从完整版切换到 Demo 版

```bash
# 1. 停止完整版
docker compose down

# 2. 启动 Demo 版
docker compose -f docker-compose.demo.yml up -d
```

### 从 Demo 版切换到完整版

```bash
# 1. 停止 Demo 版
docker compose -f docker-compose.demo.yml down

# 2. 启动完整版
docker compose up -d
```

**注意**: 切换配置不会丢失数据（数据卷保留）

---

## 🛠️ 高级用法

### 只启动特定服务

```bash
# 只启动数据库和应用
docker compose up -d postgres app
```

### 查看服务日志

```bash
# 查看所有日志
docker compose logs

# 实时跟踪日志
docker compose logs -f

# 查看特定服务日志
docker compose logs app

# 查看最近100行
docker compose logs --tail=100 app
```

### 进入容器

```bash
# 进入应用容器
docker compose exec app sh

# 进入数据库容器
docker compose exec postgres psql -U postgres deepmed
```

### 数据备份

```bash
# 备份数据库
docker compose exec postgres pg_dump -U postgres deepmed > backup.sql

# 恢复数据库
docker compose exec -T postgres psql -U postgres deepmed < backup.sql
```

---

## 🎨 环境配置

两个配置文件使用相同的 `.env` 文件：

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置
nano .env
```

### 关键配置项

```bash
# 数据库
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL=postgresql://postgres:password@postgres:5432/deepmed

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=<生成的密钥>

# 加密
ENCRYPTION_KEY=<生成的密钥>

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secret_key
```

---

## 💡 使用建议

### 开发环境

```bash
# 使用 Demo 版（更轻量）
docker compose -f docker-compose.demo.yml up -d

# 实时查看日志
docker compose -f docker-compose.demo.yml logs -f app
```

### 测试环境

```bash
# 使用 Demo 版快速测试
docker compose -f docker-compose.demo.yml up -d

# 测试完清理
docker compose -f docker-compose.demo.yml down -v
```

### 生产环境

```bash
# 使用完整版
docker compose up -d

# 启用自动重启
docker compose up -d --force-recreate
```

---

## 📊 配置对比

| 特性 | 完整版 | Demo 版 |
|------|-------|--------|
| MinerU 解析 | ✅ | ❌ |
| GPU 支持 | ✅ | ❌ |
| Markitdown | ✅ | ✅ |
| 其他服务 | ✅ | ✅ |
| 最低内存 | 16 GB | 8 GB |
| 最低CPU | 8 核 | 4 核 |

---

## 🚨 常见问题

### 端口冲突

```bash
# 检查端口占用
sudo lsof -i :3000

# 修改端口（在 .env 中）
APP_PORT=3001
```

### 服务无法启动

```bash
# 查看详细错误
docker compose logs app

# 检查配置
docker compose config

# 重新构建
docker compose build --no-cache app
```

### 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune

# 查看磁盘使用
docker system df
```

---

## 📚 相关文档

- [配置文件详细说明](./DOCKER_COMPOSE_VARIANTS.md)
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [CI/CD 配置](./CICD_SETUP.md)

---

**提示**: 首次部署建议使用 Demo 版熟悉系统，再根据需要切换到完整版。

