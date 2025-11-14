# 文档解析器部署指南

## ⚡ 镜像加速配置（推荐）

**在国内环境下，强烈建议先配置镜像加速！**

```bash
# Linux 自动配置
sudo bash scripts/setup-docker-mirror.sh

# macOS/Windows 参考
# docker/MIRROR_SETUP.md
```

**效果**：构建速度提升 **5-10 倍**（1小时 → 10分钟）

详细文档：[docker/MIRROR_SETUP.md](docker/MIRROR_SETUP.md)

---

## 🚀 快速开始

### 方式 1：MarkItDown Docker（推荐 - 多格式文档）

适用于处理多种文档格式（PDF、DOCX、XLSX 等）

```bash
# 1. 启动 MarkItDown 服务
docker-compose up -d markitdown

# 2. 验证服务
curl http://localhost:5001/health

# 3. 配置环境变量（添加到 .env.local）
DOCUMENT_PARSER=markitdown-docker
MARKITDOWN_URL=http://localhost:5001

# 4. 重启应用
yarn dev

# ✅ 完成！现在上传文档会自动使用 MarkItDown 处理
```

### 方式 2：MinerU Docker（推荐 - 高质量 PDF）

适用于学术论文、医疗文档等需要高质量 PDF 解析的场景

```bash
# 1. 启动 MinerU 服务（CPU 版本）
docker-compose up -d mineru

# 2. 验证服务
curl http://localhost:8000/health

# 3. 配置环境变量（添加到 .env.local）
DOCUMENT_PARSER=mineru-docker
MINERU_URL=http://localhost:8000

# 4. 重启应用
yarn dev

# ✅ 完成！现在上传 PDF 会使用 MinerU 高质量解析
# 📖 参考：https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/
```

### 方式 3：MinerU Cloud（云端 - 需要付费）

适用于高并发场景，需要文件可通过公网访问

```bash
# 1. 使用 ngrok 暴露本地 MinIO（或使用公网 MinIO）
ngrok http 9000

# 2. 配置环境变量（添加到 .env.local）
DOCUMENT_PARSER=mineru-cloud
MINERU_API_KEY=your_api_key
MINIO_ENDPOINT=your-ngrok-url.ngrok.io
MINIO_USE_SSL=true

# 3. 重启应用
yarn dev
```

## 📊 方案对比

