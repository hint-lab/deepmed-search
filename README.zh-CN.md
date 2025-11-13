# DeepMed Search

> **注意：** 本项目仍在开发中，部分功能可能不完整或将来会有变更。

[English](./README.md) | 中文

DeepMed Search 是一个基于 Next.js App Router 构建的智能搜索应用，提供统一的网页搜索、大语言模型问答和知识库检索功能。

## 🎬 产品演示

完整demo：

![DeepMed Search 演示](./public/demo.gif)

## ✨ 功能特性

### 统一搜索界面
- 单一搜索框，通过选项卡无缝切换三种搜索模式
- 现代化的响应式设计，适配各种设备
- 流畅的交互体验

### 网页搜索
- 支持多种搜索引擎：
  - **Tavily**：专为 AI 应用优化的搜索引擎
  - **Jina**：智能网页内容提取
  - **DuckDuckGo**：注重隐私的搜索引擎
- 实时获取网络信息
- 清晰展示搜索结果

### LLM 智能问答
- 支持多种主流大语言模型：
  - **GPT**（OpenAI）
  - **DeepSeek**
  - **Gemini**（Google）
- 基于模型内部知识直接回答问题
- 快速获取结构化的答案

### 知识库检索
- **智能检索**：基于语义相似度的精准搜索
- **混合搜索**：结合向量搜索和 BM25 全文搜索，兼顾语义理解和关键词匹配
- **向量优化**：使用 Milvus 专业向量数据库，高性能检索
- **详细结果**：显示来源文档、相关性评分、页码等信息
- **交互体验**：点击结果查看完整文本块和详细信息

### 知识库管理
- 创建和管理多个知识库
- 上传和处理文档（PDF、DOCX、TXT 等）
- **异步队列处理**：所有文档通过 BullMQ 队列系统异步处理（不阻塞请求）
- **实时进度追踪**：美观的环形进度条，通过 Server-Sent Events (SSE) 实时更新
  - 可视化进度环显示百分比（0-100%）
  - 流畅的动画和脉冲效果
  - 实时状态更新（转换中 → 索引中 → 已完成）
- **自动向量嵌入**：自动分块和向量嵌入生成
- **队列监控**：内置 BullMQ Board 监控面板，可监控队列状态和任务详情
- 查看和删除知识库内容

### 深度研究（Deep Research）
- **AI 驱动研究**：自主研究代理进行全面的主题探索
- **多步骤流程**：自动生成研究问题、搜索、分析和综合信息
- **队列系统**：使用 BullMQ 和 Redis 进行后台任务处理
- **实时进度**：通过服务器发送事件（SSE）提供实时状态更新
- **用户隔离配置**：每个用户的 API Keys 使用 AsyncLocalStorage 安全隔离

### 富文本 Markdown 渲染
- **统一组件**：提供 `Markdown` 组件，封装所有 Markdown 渲染功能，使用简单
- **表格支持**：
  - 支持 GitHub Flavored Markdown (GFM) 表格语法
  - 支持 HTML 表格渲染
  - 自动添加边框样式，清晰展示表格结构
- **图片支持**：
  - 支持 Markdown 图片语法 `![alt](url)`
  - 支持 HTML `<img>` 标签
  - 自动适配暗色模式
- **数学公式支持**：
  - 支持 LaTeX 数学公式语法
  - 行内公式：`$...$` 或 `\(...\)`，例如 `$\leqslant 0.01\%$`
  - 块级公式：`$$...$$` 或 `\[...\]`
  - 基于 KaTeX 渲染，性能优异
- **流程图支持**：
  - 支持 Mermaid 流程图、序列图、甘特图等多种图表
  - 使用代码块语法：`` ```mermaid ... ``` ``
  - 支持流程图、时序图、类图、状态图、甘特图等
  - 自动渲染和错误处理
- **其他 Markdown 特性**：
  - 代码块高亮
  - 列表、引用、链接等标准 Markdown 语法
  - 自动适配主题（亮色/暗色模式）

## 🛠 技术栈

### 前端
- **框架**：Next.js 14+ (App Router)
- **语言**：TypeScript
- **UI 库**：React 19
- **样式**：Tailwind CSS
- **组件库**：shadcn/ui、Radix UI
- **图标**：Lucide Icons
- **国际化**：react-i18next、i18next
- **表单**：React Hook Form、Zod
- **文件上传**：react-dropzone
- **Markdown 渲染**：
  - `react-markdown` - Markdown 解析和渲染
  - `remark-gfm` - GitHub Flavored Markdown 支持（表格等）
  - `remark-math` - 数学公式解析
  - `rehype-raw` - HTML 原始内容渲染
  - `rehype-katex` - KaTeX 数学公式渲染
  - `katex` - 数学公式渲染引擎
  - `mermaid` - 流程图和图表渲染引擎

