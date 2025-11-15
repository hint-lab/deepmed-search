# Docker Compose 配置文件说明

DeepMed Search 提供两个 Docker Compose 配置文件，适用于不同的部署场景。

## 📋 配置文件对比

| 配置文件 | 适用场景 | MinerU | GPU | 文档解析能力 |
|---------|---------|--------|-----|------------|
| `docker-compose.yml` | 生产环境 | ✅ | 需要 | 完整（支持复杂 PDF） |
| `docker-compose.demo.yml` | 演示/开发 | ❌ | 不需要 | 基础（简单文档） |

## 🎯 选择指南

### 使用完整版 (`docker-compose.yml`)

**适用于：**
- ✅ 有 GPU 服务器（NVIDIA）
- ✅ 需要处理复杂 PDF（含表格、公式）
- ✅ 生产环境部署
- ✅ 需要最佳文档解析质量

**服务列表：**
```
✓ PostgreSQL      # 数据库
✓ Redis          # 缓存/队列
✓ MinIO          # 对象存储
✓ Milvus         # 向量数据库
✓ Traefik        # 反向代理
✓ App            # 主应用
✓ Queue Worker   # 队列处理
✓ Markitdown     # 基础解析
✓ MinerU         # 高级解析 (需要 GPU)
✓ Attu           # Milvus 管理
✓ RedisInsight   # Redis 管理
✓ BullMQ Board   # 队列监控
```

### 使用 Demo 版 (`docker-compose.demo.yml`)

**适用于：**
- ✅ 无 GPU 服务器
- ✅ 演示和测试
- ✅ 本地开发
- ✅ 简单文档处理需求

**服务列表：**
```
✓ PostgreSQL      # 数据库
✓ Redis          # 缓存/队列
✓ MinIO          # 对象存储
✓ Milvus         # 向量数据库
✓ Traefik        # 反向代理
✓ App            # 主应用
✓ Queue Worker   # 队列处理
✓ Markitdown     # 基础解析
✗ MinerU         # 移除
✓ Attu           # Milvus 管理
✓ BullMQ Board   # 队列监控
```

## 🚀 使用方法

### 启动完整版

```bash
# 默认使用 docker-compose.yml
docker compose up -d

# 或显式指定
docker compose -f docker-compose.yml up -d
```

### 启动 Demo 版

```bash
# 指定 demo 配置文件
docker compose -f docker-compose.demo.yml up -d
```

### 切换配置

```bash
# 停止当前配置
docker compose down

# 启动新配置
docker compose -f docker-compose.demo.yml up -d
```

## ⚙️ 环境变量配置

两个配置文件使用相同的 `.env` 文件，主要区别：

### 完整版需要额外配置

```bash
# MinerU 相关配置
MINERU_URL=http://mineru:8000
MINERU_DOCKER_PORT=8000
MINERU_BACKEND=pipeline
```

### Demo 版可忽略

```bash
# Demo 版不需要配置这些
# MINERU_URL=...
# MINERU_API_KEY=...
```

## 🔧 修改和定制

### 创建自定义配置

```bash
# 基于 demo 版创建自定义配置
cp docker-compose.demo.yml docker-compose.custom.yml

# 编辑自定义配置
nano docker-compose.custom.yml

# 使用自定义配置
docker compose -f docker-compose.custom.yml up -d
```

### 常见定制场景

#### 1. 只启动核心服务

```yaml
# docker-compose.minimal.yml
services:
  postgres:
    # ... 完整配置 ...
  
  redis:
    # ... 完整配置 ...
  
  app:
    # ... 完整配置 ...
    depends_on:
      - postgres
      - redis
```

#### 2. 添加额外的监控服务

```yaml
# 在任意配置文件中添加
services:
  # ... 现有服务 ...
  
  prometheus:
    image: prom/prometheus
    # ... 配置 ...
  
  grafana:
    image: grafana/grafana
    # ... 配置 ...
```

## 📊 性能和资源对比

### 完整版资源需求

```
最低配置：
- CPU: 8 核
- RAM: 16 GB
- GPU: NVIDIA (8GB+ 显存)
- 磁盘: 100 GB

推荐配置：
- CPU: 16 核
- RAM: 32 GB
- GPU: NVIDIA (16GB+ 显存)
- 磁盘: 500 GB SSD
```

### Demo 版资源需求

```
最低配置：
- CPU: 4 核
- RAM: 8 GB
- GPU: 不需要
- 磁盘: 50 GB

推荐配置：
- CPU: 8 核
- RAM: 16 GB
- GPU: 不需要
- 磁盘: 100 GB SSD
```

## 🔄 CI/CD 集成

### GitHub Actions 配置

在 `.github/workflows/deploy.yml` 中：

```yaml
# 完整版部署
- name: Deploy Full Version
  run: |
    docker compose -f docker-compose.yml up -d

# Demo 版部署
- name: Deploy Demo Version
  run: |
    docker compose -f docker-compose.demo.yml up -d
```

### 部署脚本支持

修改 `scripts/deploy.sh`：

```bash
# 支持指定配置文件
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

docker compose -f "$COMPOSE_FILE" down
docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d
```

使用：

```bash
# 部署完整版
bash scripts/deploy.sh

# 部署 Demo 版
COMPOSE_FILE=docker-compose.demo.yml bash scripts/deploy.sh
```

## 📝 最佳实践

### 1. 开发环境

```bash
# 使用 demo 版进行开发
docker compose -f docker-compose.demo.yml up -d

# 实时查看日志
docker compose -f docker-compose.demo.yml logs -f app
```

### 2. 测试环境

```bash
# 使用 demo 版进行功能测试
docker compose -f docker-compose.demo.yml up -d

# 测试完成后清理
docker compose -f docker-compose.demo.yml down -v
```

### 3. 生产环境

```bash
# 使用完整版
docker compose up -d

# 定期备份
docker compose exec postgres pg_dump -U postgres deepmed > backup.sql
```

## 🚨 注意事项

### 数据兼容性

- ✅ 两个配置可以共享数据卷
- ✅ 可以在配置间切换而不丢失数据
- ⚠️ 切换前建议备份数据

### 服务依赖

- Demo 版移除了 MinerU
- Queue Worker 和 App 会自动适配
- 用户可在设置中选择可用的解析器

### 端口冲突

- 两个配置不能同时运行（端口冲突）
- 切换前必须先停止当前配置

## 📚 相关文档

- [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- [CI/CD 配置](./CICD_SETUP.md)
- [SSL 配置](./SSL_QUICKSTART.md)

---

**最后更新**: 2024-11-15

