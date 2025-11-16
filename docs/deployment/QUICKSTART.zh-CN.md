# 🚀 快速部署指南

5-10 分钟快速部署 DeepMed Search 到服务器。

> **适用场景**：快速体验、演示环境、小规模部署

[English](./QUICKSTART.md) | [完整生产部署指南](./PRODUCTION.zh-CN.md) | [CI/CD 自动部署](./CICD.zh-CN.md)

## 📋 前置要求

- 一台 Linux 服务器（Ubuntu 20.04+ 推荐）
- Docker 和 Docker Compose
- 最少 2GB RAM，4GB+ 推荐
- 域名（可选，用于 HTTPS）

## 🎯 部署架构

**使用预构建镜像快速部署：**
- ✅ 无需编译，直接拉取镜像
- ✅ 节省服务器资源（2GB RAM 即可）
- ✅ 部署速度快（5-10 分钟）
- ✅ 使用 `docker-compose.demo.yml` 配置

## 📦 快速部署步骤

### 1. 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER

# 重新登录或运行
newgrp docker
```

### 2. 克隆项目

```bash
# 克隆仓库
git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search

# 切换到 demo 分支（使用预构建镜像）
git checkout demo-without-gpu
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**必需配置：**

```bash
# 数据库配置
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<生成强密码>
POSTGRES_DB=deepmed
DATABASE_URL=postgresql://postgres:<密码>@postgres:5432/deepmed

# NextAuth 配置
NEXTAUTH_URL=http://your-server-ip:3000  # 或 https://your-domain.com
NEXTAUTH_SECRET=<运行: openssl rand -base64 32>

# 加密密钥
ENCRYPTION_KEY=<运行: openssl rand -base64 32>

# MinIO 配置（可选，但推荐）
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<生成强密码>
MINIO_PUBLIC_URL=http://your-server-ip:3000  # 或 https://your-domain.com
```

**生成密钥命令：**

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 ENCRYPTION_KEY
openssl rand -base64 32

# 生成强密码
openssl rand -base64 16
```

### 4. 启动服务

```bash
# 拉取最新镜像
docker compose -f docker-compose.demo.yml pull

# 启动所有服务
docker compose -f docker-compose.demo.yml up -d

# 查看服务状态
docker compose -f docker-compose.demo.yml ps
```

### 5. 初始化数据库

```bash
# 运行数据库迁移（首次部署）
docker compose -f docker-compose.demo.yml exec --user root app sh -c "npx prisma db push --skip-generate --accept-data-loss"
```

### 6. 访问应用

🎉 部署完成！访问 `http://your-server-ip:3000`

**默认测试账号：**
- 邮箱：`test@example.com`
- 密码：`password123`

## 🔍 验证部署

### 检查服务状态

```bash
# 查看所有容器
docker compose -f docker-compose.demo.yml ps

# 应该看到以下服务正在运行：
# - app (Next.js 应用)
# - postgres (数据库)
# - redis (队列系统)
# - milvus (向量数据库)
# - minio (文件存储)
# - markitdown (文档解析)
# - queue-worker (后台任务)
```

### 查看日志

```bash
# 查看应用日志
docker compose -f docker-compose.demo.yml logs -f app

# 查看 Worker 日志
docker compose -f docker-compose.demo.yml logs -f queue-worker

# 查看所有日志
docker compose -f docker-compose.demo.yml logs --tail=50
```

### 测试功能

1. **登录系统**：访问 `/login` 使用测试账号登录
2. **配置 API Keys**：访问 `/settings/llm` 配置您的 LLM API Keys
3. **创建知识库**：访问 `/knowledgebase` 创建知识库并上传文档
4. **测试搜索**：在首页测试各种搜索功能

## 🔧 常用命令

```bash
# 查看服务状态
docker compose -f docker-compose.demo.yml ps

# 重启所有服务
docker compose -f docker-compose.demo.yml restart

# 重启特定服务
docker compose -f docker-compose.demo.yml restart app

# 停止所有服务
docker compose -f docker-compose.demo.yml stop

# 停止并删除容器（保留数据）
docker compose -f docker-compose.demo.yml down

# 查看日志
docker compose -f docker-compose.demo.yml logs -f [服务名]

# 更新服务（拉取最新镜像）
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d
```

## ⚙️ 服务访问地址

| 服务 | 地址 | 说明 |
|------|------|------|
| **应用** | `http://服务器IP:3000` | 主应用界面 |
| **PostgreSQL** | `localhost:5432` | 数据库（内部访问） |
| **Redis** | `localhost:6379` | 队列系统（内部访问） |
| **Milvus** | `localhost:19530` | 向量数据库（内部访问） |
| **MinIO Console** | `http://服务器IP:9001` | 文件存储管理界面 |
| **BullMQ Board** | `http://服务器IP:8003/admin/queues` | 队列监控面板 |

## 🌐 配置域名和 HTTPS（可选）

如需配置域名和 HTTPS，请参考：
- [SSL/HTTPS 快速配置](./SSL_QUICKSTART.md)
- [Traefik SSL 详细配置](./TRAEFIK_SSL_SETUP.md)

## 🔄 更新应用

```bash
cd /path/to/deepmed-search

# 拉取最新代码
git pull origin demo-without-gpu

# 拉取最新镜像
docker compose -f docker-compose.demo.yml pull

# 重启服务
docker compose -f docker-compose.demo.yml up -d

# 查看状态
docker compose -f docker-compose.demo.yml ps
```

## ❗ 常见问题

### 1. 端口被占用

```bash
# 检查端口占用
sudo lsof -i :3000
sudo lsof -i :80
sudo lsof -i :443

# 停止占用端口的服务
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### 2. 内存不足

```bash
# 停止不必要的服务
docker compose -f docker-compose.demo.yml stop attu bull-board

# 或清理不用的容器和镜像
docker system prune -a
```

### 3. 数据库连接失败

检查 `.env` 文件中的 `DATABASE_URL` 是否正确：
```bash
# 格式应为：
DATABASE_URL=postgresql://postgres:密码@postgres:5432/deepmed
```

### 4. 容器启动失败

```bash
# 查看详细日志
docker compose -f docker-compose.demo.yml logs [服务名]

# 重新创建容器
docker compose -f docker-compose.demo.yml up -d --force-recreate
```

## 📚 下一步

- [生产环境部署](./PRODUCTION.zh-CN.md) - 完整的生产环境配置
- [CI/CD 自动部署](./CICD.zh-CN.md) - GitHub Actions 自动化部署
- [分支策略](./BRANCHING_STRATEGY.md) - 了解开发和部署分支

## 🆘 获取帮助

遇到问题？

1. 查看 [故障排查指南](../troubleshooting/)
2. 检查 [完整文档](../README.md)
3. 提交 [GitHub Issue](https://github.com/hint-lab/deepmed-search/issues)
4. 发送邮件：wang-hao@shu.edu.cn

---

**部署愉快！** 🎉

