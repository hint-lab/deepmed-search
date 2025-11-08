# 统一文档解析器

支持多种文档解析方式，可根据环境灵活切换。

## 支持的解析器

### 1. MarkItDown Docker（推荐 - 通用文档）
- **类型**: `markitdown-docker`  
- **依赖**: Docker 容器
- **优点**: 支持多种格式，快速部署，免费
- **缺点**: PDF 质量一般
- **适用**: 多格式文档处理，开发/生产环境

### 2. MinerU Docker（推荐 - 高质量 PDF）
- **类型**: `mineru-docker`
- **依赖**: Docker 容器
- **优点**: PDF 质量最高，本地文件，免费
- **缺点**: 仅支持 PDF，处理较慢
- **适用**: 高质量 PDF 处理，学术/医疗文档
- **参考**: [MinerU 官方文档](https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/)

### 3. MinerU Cloud（云端服务）
- **类型**: `mineru-cloud`
- **依赖**: MinerU API Key + 公网 URL
- **优点**: 速度快，质量高，无本地计算
- **缺点**: 需要付费，文件需公网访问
- **适用**: 高并发场景，对速度和质量都有要求

## 快速开始

### 使用 Docker MarkItDown（推荐）

```bash
# 1. 启动 MarkItDown 服务
docker-compose up -d markitdown

# 2. 配置环境变量
echo "DOCUMENT_PARSER=markitdown-docker" >> .env.local
echo "MARKITDOWN_URL=http://localhost:5001" >> .env.local

# 3. 测试服务
curl http://localhost:5001/health

# 4. 重启应用
yarn dev
```

### 使用本地 MarkItDown

```bash
# 1. 安装 MarkItDown
pip install 'markitdown[all]'

# 2. 配置环境变量
echo "DOCUMENT_PARSER=markitdown-local" >> .env.local

# 3. 测试安装
npx tsx src/scripts/test-markitdown.ts

# 4. 重启应用
yarn dev
```

### 使用 MinerU

```bash
# 1. 配置环境变量
echo "DOCUMENT_PARSER=mineru" >> .env.local
echo "MINERU_API_KEY=your_api_key" >> .env.local

# 2. 配置公网访问（使用 ngrok）
ngrok http 9000
echo "MINIO_ENDPOINT=your-ngrok-url.ngrok.io" >> .env.local

# 3. 重启应用
yarn dev
```

## 使用示例

### 在代码中使用

```typescript
import { parseDocument } from '@/lib/document-parser';

// 自动使用配置的解析器
const result = await parseDocument('/path/to/document.pdf');

if (result.success) {
  console.log('内容:', result.content);
  console.log('页数:', result.pages?.length);
} else {
  console.error('错误:', result.error);
}

// 指定解析器类型
const result2 = await parseDocument('/path/to/document.pdf', {
  parserType: 'markitdown-docker',
  fileName: 'mydoc.pdf',
});
```

### 在 Worker 中使用

```typescript
import { parseDocument } from '@/lib/document-parser';

export async function processDocument(data: DocumentProcessJobData) {
  const localFilePath = getLocalFilePath(data.documentInfo);
  
  // 自动使用环境变量配置的解析器
  const result = await parseDocument(localFilePath, {
    fileName: data.documentInfo.name,
  });
  
  return {
    success: result.success,
    data: {
      pages: result.pages,
      extracted: result.content,
    },
    error: result.error,
  };
}
```

## 环境变量配置

```env
# .env.local

# 解析器选择
# 可选值: markitdown-local | markitdown-docker | mineru
DOCUMENT_PARSER=markitdown-docker

# MarkItDown Docker 配置
MARKITDOWN_URL=http://localhost:5001
MARKITDOWN_PORT=5001

# MarkItDown Local 配置
MARKITDOWN_PYTHON_PATH=python3

# MinerU 配置
MINERU_API_KEY=your_api_key
MINERU_BASE_URL=https://mineru.net/api
```

## 健康检查

检查各解析器是否可用：

```typescript
import { checkParserAvailability } from '@/lib/document-parser';

// 检查 Docker MarkItDown
const dockerOk = await checkParserAvailability('markitdown-docker');
console.log('Docker MarkItDown:', dockerOk ? '✅' : '❌');

// 检查本地 MarkItDown
const localOk = await checkParserAvailability('markitdown-local');
console.log('Local MarkItDown:', localOk ? '✅' : '❌');

// 检查 MinerU
const mineruOk = await checkParserAvailability('mineru');
console.log('MinerU:', mineruOk ? '✅' : '❌');
```

## Docker 部署

### docker-compose.yml

```yaml
services:
  markitdown:
    build:
      context: ./docker/markitdown
      dockerfile: Dockerfile
    container_name: deepmed-markitdown
    restart: always
    ports:
      - "5001:5000"
    environment:
      PORT: 5000
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:5000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 常用命令

```bash
# 启动服务
docker-compose up -d markitdown

# 查看日志
docker-compose logs -f markitdown

# 重启服务
docker-compose restart markitdown

# 停止服务
docker-compose stop markitdown

# 重新构建
docker-compose build markitdown
docker-compose up -d markitdown
```

## API 接口（Docker 版本）

### 健康检查

```bash
GET http://localhost:5001/health

Response:
{
  "status": "healthy",
  "service": "markitdown",
  "timestamp": 1234567890
}
```

### 转换文档

```bash
POST http://localhost:5001/convert
Content-Type: multipart/form-data

FormData:
  file: <binary>

Response:
{
  "success": true,
  "content": "markdown content...",
  "processing_time": 1234,
  "metadata": {
    "filename": "document.pdf",
    "size": 123456
  }
}
```

### 支持的格式

```bash
GET http://localhost:5001/formats

Response:
{
  "formats": ["pdf", "docx", "xlsx", ...],
  "max_file_size": 209715200,
  "max_file_size_mb": 200
}
```

## 性能对比

| 解析器 | 速度 | 质量 | 成本 | 部署难度 |
|--------|------|------|------|----------|
| MarkItDown Local | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | 免费 | ⭐⭐ |
| MarkItDown Docker | ⚡⚡⚡ | ⭐⭐⭐⭐ | 免费 | ⭐⭐⭐ |
| MinerU | ⚡⚡ | ⭐⭐⭐⭐⭐ | 付费 | ⭐ |

## 故障排查

### Docker 服务无法启动

```bash
# 检查日志
docker-compose logs markitdown

# 检查端口占用
lsof -i :5001

# 重新构建
docker-compose build --no-cache markitdown
```

### 转换失败

```bash
# 检查服务状态
curl http://localhost:5001/health

# 查看支持的格式
curl http://localhost:5001/formats

# 手动测试
curl -F "file=@/path/to/test.pdf" http://localhost:5001/convert
```

### 本地 Python 找不到

```bash
# 检查 Python
which python3
python3 --version

# 检查 MarkItDown
python3 -c "import markitdown; print(markitdown.__version__)"

# 配置 Python 路径
export MARKITDOWN_PYTHON_PATH=/usr/bin/python3
```

## 推荐配置

### 开发环境
```env
DOCUMENT_PARSER=markitdown-docker
MARKITDOWN_URL=http://localhost:5001
```

### 生产环境（小规模）
```env
DOCUMENT_PARSER=markitdown-docker
MARKITDOWN_URL=http://markitdown:5000  # 内部网络
```

### 生产环境（大规模/高质量）
```env
DOCUMENT_PARSER=mineru
MINERU_API_KEY=your_api_key
MINIO_ENDPOINT=files.yourdomain.com  # 公网可访问
```


