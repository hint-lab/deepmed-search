# DeepMed Search

> **注意：** 本项目仍在开发中，部分功能可能不完整或将来会有变更。

[English](./README.md) | 中文

DeepMed Search 是一个基于 Next.js App Router 构建的智能搜索应用，提供统一的网页搜索、大语言模型问答和知识库检索功能。

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
- **中文优化**：使用 pg_jieba 分词，原生支持中文检索
- **详细结果**：显示来源文档、相关性评分、页码等信息
- **交互体验**：点击结果查看完整文本块和详细信息

### 知识库管理
- 创建和管理多个知识库
- 上传和处理文档（PDF、DOCX、TXT 等）
- 自动生成向量嵌入
- 查看和删除知识库内容

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

### 后端
- **运行时**：Next.js Server Actions
- **数据库**：PostgreSQL
- **ORM**：Prisma
- **认证**：NextAuth.js
- **向量存储**：pgvector 扩展
- **中文分词**：pg_jieba 扩展
- **AI SDK**：Vercel AI SDK (@ai-sdk/openai)

### 外部服务
- **AI 服务**：Vercel AI SDK 配合 OpenAI provider（嵌入和对话）
- **搜索服务**：Tavily、Jina、DuckDuckGo
- **LLM 提供商**：OpenAI、DeepSeek、Google Vertex AI
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
        Hooks["Hooks & Context<br/>(状态管理)"]
    end

    subgraph Backend["后端层 (Next.js Server)"]
        Actions["Server Actions<br/>(请求处理)"]
        Lib["核心库<br/>(业务逻辑)"]
        Auth["身份认证<br/>(NextAuth)"]
    end

    subgraph Storage["数据存储层"]
        PG["PostgreSQL<br/>(pgvector + pg_jieba)"]
        Files["文件存储<br/>(MinIO)"]
    end

    subgraph External["外部服务"]
        AISDK["Vercel AI SDK<br/>(嵌入与对话)"]
        SearchAPI["搜索 API<br/>(Tavily/Jina/DuckDuckGo)"]
        LLMProviders["LLM 提供商<br/>(OpenAI/DeepSeek/Vertex AI)"]
    end

    %% 连接关系
    UI <--> Hooks
    Hooks --> Actions
    Actions --> Lib
    Lib --> PG
    Lib --> Files
    Lib --> AISDK
    Lib --> SearchAPI
    Lib --> LLMProviders
    Auth <--> PG

    %% 样式
    classDef frontend fill:#D1E8FF,stroke:#333
    classDef backend fill:#E0E0E0,stroke:#333
    classDef database fill:#FFF2CC,stroke:#333
    classDef external fill:#FFD1DC,stroke:#333

    class Frontend frontend
    class Backend backend
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

- **PostgreSQL**：已预装 pgvector 和 pg_jieba 扩展，支持向量搜索和中文分词
- **Redis**：用于缓存和队列系统（可选）
- **MinIO**：S3 兼容的对象存储，用于存储文档文件（可选）

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

编辑 `.env.local` 文件，配置以下必需项：

```bash
# 数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"

# NextAuth 认证
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI API（通过 Vercel AI SDK 使用，用于生成嵌入向量和对话，知识库搜索必需）
OPENAI_API_KEY="your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_API_MODEL="gpt-4o-mini"  # 对话模型
OPENAI_API_REASON_MODEL="o4-mini"  # 推理模型（可选）

# 网页搜索 API
TAVILY_API_KEY="your-tavily-api-key"
JINA_API_KEY="your-jina-api-key"

# 可选：其他 LLM API
# DEEPSEEK_API_KEY="your-deepseek-api-key"
# GEMINI_API_KEY="your-gemini-api-key"

# 可选：MinIO 文件存储
# MINIO_ENDPOINT="localhost:9000"
# MINIO_ACCESS_KEY="minioadmin"
# MINIO_SECRET_KEY="minioadmin"
```

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

### 7. 登录系统

1. 打开浏览器访问 http://localhost:3000
2. 点击登录按钮
3. 使用测试账户登录：
   - **邮箱**：`test@example.com`
   - **密码**：`password123`

### 服务访问地址

| 服务 | 地址 | 凭证 |
|------|------|------|
| **应用** | http://localhost:3000 | 见测试账户 |
| **PostgreSQL** | `localhost:5432` | 用户: `postgres`<br/>密码: `postgres`<br/>数据库: `deepmed` |
| **Redis** | `localhost:6379` | 无密码 |
| **MinIO API** | http://localhost:9000 | 用户: `minioadmin`<br/>密码: `minioadmin` |
| **MinIO 控制台** | http://localhost:9001 | 用户: `minioadmin`<br/>密码: `minioadmin` |
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
2. **文本提取**：系统提取文档中的文本内容
3. **分块处理**：将长文本切分成合适大小的块
4. **生成嵌入**：通过 Vercel AI SDK（使用 OpenAI provider）生成每个文本块的向量表示
5. **存储向量**：将向量存储在 PostgreSQL（使用 pgvector 扩展）
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

在 `src/lib/pgvector/operations.ts` 中可以调整搜索参数：

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

#### PostgreSQL 扩展

项目使用两个关键的 PostgreSQL 扩展：

- **pgvector**：向量存储和相似度搜索
- **pg_jieba**：中文分词，提供更好的中文全文搜索支持

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

在 `src/lib/pgvector/operations.ts` 中：

- **降低 `minSimilarity` 阈值**：获得更多结果（但可能相关性较低）
- **调整权重比例**：
  - 增加 `vectorWeight`：更重视语义理解
  - 增加 `bm25Weight`：更重视关键词匹配
- **中文搜索建议**：使用混合模式，设置较低的阈值

#### 3. 重建索引

```bash
# 重新创建数据库索引
psql $DATABASE_URL -f scripts/chunk.sql
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

