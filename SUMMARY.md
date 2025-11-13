# 文档解析器集成总结

## ✅ 已完成的工作

### 1. 创建了三种文档解析方案

#### 方案 A：MarkItDown Docker
- **位置**: `docker/markitdown/`
- **文件**:
  - `Dockerfile` - Docker 镜像定义
  - `api_server.py` - Flask API 服务
  - `requirements.txt` - Python 依赖
- **端口**: 5001
- **支持格式**: PDF, DOCX, XLSX, PPT, 图片等 15+ 种格式

#### 方案 B：MinerU Docker（基于官方）
- **位置**: `docker/mineru/`
- **文件**:
  - `Dockerfile` - GPU 版本（基于 vllm/vllm-openai）
  - `Dockerfile.cpu` - CPU 版本
  - `api_server.py` - Flask API 服务（调用官方 mineru CLI）
  - `docker-compose.example.yml` - GPU/CPU 配置示例
- **端口**: 8000
- **支持格式**: PDF only（高质量）
- **参考**: https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/

#### 方案 C：MinerU Cloud
- **位置**: `src/lib/mineru/`
- **说明**: 使用云端 API，需要公网访问

### 2. 创建了统一文档解析接口

**位置**: `src/lib/document-parser/`

**核心文件**:
- `index.ts` - 统一的 parseDocument 函数
- `README.md` - 完整使用文档

**类型定义**:
```typescript
export type ParserType = 'markitdown-docker' | 'mineru-docker' | 'mineru-cloud';

export interface DocumentParseResult {
  success: boolean;
  content: string;
  pages?: Array<{ pageNum: number; content: string; tokens?: number }>;
  metadata?: { ... };
  error?: string;
}
```

**使用示例**:
```typescript
import { parseDocument } from '@/lib/document-parser';

const result = await parseDocument('/path/to/document.pdf');
```

### 3. 更新了 Docker Compose 配置

**文件**: `docker-compose.yml`

新增服务:
- `markitdown` - MarkItDown 服务（端口 5001）
- `mineru` - MinerU 服务（端口 8000）

### 4. 创建了配置文件和文档

**配置文件**:
- `.env.local.example` - 环境变量配置示例
- `DOCUMENT_PARSER_SETUP.md` - 完整部署指南
- `QUICK_START.md` - 5 分钟快速开始指南

**API 文档**:
- `docker/markitdown/Dockerfile` - MarkItDown 构建说明
- `docker/mineru/README.md` - MinerU 详细文档
- `src/lib/document-parser/README.md` - 统一接口文档

## 🚀 如何使用

### 最简单方式（MarkItDown）

```bash
# 1. 启动服务
docker-compose up -d markitdown

# 2. 配置
echo "DOCUMENT_PARSER=markitdown-docker" >> .env.local
echo "MARKITDOWN_URL=http://localhost:5001" >> .env.local

# 3. 启动应用
yarn dev
```

### 高质量 PDF（MinerU Docker）

```bash
# 1. 启动服务
docker-compose up -d mineru

# 2. 配置
echo "DOCUMENT_PARSER=mineru-docker" >> .env.local
echo "MINERU_URL=http://localhost:8000" >> .env.local

# 3. 启动应用
yarn dev
```

## 📊 方案对比

| 特性 | MarkItDown Docker | MinerU Docker | MinerU Cloud |
|------|------------------|---------------|--------------|
| 支持格式 | 15+ 种 | PDF only | PDF only |
| PDF 质量 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 处理速度 | ⚡⚡⚡⚡ | ⚡⚡ (CPU) | ⚡⚡⚡⚡⚡ |
| 部署难度 | ⭐⭐ | ⭐⭐⭐ | ⭐ |
| 成本 | 免费 | 免费 | 付费 |
| 本地文件 | ✅ | ✅ | ❌ 需公网 |

## 🎯 推荐配置

### 医疗/学术场景
```env
DOCUMENT_PARSER=mineru-docker
```

### 通用文档处理
```env
DOCUMENT_PARSER=markitdown-docker
```

### 高并发生产
```env
DOCUMENT_PARSER=mineru-cloud
```

## 📚 文档索引

1. **快速开始**: [QUICK_START.md](QUICK_START.md)
2. **完整部署**: [DOCUMENT_PARSER_SETUP.md](DOCUMENT_PARSER_SETUP.md)
3. **统一接口**: [src/lib/document-parser/README.md](src/lib/document-parser/README.md)
4. **MarkItDown**: [src/lib/markitdown/README.md](src/lib/markitdown/README.md)
5. **MinerU Docker**: [docker/mineru/README.md](docker/mineru/README.md)
6. **MinerU 限制**: [src/lib/mineru/LIMITATIONS.md](src/lib/mineru/LIMITATIONS.md)

## 🔧 关键文件清单

### Docker 配置
- `docker-compose.yml` - 服务编排
- `docker/markitdown/Dockerfile` - MarkItDown 镜像
- `docker/mineru/Dockerfile` - MinerU GPU 镜像
- `docker/mineru/Dockerfile.cpu` - MinerU CPU 镜像

### 应用代码
- `src/lib/document-parser/index.ts` - 统一接口
- `src/lib/markitdown/client.ts` - MarkItDown 客户端
- `src/lib/mineru/client.ts` - MinerU 客户端

### API 服务
- `docker/markitdown/api_server.py` - MarkItDown API
- `docker/mineru/api_server.py` - MinerU API

### 配置文件
- `.env.local.example` - 环境变量示例
- `docker/mineru/docker-compose.example.yml` - GPU 配置示例

## ✅ 功能特性

1. **统一接口**: 一个 `parseDocument` 函数支持所有解析器
2. **自动切换**: 通过环境变量轻松切换解析器
3. **健康检查**: 每个服务都有健康检查端点
4. **错误处理**: 完善的错误处理和日志记录
5. **类型安全**: 完整的 TypeScript 类型定义
6. **Docker 化**: 所有服务都可通过 Docker 部署
7. **文档完善**: 每个组件都有详细文档

## 🎉 下一步

1. 选择一个解析器方案（推荐 markitdown-docker 或 mineru-docker）
2. 按照 [QUICK_START.md](QUICK_START.md) 启动服务
3. 测试文档上传功能
4. 根据需要调整配置

需要帮助？查看详细文档或参考示例配置！