| 特性 | MarkItDown Docker | MinerU Docker | MinerU Cloud |
|------|------------------|---------------|--------------|
| 支持格式 | PDF, DOCX, XLSX, 图片等 | 仅 PDF | 仅 PDF |
| PDF 质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 处理速度 | ⚡⚡⚡⚡ | ⚡⚡ (CPU) / ⚡⚡⚡⚡ (GPU) | ⚡⚡⚡⚡⚡ |
| 部署难度 | ⭐⭐ | ⭐⭐⭐ (CPU) / ⭐⭐⭐⭐ (GPU) | ⭐ |
| 成本 | 免费 | 免费 | 付费 |
| 公网访问 | ❌ 不需要 | ❌ 不需要 | ✅ 需要 |
| GPU 需求 | ❌ | ⭕ 可选 | ❌ |
| 推荐场景 | 多格式文档 | 高质量 PDF | 高并发需求 |
| 参考文档 | - | [官方文档](https://opendatalab.github.io/MinerU/) | [API 文档](https://mineru.net/) |

## 🐳 Docker 服务管理

### 启动服务
```bash
docker-compose up -d markitdown
```

### 查看日志
```bash
docker-compose logs -f markitdown
```

### 重启服务
```bash
docker-compose restart markitdown
```

### 停止服务
```bash
docker-compose stop markitdown
```

### 重新构建
```bash
docker-compose build --no-cache markitdown
docker-compose up -d markitdown
```

## 🔧 环境变量配置

在 `.env.local` 中配置：

```env
# 文档解析器选择
# markitdown-docker（多格式）| mineru-docker（高质量PDF）| mineru-cloud（云端）
DOCUMENT_PARSER=markitdown-docker

# MarkItDown Docker 配置
MARKITDOWN_URL=http://localhost:5001
MARKITDOWN_PORT=5001

# MinerU Docker 配置（本地自托管）
MINERU_URL=http://localhost:8000
MINERU_DOCKER_PORT=8000

# MinerU Cloud 配置（云端服务）
MINERU_API_KEY=your_api_key
MINERU_BASE_URL=https://mineru.net/api

# MinIO 配置（MinerU Cloud 需要公网访问）
MINIO_ENDPOINT=localhost:9000  # 或 your-ngrok-url.ngrok.io
MINIO_USE_SSL=false  # ngrok 使用 true
```

## ✅ 健康检查

### 检查 Docker 服务

```bash
# 检查服务状态
curl http://localhost:5001/health

# 查看支持的格式
curl http://localhost:5001/formats

# 测试转换
curl -F "file=@/path/to/test.pdf" http://localhost:5001/convert
```

### 检查本地 Python

```bash
# 检查 Python
python3 --version

# 检查 MarkItDown
python3 -c "import markitdown; print(markitdown.__version__)"

# 运行测试脚本
npx tsx src/scripts/test-markitdown.ts /path/to/test.pdf
```

## 🎯 支持的文件格式

MarkItDown 支持：
- **文档**: PDF, DOCX, DOC, PPTX, PPT, XLSX, XLS
- **文本**: TXT, MD, HTML, CSV, JSON, XML
- **图片**: JPG, PNG, GIF, BMP（带 OCR）
- **音频**: MP3, WAV, M4A
- **其他**: ZIP, EPUB

## 📝 API 接口（Docker 版本）

### 健康检查
```bash
GET http://localhost:5001/health
```

### 转换文档
```bash
POST http://localhost:5001/convert
Content-Type: multipart/form-data

FormData:
  file: <binary>
```

### 支持的格式列表
```bash
GET http://localhost:5001/formats
```

## 🐛 故障排查

### Docker 服务无法访问

```bash
# 1. 检查容器状态
docker ps | grep markitdown

# 2. 查看日志
docker-compose logs markitdown

# 3. 检查端口
lsof -i :5001

# 4. 重启服务
docker-compose restart markitdown
```

### 本地 Python 找不到

```bash
# 1. 查找 Python
which python3
which python

# 2. 配置正确的路径
export MARKITDOWN_PYTHON_PATH=/usr/bin/python3

# 3. 安装 MarkItDown
pip3 install 'markitdown[all]'
```

### MinerU 转换失败

```bash
# 1. 检查 API Key
echo $MINERU_API_KEY

# 2. 检查文件 URL 是否可访问
curl -I "YOUR_FILE_URL"

# 3. 使用 ngrok 暴露本地服务
ngrok http 9000
```

## 📚 更多文档

- **统一接口**: `src/lib/document-parser/README.md`
- **MarkItDown**: `src/lib/markitdown/README.md`
- **MinerU 限制**: `src/lib/mineru/LIMITATIONS.md`

## 💡 推荐配置

### 开发环境（通用文档）
```env
DOCUMENT_PARSER=markitdown-docker
```

### 生产环境（医疗/学术 PDF）
```env
# 使用 MinerU Docker（CPU 版本）
DOCUMENT_PARSER=mineru-docker
MINERU_URL=http://localhost:8000

# 或者使用 GPU 版本（需要修改 docker-compose.yml）
# 参考：docker/mineru/README.md
```

### 生产环境（高并发）
```env
# 使用 MinerU Cloud
DOCUMENT_PARSER=mineru-cloud
MINERU_API_KEY=your_key
# 配合公网可访问的 MinIO
```

### 混合场景（多格式 + 高质量 PDF）
```bash
# 同时启动两个服务
docker-compose up -d markitdown mineru

# 在应用中根据文件类型动态选择
# PDF -> mineru-docker
# 其他 -> markitdown-docker
```

## 🔄 动态切换

可以在运行时通过环境变量切换解析器：

```bash
# 使用 Docker MarkItDown
DOCUMENT_PARSER=markitdown-docker yarn dev

# 使用本地 MarkItDown
DOCUMENT_PARSER=markitdown-local yarn dev

# 使用 MinerU
DOCUMENT_PARSER=mineru yarn dev
```

## 📞 需要帮助？

查看详细文档：
```bash
# 统一文档解析器
cat src/lib/document-parser/README.md

# MarkItDown 详细指南
cat src/lib/markitdown/README.md

# MinerU 使用限制
cat src/lib/mineru/LIMITATIONS.md
```