### 后端
- **运行时**：Next.js Server Actions
- **数据库**：PostgreSQL（结构化数据）
- **ORM**：Prisma
- **认证**：NextAuth.js v5
- **向量数据库**：Milvus（向量存储与检索）
- **AI SDK**：Vercel AI SDK (@ai-sdk/openai)
- **队列系统**：BullMQ + Redis（后台任务处理）
- **上下文隔离**：AsyncLocalStorage（并发用户任务隔离）
- **加密**：用户 API Keys 加密存储在数据库

### 外部服务
- **AI 服务**：Vercel AI SDK 配合 OpenAI provider（嵌入和对话）
- **搜索服务**：Tavily、Jina、DuckDuckGo
- **LLM 提供商**：OpenAI、DeepSeek、Google Vertex AI
- **文档处理**：支持三种解析器类型：
  - **MarkItDown Docker**：多格式文档解析（PDF、DOCX、PPT、图片等）- 基于 FastAPI 的服务
  - **MinerU Docker**：高质量 PDF 解析（自托管）- **GPU 加速**，处理速度更快（推荐 RTX 3060+）
  - **MinerU Cloud**：云端 PDF 解析服务（需要用户配置 API Key）
- **图片存储**：自动提取图片并存储到 MinIO，更新 Markdown 链接
- **文件存储**：MinIO（可选）
- **缓存**：Redis（可选）

### 开发工具
- **代码规范**：ESLint、Prettier
- **Git Hooks**：Husky

## 📐 系统架构

```mermaid
graph TD
    subgraph Frontend["前端层 (Next.js)"]
        UI["用户界面<br/>(React 组件)"]
        Settings["设置页面<br/>(LLM/搜索/文档)"]
    end

    subgraph Backend["后端层 (Next.js Server)"]
        Actions["Server Actions<br/>(请求处理)"]
        API["API 路由<br/>(队列/状态)"]
        Lib["核心库<br/>(业务逻辑)"]
        Auth["身份认证<br/>(NextAuth v5)"]
        Context["AsyncLocalStorage<br/>(用户上下文隔离)"]
    end

    subgraph Queue["队列系统"]
        BullMQ["BullMQ<br/>(任务队列)"]
        Worker["队列 Worker<br/>(后台处理)"]
        Redis["Redis<br/>(队列后端)"]
    end

    subgraph Storage["数据存储层"]
        PG["PostgreSQL<br/>(用户、加密密钥等)"]
        Milvus["Milvus<br/>(向量数据库)"]
        MinIO["MinIO<br/>(文件 + 向量)"]
    end

    subgraph External["外部服务（用户配置）"]
        LLMProviders["LLM 提供商<br/>(OpenAI/DeepSeek/Google)"]
        SearchAPI["搜索 API<br/>(Tavily/Jina/NCBI)"]
        DocParser["文档解析器<br/>(MarkItDown/MinerU)"]
        AISDK["Vercel AI SDK<br/>(向量嵌入)"]
    end

    %% 前端连接
    UI --> Actions
    UI --> API
    Settings --> Actions

    %% 后端连接
    Actions --> Lib
    API --> BullMQ
    Actions --> PG
    Auth <--> PG
    Lib --> Context
    
    %% 队列连接
    BullMQ <--> Redis
    BullMQ --> Worker
    Worker --> Context
    Context --> PG
    
    %% Worker 到外部服务
    Worker --> LLMProviders
    Worker --> SearchAPI
    Worker --> DocParser
    
    %% 存储连接
    Lib --> PG
    Lib --> Milvus
    Lib --> MinIO
    Worker --> PG
    Worker --> Milvus
    
    %% 外部服务连接
    Lib --> AISDK
    Lib --> LLMProviders
    Lib --> SearchAPI

    %% 样式
    classDef frontend fill:#D1E8FF,stroke:#333
    classDef backend fill:#E0E0E0,stroke:#333
    classDef queue fill:#FFE6CC,stroke:#333
    classDef database fill:#FFF2CC,stroke:#333
    classDef external fill:#FFD1DC,stroke:#333

    class Frontend frontend
    class Backend backend
    class Queue queue
    class Storage database
    class External external
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Docker 和 Docker Compose
- PostgreSQL 14+（或使用 Docker）

### 1. 克隆项目

```bash
git clone <repository-url>
cd deepmed-search
```

### 2. 启动依赖服务

本项目使用 Docker Compose 管理开发环境的依赖服务，包括 PostgreSQL、Redis 和 MinIO。

#### 启动所有服务

```bash
# 启动所有服务（PostgreSQL、Redis、MinIO）
docker-compose up -d

