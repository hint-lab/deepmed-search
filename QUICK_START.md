# DeepMed Search - 文档解析器快速开始

## 📦 支持的三种解析方案

| 方案 | 适用场景 | 部署 | 参考 |
|------|---------|------|------|
| **MarkItDown Docker** | 多格式文档（PDF、DOCX、XLSX 等） | ⭐⭐ 简单 | - |
| **MinerU Docker** | 高质量 PDF（学术论文、医疗文档） | ⭐⭐⭐ 中等 | [官方文档](https://opendatalab.github.io/MinerU/) |
| **MinerU Cloud** | 高并发场景（需要付费） | ⭐ 最简单 | [API 文档](https://mineru.net/) |

---

## 🚀 最快开始（5 分钟）

### 步骤 0：配置镜像加速（推荐，首次构建）

如果在国内，强烈推荐先配置 Docker 镜像加速：

```bash
# 自动配置（Linux）
sudo bash scripts/setup-docker-mirror.sh

# 或手动配置（所有平台）
# 参考：docker/MIRROR_SETUP.md
```

> ⚡ 配置后构建速度可提升 **5-10 倍**（从 1 小时降到 10 分钟）！

### 步骤 1：启动 Docker 服务

```bash
# 启动 MarkItDown（多格式文档）
docker-compose up -d markitdown

# 或启动 MinerU（高质量 PDF）
docker-compose up -d mineru

# 或同时启动两个
docker-compose up -d markitdown mineru
```

### 步骤 2：配置环境变量

创建或编辑 `.env.local` 文件：

```bash
# 选择一个解析器
DOCUMENT_PARSER=markitdown-docker    # 多格式文档
# 或
# DOCUMENT_PARSER=mineru-docker      # 高质量 PDF

# 对应的配置
MARKITDOWN_URL=http://localhost:5001
MINERU_DOCKER_URL=http://localhost:8000
```

### 步骤 3：启动应用

```bash
yarn dev
```

### 步骤 4：测试

```bash
# 检查服务状态
curl http://localhost:5001/health  # MarkItDown
curl http://localhost:8000/health  # MinerU

# 上传文档测试
# 访问 http://localhost:3000 并上传文档
```

---

## 📋 详细配置

### 方案 A：MarkItDown Docker（推荐 - 日常使用）

**优势**：
- ✅ 支持多种格式（PDF、DOCX、XLSX、PPT、图片等）
- ✅ 部署简单，无需 GPU
- ✅ 处理速度快
- ✅ 完全免费

**步骤**：

```bash
# 1. 启动服务
docker-compose up -d markitdown

# 2. 配置 .env.local
cat >> .env.local << EOF
DOCUMENT_PARSER=markitdown-docker
MARKITDOWN_URL=http://localhost:5001
MARKITDOWN_PORT=5001
EOF

# 3. 测试
curl http://localhost:5001/health
curl -F "file=@test.pdf" http://localhost:5001/convert

# 4. 启动应用
yarn dev
```

---

### 方案 B：MinerU Docker（推荐 - 学术/医疗文档）

**优势**：
- ✅ PDF 解析质量最高
- ✅ 保留文档结构和格式
- ✅ 支持表格、公式识别
- ✅ 完全免费，本地部署

**适用**：学术论文、医疗报告、复杂 PDF

**步骤（CPU 版本）**：

```bash
# 1. 启动服务（默认 CPU 版本）
docker-compose up -d mineru

# 2. 配置 .env.local
cat >> .env.local << EOF
DOCUMENT_PARSER=mineru-docker
MINERU_DOCKER_URL=http://localhost:8000
MINERU_DOCKER_PORT=8000
EOF

# 3. 查看日志（首次启动会下载模型，需要几分钟）
docker-compose logs -f mineru

# 4. 测试
curl http://localhost:8000/health
curl -F "file=@test.pdf" http://localhost:8000/v4/extract/task

# 5. 启动应用
yarn dev
```

**步骤（GPU 版本 - 可选）**：

```bash
# 1. 修改 docker-compose.yml
# 将 dockerfile: Dockerfile.cpu 改为 dockerfile: Dockerfile
# 取消注释 deploy 部分的 GPU 配置

# 2. 启动服务
docker-compose build mineru
docker-compose up -d mineru

# 3. 检查 GPU
docker exec -it deepmed-mineru nvidia-smi

# 4. 其他步骤同上
```

**参考文档**：
- [MinerU 官方文档](https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/)
- [本地部署指南](docker/mineru/README.md)

---

### 方案 C：MinerU Cloud（云端服务）

**优势**：
- ✅ 无需本地部署
- ✅ 处理速度最快
- ✅ PDF 质量最高

**缺点**：
- ❌ 需要付费
- ❌ 文件必须公网可访问

**步骤**：

```bash
# 1. 获取 API Key
# 访问 https://mineru.net/ 注册并获取 API Key

# 2. 配置公网访问（使用 ngrok）
ngrok http 9000

# 3. 配置 .env.local
cat >> .env.local << EOF
DOCUMENT_PARSER=mineru-cloud
MINERU_API_KEY=your_api_key_here
MINERU_BASE_URL=https://mineru.net/api
MINIO_ENDPOINT=xxxx.ngrok.io  # 你的 ngrok 地址
MINIO_USE_SSL=true
EOF

# 4. 启动应用
yarn dev
```

---

## 🔄 混合使用（最佳实践）

同时启动两个服务，根据文件类型智能选择：

```bash
# 1. 启动两个服务
docker-compose up -d markitdown mineru

# 2. 配置环境变量
cat >> .env.local << EOF
# 默认使用 MarkItDown
DOCUMENT_PARSER=markitdown-docker
MARKITDOWN_URL=http://localhost:5001

# 同时配置 MinerU（可在代码中根据需要切换）
MINERU_DOCKER_URL=http://localhost:8000
EOF

# 3. 在代码中动态选择
# - PDF 文档 -> mineru-docker（高质量）
# - 其他格式 -> markitdown-docker（多格式支持）
```

---

## 🛠️ 常见问题

### 1. MarkItDown 服务启动失败

```bash
# 查看日志
docker-compose logs markitdown

# 重新构建
docker-compose build --no-cache markitdown
docker-compose up -d markitdown
```

### 2. MinerU 首次启动很慢

MinerU 首次启动需要下载模型文件（约 2-3GB），需要等待几分钟。

```bash
# 查看下载进度
docker-compose logs -f mineru
```

### 3. 端口冲突

```bash
# 修改 .env.local
MARKITDOWN_PORT=5002  # 改为其他端口
MINERU_DOCKER_PORT=8001
```

### 4. GPU 不可用

如果 GPU 版本启动失败，使用 CPU 版本：

```bash
# 确保 docker-compose.yml 中使用
dockerfile: Dockerfile.cpu
```

---

## 📊 性能对比

| 指标 | MarkItDown Docker | MinerU Docker (CPU) | MinerU Docker (GPU) | MinerU Cloud |
|------|------------------|-------------------|-------------------|--------------|
| 启动时间 | < 30秒 | 2-5分钟（首次） | 5-10分钟（首次） | 即时 |
| PDF 质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 处理速度 | ⚡⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ |
| 内存占用 | ~500MB | ~2GB | ~4GB | N/A |
| 支持格式 | 15+ | PDF only | PDF only | PDF only |

---

## 📚 详细文档

- **完整部署指南**: [DOCUMENT_PARSER_SETUP.md](DOCUMENT_PARSER_SETUP.md)
- **统一接口文档**: [src/lib/document-parser/README.md](src/lib/document-parser/README.md)
- **MarkItDown 文档**: [src/lib/markitdown/README.md](src/lib/markitdown/README.md)
- **MinerU Docker 文档**: [docker/mineru/README.md](docker/mineru/README.md)
- **MinerU 限制说明**: [src/lib/mineru/LIMITATIONS.md](src/lib/mineru/LIMITATIONS.md)

---

## 🎯 推荐方案

### 🏥 医疗/学术场景
```env
DOCUMENT_PARSER=mineru-docker
```
原因：需要高质量 PDF 解析，保留表格、公式等结构

### 📄 通用文档处理
```env
DOCUMENT_PARSER=markitdown-docker
```
原因：支持多种格式，部署简单，速度快

### 🚀 高并发生产环境
```env
DOCUMENT_PARSER=mineru-cloud
```
原因：云端处理，无需本地资源，速度最快

---

## ✅ 完成检查清单

- [ ] 已启动 Docker 服务
- [ ] 已配置 `.env.local`
- [ ] 服务健康检查通过
- [ ] 已测试文档上传
- [ ] 应用正常运行

需要帮助？查看 [完整部署指南](DOCUMENT_PARSER_SETUP.md) 或 [故障排查](DOCUMENT_PARSER_SETUP.md#故障排查)

