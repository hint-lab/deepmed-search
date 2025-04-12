# 文档处理服务

这是一个基于 Serverless 架构的高性能文档处理服务，用于将各种格式的文档（PDF、Word、文本等）转换为 Markdown 格式，并进行分块处理。

## 功能特点

- 支持多种文档格式：PDF、Word (docx/doc)、文本文件 (txt/md)
- 文档转换为 Markdown 格式
- 文档内容分块处理
- RESTful API 接口
- 高性能处理
- 可扩展架构
- Serverless 部署支持

## 安装

```bash
# 克隆仓库
git clone <repository-url>
cd document-processor-service

# 安装依赖
npm install
```

## 配置

创建 `.env` 文件并配置以下环境变量：

```
# 服务配置
NODE_ENV=development

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 队列配置
QUEUE_PREFIX=bullmq

# 存储配置
STORAGE_PATH=/tmp/storage
MAX_FILE_SIZE=10485760  # 10MB

# 日志配置
LOG_LEVEL=info
```

## 本地开发

```bash
# 开发模式
npm run dev
```

## Serverless 部署

### 前提条件

1. 安装 Serverless Framework：
```bash
npm install -g serverless
```

2. 配置 AWS 凭证：
```bash
serverless config credentials --provider aws --key YOUR_ACCESS_KEY --secret YOUR_SECRET_KEY
```

### 部署步骤

1. 构建项目：
```bash
npm run build
```

2. 部署到 AWS：
```bash
serverless deploy
```

3. 部署到特定环境：
```bash
serverless deploy --stage prod
```

4. 部署到特定区域：
```bash
serverless deploy --region ap-northeast-1
```

## API 接口

### 上传文档

```
POST /documents/upload
```

请求头：
- `x-file-name`: 文件名
- `x-file-type`: 文件类型

请求体：
- 文件内容（二进制）

响应：
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "metadata": {
    "pageCount": 10,
    "wordCount": 5000,
    "processingTime": 1200
  },
  "chunkCount": 25
}
```

### 获取文档状态

```
GET /documents/{documentId}/status
```

响应：
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "status": {
    "originalFile": true,
    "processedFile": true,
    "chunks": true,
    "chunkCount": 25
  }
}
```

### 获取文档内容

```
GET /documents/{documentId}/content
```

响应：
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "content": "# 文档标题\n\n文档内容..."
}
```

### 获取文档分块

```
GET /documents/{documentId}/chunks
```

响应：
```json
{
  "success": true,
  "documentId": "123e4567-e89b-12d3-a456-426614174000",
  "chunks": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000-0",
      "content": "第一个分块的内容...",
      "index": 0
    },
    {
      "id": "123e4567-e89b-12d3-a456-426614174000-1",
      "content": "第二个分块的内容...",
      "index": 1
    }
  ]
}
```

## 注意事项

1. 文件大小限制：10MB
2. 支持的文件类型：PDF、DOCX、DOC、TXT、MD
3. 处理超时时间：30秒
4. 临时存储路径：/tmp/storage
5. 需要配置 Redis 服务

## 许可证

MIT 