# 或者只启动需要的服务
docker-compose up -d postgres redis
```

#### 查看服务状态

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
```

#### 停止和重启服务

```bash
# 停止所有服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除容器（保留数据）
docker-compose down

# 完全清理（包括数据卷，谨慎使用！）
docker-compose down -v
```

#### 服务说明

- **PostgreSQL**：存储结构化数据（用户、文档、知识库、加密的 API Keys 等）
- **Milvus**：专业向量数据库，用于高性能向量检索
- **Redis**：用于缓存和 BullMQ 队列系统（Deep Research 必需）
- **MinIO**：S3 兼容的对象存储，用于文件存储和 Milvus 向量持久化
- **MarkItDown**：文档解析服务，支持多格式文档处理（端口 5001）
- **MinerU**：文档解析服务，支持高质量 PDF 处理（端口 8000）
- **Queue Worker**：后台 Worker，处理 Deep Research 和文档转换任务

### 3. 安装依赖

```bash
npm install
# 或
yarn install
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置以下**基础设施相关**项：

```bash
# 数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"

# NextAuth 认证
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# 加密密钥（用于安全存储用户 API Keys）
ENCRYPTION_KEY="your-encryption-key-32-chars-min"

# Redis（队列系统）
REDIS_URL="redis://localhost:6379"

# OpenAI API（通过 Vercel AI SDK 使用，用于向量嵌入，知识库搜索必需）
OPENAI_API_KEY="your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"

# 可选：MinIO 文件存储
# MINIO_ENDPOINT="localhost:9000"
# MINIO_ACCESS_KEY="minioadmin"
# MINIO_SECRET_KEY="minioadmin"
```

> **🔐 用户配置的 API Keys**
> 
> **LLM API Keys、搜索 API Keys 和文档解析器设置现在由每个用户在 Web 界面中配置**（不再在 `.env` 文件中配置）：
> 
> 1. 启动应用程序
> 2. 使用您的账号登录
> 3. 访问设置页面：
>    - **`/settings/llm`** - 配置 LLM 提供商（DeepSeek、OpenAI、Google）
>    - **`/settings/search`** - 配置搜索提供商（Tavily、Jina、NCBI）
>    - **`/settings/document`** - 配置文档解析器（MarkItDown、MinerU、MinerU Cloud）
> 4. 每个用户的 API Keys 都会加密存储在数据库中
> 5. **并发任务隔离** - 使用 AsyncLocalStorage 确保多个用户可以同时运行任务，各自使用自己的 API Keys
> 
> 这种方式提供了：
> - ✅ **多租户支持** - 每个用户拥有自己的 API Keys
> - ✅ **安全性** - API Keys 在数据库中加密存储
> - ✅ **并发安全** - AsyncLocalStorage 确保任务隔离
> - ✅ **灵活性** - 用户可以随时切换提供商

### 5. 初始化数据库

```bash
# 运行数据库迁移
npx prisma migrate dev
# 或
yarn db:migrate

# 初始化 PostgreSQL 扩展
yarn db:init

# 验证扩展安装
yarn db:test
```

### 6. 创建测试用户

```bash
# 创建默认测试用户
npm run create:user
# 或
yarn create:user
```

这将创建以下测试账户：

| 项目 | 值 |
|------|------|
| 邮箱 | `test@example.com` |
| 密码 | `password123` |
| 用户名 | Test User |
| 语言 | 中文 (zh) |

> **提示**：首次运行会自动创建测试租户和测试用户。如果用户已存在，会跳过创建步骤。

### 6. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 http://localhost:3000 开始使用！

### 7. 启动队列 Worker（必需）

> ⚠️ **重要提示**：队列 Worker 是**必需的**，用于文档处理和 Deep Research 功能。所有文档处理任务都通过队列系统异步处理。

在**单独的终端**中启动队列 Worker：

```bash
# 构建 Worker
npm run build:worker
# 或
yarn build:worker

