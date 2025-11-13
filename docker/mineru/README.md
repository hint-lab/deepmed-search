# MinerU Docker 部署

基于 [MinerU 官方文档](https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/) 的 Docker 部署方案。

## 🚀 快速开始

### 方式 1：CPU 版本（推荐 - 无需 GPU）

```bash
# 使用 CPU 版本（默认）
docker-compose up -d mineru

# 查看日志
docker-compose logs -f mineru

# 检查服务状态
curl http://localhost:8000/health
```

### 方式 2：GPU 版本（需要 NVIDIA GPU）

```bash
# 1. 修改 docker-compose.yml
# 将 dockerfile: Dockerfile.cpu 改为 dockerfile: Dockerfile
# 并取消注释 deploy 部分的 GPU 配置

# 2. 启动服务
docker-compose up -d mineru

# 3. 检查 GPU 使用
docker exec -it deepmed-mineru nvidia-smi
```

### 方式 3：手动构建和运行

```bash
cd docker/mineru

# CPU 版本
docker build -f Dockerfile.cpu -t deepmed-mineru:cpu .
docker run -d --name deepmed-mineru -p 8000:8000 deepmed-mineru:cpu

# GPU 版本
docker build -f Dockerfile -t deepmed-mineru:gpu .
docker run -d --gpus all --name deepmed-mineru -p 8000:8000 deepmed-mineru:gpu

# 检查服务
curl http://localhost:8000/health
```

## 📖 API 接口

### 健康检查

```bash
GET http://localhost:8000/health

响应:
{
  "status": "healthy",
  "service": "mineru-docker",
  "version": "self-hosted",
  "timestamp": 1234567890
}
```

### 转换文档

```bash
POST http://localhost:8000/v4/extract/task
Content-Type: multipart/form-data

FormData:
  file: <binary>

响应:
{
  "code": "success",
  "message": "Task completed successfully",
  "data": {
    "taskId": "task_1234567890",
    "status": "completed",
    "extracted": "markdown content...",
    "pages": [
      {
        "pageNum": 1,
        "content": "...",
        "tokens": 100
      }
    ],
    "metadata": {
      "processingTime": 5000,
      "fileName": "document.pdf",
      "pageCount": 10,
      "backend": "magic-pdf"
    }
  }
}
```

### 支持的格式

```bash
GET http://localhost:8000/formats

响应:
{
  "formats": ["pdf"],
  "max_file_size": 209715200,
  "max_file_size_mb": 200,
  "backend": "magic-pdf"
}
```

### 服务信息

```bash
GET http://localhost:8000/info

响应:
{
  "service": "MinerU Docker (Self-hosted)",
  "version": "0.x.x",
  "backend": "magic-pdf",
  "supported_formats": ["pdf"],
  "device_mode": "cpu"
}
```

## 🔧 配置说明

### 环境变量

在 `docker-compose.yml` 或 `.env.local` 中配置：

```env
# MinerU Docker 端口
MINERU_DOCKER_PORT=8000

# MinerU Docker URL（应用中使用）
MINERU_URL=http://localhost:8000
```

### Docker Compose 配置

```yaml
mineru:
  build:
    context: ./docker/mineru
    dockerfile: Dockerfile
  container_name: deepmed-mineru
  restart: always
  ports:
    - "${MINERU_DOCKER_PORT:-8000}:8000"
  environment:
    PORT: 8000
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
```

## ⚡ 性能说明

### CPU 模式（默认）
- **优点**: 无需 GPU，部署简单
- **缺点**: 处理速度较慢
- **适用**: 开发环境、小规模使用

### GPU 模式（可选）
如需 GPU 加速，参考官方文档配置：
https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/

需要：
- Turing 及以后架构的显卡
- 可用显存 ≥ 8GB
- CUDA 12.8 或更高版本

修改 `docker-compose.yml`:

```yaml
mineru:
  # ... 其他配置
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

## 🧪 测试

### 使用 curl 测试

```bash
# 健康检查
curl http://localhost:8000/health

# 上传 PDF 转换
curl -X POST http://localhost:8000/v4/extract/task \
  -F "file=@/path/to/test.pdf"

# 查看支持的格式
curl http://localhost:8000/formats

# 查看服务信息
curl http://localhost:8000/info
```

### 在应用中使用

配置环境变量：

```env
# .env.local
DOCUMENT_PARSER=mineru-docker
MINERU_URL=http://localhost:8000
```

然后上传文档会自动使用 MinerU Docker 处理。

## 📊 与 MinerU Cloud 对比

| 特性 | MinerU Docker | MinerU Cloud |
|------|--------------|--------------|
| 部署 | 自托管 | 云服务 |
| 成本 | 免费 | 付费 |
| 速度 | 中等（CPU）/ 快（GPU） | 快 |
| 质量 | 高 | 高 |
| 文件访问 | 本地文件 | 需要公网 URL |
| 推荐场景 | 开发/生产环境 | 高并发需求 |

## 🐛 故障排查

### 容器启动失败

```bash
# 查看日志
docker-compose logs mineru

# 检查端口占用
lsof -i :8000

# 重新构建
docker-compose build --no-cache mineru
docker-compose up -d mineru
```

### 转换失败

```bash
# 检查服务状态
curl http://localhost:8000/health

# 查看实时日志
docker-compose logs -f mineru

# 手动测试
docker exec -it deepmed-mineru bash
magic-pdf -p /path/to/test.pdf -o /tmp/output -m auto
```

### 内存不足

MinerU 处理大文件可能需要较多内存，可以调整 Docker 内存限制：

```yaml
mineru:
  # ... 其他配置
  deploy:
    resources:
      limits:
        memory: 4G  # 根据需要调整
```

## 📚 更多资源

- **MinerU 官方文档**: https://opendatalab.github.io/MinerU/
- **Docker 部署指南**: https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/
- **GitHub 仓库**: https://github.com/opendatalab/MinerU

## 🔄 升级

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build --no-cache mineru

# 重启服务
docker-compose up -d mineru
```

## 💡 提示

1. **首次启动较慢**: MinerU 需要下载模型文件，首次启动可能需要几分钟
2. **文件大小限制**: 默认最大 200MB，可在 `api_server.py` 中修改
3. **超时设置**: 大文件处理时间较长，超时时间为 5 分钟
4. **并发处理**: 单线程处理，高并发场景建议使用多个实例或 MinerU Cloud

