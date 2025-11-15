# 腾讯云容器镜像服务配置说明

本项目使用腾讯云容器镜像服务（TCR）来存储和分发 Docker 镜像。

## 📋 配置信息

- **镜像仓库地址**: `jpccr.ccs.tencentyun.com`
- **命名空间**: `deepmedsearch`
- **镜像列表**:
  - `jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search:latest` (主应用)
  - `jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search-worker:latest` (队列工作进程)
  - `jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-markitdown:latest` (文档解析服务)

## 🌿 部署架构

### 当前架构（简化版）

**GitHub 仓库**:
- 只有 `main` 分支

**服务器**:
- 只有 `main` 分支
- 使用 `docker-compose.demo.yml`（轻量配置）
- **使用腾讯云预构建镜像（无需本地编译）**

### 部署策略

**策略**: 使用腾讯云预构建镜像（服务器端不编译）

**配置文件**: `docker-compose.demo.yml`

**部署流程**:
```
开发者推送代码到 main 分支
    ↓
GitHub Actions 自动触发
    ↓
构建三个 Docker 镜像
    ↓
推送到腾讯云容器镜像服务
    ↓
SSH 连接到服务器
    ↓
拉取最新代码（main 分支）
    ↓
拉取最新镜像（从腾讯云）
    ↓
重启服务
    ↓
部署完成 ✅
```

**优势**:
- ✅ 服务器无需编译，节省内存和 CPU（适合小服务器）
- ✅ 部署速度快（只需拉取镜像）
- ✅ 国内访问腾讯云速度快
- ✅ 无需 GPU 支持（使用 Markitdown 解析文档）

**部署命令** (在服务器上手动部署):
```bash
cd /home/deploy/deepmed-search
git checkout main
git pull origin main
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d
```

**注意**：通常不需要手动部署，推送代码到 GitHub 会自动触发部署。

## 🔐 GitHub Secrets 配置

在 GitHub 仓库中需要配置以下 Secrets：

```
Settings → Secrets and variables → Actions → New repository secret
```

必需的 Secrets：

```bash
# 腾讯云容器镜像服务凭证
TENCENT_REGISTRY_USER=你的腾讯云账号ID
TENCENT_REGISTRY_PASSWORD=你的TCR访问密码

# 服务器 SSH 连接配置
SERVER_HOST=你的服务器IP地址
SERVER_USER=deploy
SERVER_PORT=22
SSH_PRIVATE_KEY=你的SSH私钥内容
```

### 获取腾讯云 TCR 凭证

1. 访问腾讯云容器镜像服务控制台：
   ```
   https://console.cloud.tencent.com/tcr
   ```

2. 进入「访问管理」→「访问凭证」

3. 生成临时登录密码或使用长期密码

4. 用户名通常是你的腾讯云账号 ID（一串数字）

## 🚀 GitHub Actions 工作流

工作流文件：`.github/workflows/deploy.yml`

### 工作流程

1. **build-and-push 任务**（两个分支都执行）:
   - 构建 `app`、`worker`、`markitdown` 三个镜像
   - 推送到腾讯云容器镜像服务
   - 使用 GitHub Actions 缓存加速构建

2. **deploy 任务**（根据分支不同）:
   - **demo-without-gpu 分支**: 
     - SSH 到服务器
     - 拉取最新配置
     - 执行 `docker compose pull` 拉取镜像
     - 执行 `docker compose up -d` 启动服务
   
   - **main 分支**:
     - SSH 到服务器
     - 拉取最新代码
     - 执行 `scripts/deploy.sh` 本地编译部署

### 触发方式

- **自动触发**: 推送代码到 `main` 或 `demo-without-gpu` 分支
- **手动触发**: GitHub Actions 页面 → Run workflow

## 🖥️ 服务器端配置

### 1. 登录腾讯云容器镜像服务

```bash
# SSH 到服务器
ssh deploy@your-server

# 登录腾讯云 TCR
docker login jpccr.ccs.tencentyun.com -u <你的账号ID> -p <你的TCR密码>
```

### 2. 克隆项目

```bash
cd /home/deploy
git clone https://github.com/your-org/deepmed-search.git
cd deepmed-search
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

### 4. 首次部署

**Demo 分支** (使用预构建镜像):
```bash
git checkout demo-without-gpu
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d
```

**Main 分支** (本地编译):
```bash
git checkout main
bash scripts/deploy.sh
```

## 📊 查看和管理

### 查看镜像

```bash
# 查看本地镜像
docker images | grep deepmedsearch

# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f app
```

### 手动拉取镜像

```bash
# 拉取指定版本
docker pull jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search:latest

# 拉取所有服务的镜像
docker compose -f docker-compose.demo.yml pull
```

### 清理旧镜像

```bash
# 清理未使用的镜像
docker image prune -f

# 查看磁盘使用
docker system df
```

## 🔧 常见问题

### 问题 1: 登录腾讯云 TCR 失败

```bash
# 确认凭证是否正确
docker login jpccr.ccs.tencentyun.com -u <用户名> -p <密码>

# 如果使用临时密码，确保密码未过期
```

### 问题 2: 拉取镜像失败

```bash
# 检查是否已登录
cat ~/.docker/config.json

# 手动拉取测试
docker pull jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search:latest

# 查看详细错误
docker pull jpccr.ccs.tencentyun.com/deepmedsearch/deepmed-search:latest --debug
```

### 问题 3: GitHub Actions 推送失败

检查 GitHub Secrets 配置：
- `TENCENT_REGISTRY_USER` 是否正确（通常是数字账号 ID）
- `TENCENT_REGISTRY_PASSWORD` 是否是 TCR 访问密码（不是腾讯云登录密码）

### 问题 4: 服务器内存不足

demo-without-gpu 分支使用预构建镜像，已经不需要在服务器编译了。如果还是内存不足：

```bash
# 停止不必要的服务
docker compose stop attu bull-board

# 或者调整服务内存限制
# 在 docker-compose.yml 中添加：
deploy:
  resources:
    limits:
      memory: 512M
```

## 📚 相关文档

- [CI/CD 自动化部署指南](./CICD_SETUP.md)
- [Docker Compose 使用指南](./DOCKER_COMPOSE_USAGE.zh-CN.md)
- [腾讯云容器镜像服务官方文档](https://cloud.tencent.com/document/product/1141)

## 📝 更新日志

- **2025-11-15**: 初始配置，使用腾讯云容器镜像服务
- **2025-11-15**: 配置双分支策略（demo 用镜像，main 用编译）

---

**维护者**: DeepMed Search Team  
**最后更新**: 2025-11-15