# 启动 Worker（在新终端中）
node dist/index.cjs
```

或使用 Docker Compose：

```bash
# 启动队列 Worker 服务
docker-compose up -d queue-worker

# 查看 Worker 日志
docker-compose logs -f queue-worker
```

队列 Worker 处理所有后台任务：
- **文档转换任务**：PDF/DOCX 转 Markdown（异步处理，不阻塞请求）
- **文档索引任务**：文档分块和向量嵌入
- **Deep Research 任务**：多步骤研究工作流

> 📊 **队列监控**：访问 BullMQ Board 监控面板 http://localhost:8003/admin/queues 可以实时监控队列状态、查看任务详情、重试失败任务、追踪性能指标。

### 8. 登录系统

1. 打开浏览器访问 http://localhost:3000
2. 点击登录按钮
3. 使用测试账户登录：
   - **邮箱**：`test@example.com`
   - **密码**：`password123`

### 9. 配置您的 API Keys

登录后，在设置页面配置您的个人 API Keys：

> ⚠️ **重要提示**：所有 API Keys 必须由用户在设置页面配置。系统不再使用环境变量来配置 API Keys（系统服务如 Redis、PostgreSQL 等除外）。

1. **LLM 配置** (`/settings/llm`)：
   - 添加 LLM 提供商（DeepSeek、OpenAI、Google Gemini）
   - 配置 API Keys 和基础 URLs（**必需**）
   - 设置默认模型
   - 配置嵌入提供商和 API Key（**必需**，用于文档索引）
   - 测试和激活配置

2. **搜索配置** (`/settings/search`)：
   - 选择搜索提供商（Tavily 或 Jina）
   - 配置 Tavily API Key（**必需**，用于 Tavily 搜索）
   - 配置 Jina API Key（**必需**，用于 Jina 搜索和内容提取）
   - 配置 NCBI API Key（可选，用于 PubMed 搜索）
   - 配置嵌入 API Key（**必需**，用于文档向量索引）

3. **文档解析器配置** (`/settings/document`)：
   - 选择解析器类型：
     - **MarkItDown**（Docker）：多格式文档解析（无需 API Key）
     - **MinerU**（Docker）：高质量 PDF 解析，支持 GPU 加速（无需 API Key）
     - **MinerU Cloud**：云端解析服务（**需要 API Key**）
   - 配置 MinerU API Key（仅在使用 MinerU Cloud 时需要）

> 🔒 **安全性**：所有 API Keys 在存储到数据库之前都会使用 `.env` 文件中的 `ENCRYPTION_KEY` 进行加密。每个用户的 API Keys 相互隔离，永不共享。

### 服务访问地址

| 服务 | 地址 | 凭证 |
|------|------|------|
| **应用** | http://localhost:3000 | 见测试账户 |
| **PostgreSQL** | `localhost:5432` | 用户: `postgres`<br/>密码: `postgres`<br/>数据库: `deepmed` |
| **Milvus** | `localhost:19530` | 向量数据库端口 |
| **Milvus 健康检查** | http://localhost:9091 | - |
| **Redis** | `localhost:6379` | 无密码 |
| **RedisInsight** | http://localhost:8002 | Redis GUI 管理工具 |
| **BullMQ Board** | http://localhost:8003/admin/queues | BullMQ 队列监控面板<br/>功能：查看队列、任务详情、重试失败任务、性能指标 |
| **MinIO API** | http://localhost:9000 | 用户: `minioadmin`<br/>密码: `minioadmin` |
| **MinIO 控制台** | http://localhost:9001 | 用户: `minioadmin`<br/>密码: `minioadmin` |
| **MarkItDown** | http://localhost:5001 | 文档解析 API |
| **MinerU Docker** | http://localhost:8000 | 文档解析 API（如启用） |
| **Prisma Studio** | http://localhost:5555 | 运行 `yarn db:studio` 后访问 |

## 📖 开发指南

### 数据库管理

#### 创建迁移

```bash
# 修改 schema.prisma 后生成迁移
npx prisma migrate dev --name <migration-name>
```

#### 查看数据库

```bash
# 启动 Prisma Studio
yarn db:studio
```

### 知识库向量搜索

#### 工作原理

知识库搜索基于向量嵌入技术：

1. **文档上传**：用户上传文档（PDF、DOCX、TXT 等）
2. **文本提取**：系统使用配置的解析器（MarkItDown 或 MinerU）提取文档中的文本内容
3. **分块处理**：将长文本切分成合适大小的块
4. **生成嵌入**：通过 Vercel AI SDK（使用 OpenAI provider）生成每个文本块的向量表示
5. **存储向量**：将向量存储在 Milvus 向量数据库中
6. **检索匹配**：搜索时，查询文本也转换为向量，通过余弦相似度找到最相关的文本块

#### 搜索模式

应用支持三种搜索模式：

1. **向量搜索**
   - 基于语义相似度
   - 能理解同义词和上下文
   - 适合概念性问题

2. **全文搜索**
   - 基于 BM25 算法
   - 关键词精确匹配
   - 适合查找特定术语

3. **混合搜索**（推荐）
   - 结合向量搜索和全文搜索
   - 平衡语义理解和关键词匹配
   - 适合大多数使用场景

#### 调整搜索参数

在 `src/lib/milvus/operations.ts` 中可以调整搜索参数：

```typescript
// 权重配置
bm25Weight: 0.3,      // 全文搜索权重
vectorWeight: 0.7,    // 向量搜索权重

