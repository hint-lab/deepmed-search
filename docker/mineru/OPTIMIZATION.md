# MinerU Docker 优化说明

## 🚀 优化内容

### 模型常驻内存

**优化前（CLI 模式）**：
```python
# 每次请求都重新加载模型
subprocess.run(["mineru", "-p", "file.pdf", ...])
# ❌ 每次加载: 10-30秒
# ❌ 处理文档: 5秒
# ⏱️ 总耗时: 15-35秒
```

**优化后（Python API 模式）**：
```python
# 服务启动时加载模型（一次性）
from magic_pdf.pipe.UNIPipe import UNIPipe

# 后续请求直接使用已加载的模型
pipe = UNIPipe(pdf_bytes, ...)  # ✅ 模型已在内存，秒启动
pipe.pipe_parse()
# ✅ 首次加载: 10-30秒（服务启动时）
# ✅ 后续请求: 5秒（快3-6倍）
```

## 📊 性能对比

| 场景 | CLI 模式 | Python API 模式 | 性能提升 |
|------|---------|----------------|---------|
| 首次请求 | 15-35秒 | 15-35秒 | 相同 |
| 第2次请求 | 15-35秒 | **5秒** | **3-7倍** ⚡ |
| 第10次请求 | 15-35秒 | **5秒** | **3-7倍** ⚡ |
| 内存占用 | 低（按需） | 中（常驻2-4GB） | - |

## 🔧 实现细节

### 1. 启动时预热模型

```python
@app.on_event("startup")
async def warmup_model():
    """服务启动时预加载 MinerU 模型"""
    from magic_pdf.pipe.UNIPipe import UNIPipe
    # 导入模块会触发模型初始化
    logger.info("✅ Models loaded and ready")
```

### 2. 使用 Python API 处理

```python
def _process_pdf_with_python_api(pdf_path, output_dir):
    # 使用 DiskReaderWriter 处理输出
    image_writer = DiskReaderWriter(output_dir)
    
    # 创建 UNIPipe 实例（复用已加载的模型）
    pipe = UNIPipe(pdf_bytes, {"_pdf_type": ""}, image_writer)
    
    # 执行处理流程
    pipe.pipe_classify()  # 分类
    pipe.pipe_analyze()   # 分析
    pipe.pipe_parse()     # 解析
    md_content = pipe.pipe_mk_markdown(output_dir)  # 生成 Markdown
    
    return md_content
```

### 3. 降级方案

如果 Python API 不可用或失败，自动降级到 CLI 模式：

```python
try:
    md_path = _process_pdf_with_python_api(pdf_path, output_dir)
    backend_used = "python-api-persistent"  # 快速模式
except Exception:
    md_path = _process_pdf_with_cli(pdf_path, output_dir)
    backend_used = "cli-fallback"  # 降级模式
```

## 📝 配置说明

### Docker Compose 配置

```yaml
mineru:
  build:
    context: ./docker/mineru
    dockerfile: Dockerfile
  environment:
    PORT: 8000
    MINERU_MODEL_SOURCE: local
    UVICORN_WORKERS: 1  # 单 worker 确保模型只加载一次
  deploy:
    resources:
      limits:
        memory: 8G  # 模型需要 2-4GB，建议预留充足内存
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `MINERU_MODEL_SOURCE` | `local` | 模型来源（local/modelscope） |
| `UVICORN_WORKERS` | `1` | Worker 数量（建议 1，多实例部署） |
| `APP_ENV` | `production` | 运行环境 |
| `MINERU_TIMEOUT_SECONDS` | `300` | CLI 模式超时时间 |

## 🎯 使用建议

### 单机部署

```yaml
# 单容器，单 worker（推荐）
mineru:
  environment:
    UVICORN_WORKERS: 1
  deploy:
    resources:
      limits:
        memory: 8G
```

### 高并发部署

```yaml
# 多容器实例 + 负载均衡（推荐）
mineru:
  deploy:
    replicas: 3  # 3个容器实例
    resources:
      limits:
        memory: 8G
  environment:
    UVICORN_WORKERS: 1  # 每个容器 1 worker
```

**注意**：不推荐多 worker，因为每个 worker 都会加载一份模型（2-4GB），内存占用成倍增加。

## 🔍 监控

### 查看模型状态

```bash
# 健康检查（包含模型状态）
curl http://localhost:8000/health

# 响应示例
{
  "status": "healthy",
  "api_mode": "python-api",          # Python API 模式
  "model_persistent": true,          # 模型常驻内存
  "model_warmed_up": true,           # 模型已预热
  "service": "mineru-optimized"
}
```

### 查看日志

```bash
# 查看启动日志（模型加载）
docker-compose logs mineru | grep -A 10 "Starting model warmup"

# 输出示例
🔥 Starting model warmup...
Warming up MinerU models (this may take 10-30 seconds)...
✅ Model warmup completed in 15.32s
📊 Models are now resident in memory
⚡ Subsequent requests will be much faster!

# 查看处理日志（每个请求）
docker-compose logs -f mineru | grep "Processing with Python API"

# 输出示例
📄 Processing with Python API (persistent model): document.pdf
✅ Python API processing completed in 4.8s (model reused)
```

## 🐛 故障排查

### 1. Python API 不可用

**症状**：
```
⚠️  Python API not available, skipping model warmup
```

**原因**：MinerU Python 模块导入失败

**解决**：
```bash
# 重新构建镜像
docker-compose build --no-cache mineru

# 检查 MinerU 安装
docker exec deepmed-mineru python3 -c "from magic_pdf.pipe.UNIPipe import UNIPipe; print('OK')"
```

### 2. 内存不足

**症状**：
```
❌ Model warmup failed: Out of memory
```

**解决**：
```yaml
# 增加内存限制
mineru:
  deploy:
    resources:
      limits:
        memory: 12G  # 增加到 12GB
```

### 3. 首次请求仍然慢

**症状**：首次请求耗时 15-30 秒

**说明**：这是正常的，模型在服务启动时预热，首次请求会触发完整的初始化。后续请求会快很多。

**验证优化效果**：
```bash
# 测试首次请求
time curl -X POST -F "file=@test.pdf" http://localhost:8000/v4/extract/task

# 测试第二次请求（应该快很多）
time curl -X POST -F "file=@test.pdf" http://localhost:8000/v4/extract/task
```

## 📈 性能测试

### 测试脚本

```bash
#!/bin/bash
# test_performance.sh

PDF_FILE="test.pdf"
URL="http://localhost:8000/v4/extract/task"

echo "Testing MinerU optimization..."
echo "=============================="

for i in {1..5}; do
  echo "Request $i:"
  time curl -X POST -F "file=@$PDF_FILE" $URL -s -o /dev/null
  echo ""
done
```

### 预期结果

```
Request 1: 15.2s (首次加载模型)
Request 2: 4.8s  (复用模型，快 3.2x)
Request 3: 5.1s  (复用模型，快 3.0x)
Request 4: 4.9s  (复用模型，快 3.1x)
Request 5: 5.0s  (复用模型，快 3.0x)
```

## 💡 最佳实践

1. **单 Worker**：每个容器使用 1 个 worker，避免重复加载模型
2. **充足内存**：预留 8-12GB 内存给容器
3. **多实例**：高并发场景使用多个容器实例 + 负载均衡
4. **监控内存**：使用 `docker stats` 监控内存使用
5. **健康检查**：定期检查 `/health` 端点确认模型状态

## 🔗 相关链接

- [MinerU 官方文档](https://opendatalab.github.io/MinerU/)
- [MinerU Python API](https://github.com/opendatalab/MinerU)
- [Docker 部署指南](https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/)