// 阈值配置
bm25Threshold: 0.1,   // 全文搜索最低分数
vectorThreshold: 0.3, // 向量搜索最低相似度
minSimilarity: 0.3,   // 最终结果最低相似度

// 结果数量
limit: 10             // 返回结果数量
```

#### Milvus 向量数据库

Milvus 是专为向量相似度搜索和 AI 应用打造的开源向量数据库：

- **高性能**：专门为向量检索优化，支持 GPU 加速
- **可扩展**：支持分布式部署，轻松处理十亿级向量
- **易用**：丰富的 SDK 和 API，无缝集成

### 添加 UI 组件

本项目使用 [shadcn/ui](https://ui.shadcn.com/) 组件库：

```bash
# 添加新组件
npx shadcn@latest add <component-name>

# 例如：添加按钮组件
npx shadcn@latest add button
```

组件会自动添加到 `src/components/ui` 目录。

### 代码规范

```bash
# 运行代码检查
yarn lint

# 自动修复问题
yarn lint --fix
```

## 📝 可用脚本

```bash
# 开发
yarn dev              # 启动开发服务器
yarn build            # 构建生产版本
yarn start            # 启动生产服务器

# 队列 Worker
yarn build:worker     # 构建队列 Worker
yarn worker           # 启动队列 Worker（构建后）

# 代码质量
yarn lint             # 运行代码检查
yarn test             # 运行测试（如果配置）

# 数据库
yarn db:generate      # 生成 Prisma Client
yarn db:migrate       # 运行数据库迁移
yarn db:push          # 推送 schema 到数据库（开发用）
yarn db:studio        # 启动 Prisma Studio
yarn db:init          # 初始化 PostgreSQL 扩展
yarn db:test          # 测试数据库扩展

# 工具
yarn create:user      # 创建测试用户（如果存在）
```

## 🔧 故障排除

### 知识库搜索返回空结果

#### 1. 检查数据库扩展

```bash
# 测试扩展是否正确安装
yarn db:test
```

如果测试失败，重新初始化：

```bash
yarn db:init
```

#### 2. 调整搜索参数

在 `src/lib/milvus/operations.ts` 中：

- **降低 `minSimilarity` 阈值**：获得更多结果（但可能相关性较低）
- **调整权重比例**：
  - 增加 `vectorWeight`：更重视语义理解
  - 增加 `bm25Weight`：更重视关键词匹配
- **中文搜索建议**：使用混合模式，设置较低的阈值

#### 3. 检查 Milvus 服务

```bash
# 检查 Milvus 是否运行
docker ps | grep milvus

# 查看 Milvus 日志
docker logs deepmed-milvus

# 重启 Milvus
docker-compose restart milvus
```

#### 4. 检查嵌入模型配置

确保 `.env.local` 中配置正确：

```bash
OPENAI_API_KEY="your-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
```

测试 API 连接：

```bash
curl $OPENAI_BASE_URL/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 5. 中文搜索优化建议

- 使用**简短明确**的关键词
- 尝试**不同的表述**方式
- 使用**混合搜索**模式
- 适当降低相似度阈值

### Docker 服务问题

```bash
# 查看容器日志
docker-compose logs postgres

# 重启服务
docker-compose restart postgres

# 完全重置（注意：会删除所有数据）
docker-compose down -v
docker-compose up -d postgres
```

### 数据库连接问题

检查连接字符串格式：

```bash
# 正确格式
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名"

# 示例
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"
```

## 💡 使用示例

### 创建知识库并上传文档

1. **启动服务**

```bash
# 启动数据库
docker-compose up -d postgres

# 启动文档解析器（选择一种）
# 选项 1：MarkItDown（推荐，支持多格式文档）
docker-compose up -d markitdown

# 选项 2：MinerU Docker（高质量 PDF 解析）
# docker-compose up -d mineru

# 启动应用
yarn dev
```

2. **创建知识库**

- 访问 `/knowledge` 页面
- 点击"创建知识库"按钮
- 填写知识库信息：
  - 名称：例如"医学文献库"
  - 描述：说明知识库用途
  - 其他配置（可选）
- 点击确认创建

3. **上传文档**

- 进入知识库详情页
- 切换到"文档"标签
- 拖放文件或点击上传
- 支持格式：PDF、DOCX、TXT、Markdown
- 等待文档处理完成（生成向量嵌入）

4. **搜索知识库**

- 访问主页 `/search`
- 选择"知识库"标签
- 从下拉菜单选择知识库
- 输入查询内容
- 查看搜索结果

### 使用 Web 搜索

```bash
# 1. 访问主页
http://localhost:3000

# 2. 选择"网页搜索"标签

# 3. 选择搜索引擎：
#    - Tavily：最快，为 AI 优化
#    - Jina：内容提取最完整
#    - DuckDuckGo：注重隐私

# 4. 输入查询并搜索
```

### 使用 LLM 问答

```bash
# 1. 选择"LLM"标签

# 2. 选择模型：
#    - GPT：通用性最强
#    - DeepSeek：中文表现好
#    - Gemini：上下文窗口大

# 3. 输入问题
# 4. 获取结构化答案
```

### 使用 Deep Research

```bash
# 1. 确保队列 Worker 正在运行：
docker-compose up -d queue-worker
# 或在开发环境：
node dist/index.cjs

# 2. 访问 Deep Research 页面：
http://localhost:3000/research

# 3. 输入您的研究主题/问题

# 4. AI 代理将：
#    - 生成研究问题
#    - 搜索相关信息
#    - 分析和综合发现
#    - 生成综合报告

# 5. 通过 SSE 监控实时进度
#    - 查看当前步骤和状态
#    - 查看中间结果
#    - 跟踪 token 使用量

# 6. 下载最终报告
```

**Deep Research 功能特点：**
- **自主研究**：AI 代理将复杂主题分解为研究问题
- **多源信息**：搜索网页、知识库和学术数据库
- **引用跟踪**：所有声明都附带来源链接
- **实时更新**：服务器发送事件提供实时进度监控
- **后台处理**：长时间运行的任务由队列 Worker 处理
- **用户隔离**：每个用户的 API Keys 和配置安全隔离

### 队列监控（BullMQ Board）

系统内置了基于 BullMQ Board 的队列监控面板：

**访问地址**：http://localhost:8003/admin/queues

**功能特性**：
- 📊 **实时队列状态**：查看活跃、等待、已完成和失败的任务，支持实时更新
- 🔍 **任务详情**：查看任务数据、日志和执行历史
- 🔄 **任务管理**：重试失败任务、清理已完成任务、暂停/恢复队列
- 📈 **性能指标**：追踪处理时间、吞吐量和成功率
- 🎯 **队列健康**：监控队列健康状态、Worker 状态和 Redis 连接
- 🔔 **任务搜索**：按 ID、状态或数据内容搜索任务
- 📋 **任务历史**：查看完整的任务生命周期和重试记录

**可用队列**：
- `document-to-markdown`：文档转换任务（PDF/DOCX → Markdown）
- `deep-research`：深度研究工作流任务
- `chunk-vector-index`：向量嵌入和索引任务

**使用技巧**：
- 监控面板每 5 秒自动刷新，实时更新
- 点击队列名称可查看该队列中的所有任务
- 点击任务 ID 可查看详细信息，包括输入数据、日志和重试历史
- 使用"重试"按钮可手动重试失败的任务
- 使用"清理"功能可删除已完成或失败的任务
- 监控队列指标以识别性能瓶颈或问题

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📧 联系方式

如有问题或建议，欢迎提出 Issue 或 Pull Request。

---

<div align="center">

**用 ❤️ 构建，由 [H!NT Lab](https://hint-lab.github.io/) 开发**

© 2025 DeepMed Search. 保留所有权利。

</div>

