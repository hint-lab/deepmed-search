# DeepMed Search

[English](#english) | [中文](#中文)

<a name="english"></a>
# DeepMed Search

DeepMed Search is a medical search and chat application built with Next.js, providing real-time streaming chat experience and intelligent search functionality.

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Next.js API Routes and Server Actions
- **Database**: PostgreSQL (structured data)
- **Vector Database**: Milvus (knowledge base and semantic search)
- **Streaming**: Server-Sent Events (SSE) for typewriter effect

## Quick Start

### Start Dependencies with Docker Compose

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### Service Access Points

After startup, services can be accessed at:

- **PostgreSQL**: `localhost:5432`
  - Username: `postgres`
  - Password: `postgres`
  - Database: `deepmed`

- **Milvus**: `localhost:19530`

- **MinIO**: 
  - API: `localhost:9000`
  - Web Console: `localhost:9001`
  - Username: `minioadmin`
  - Password: `minioadmin`

- **PgAdmin (PostgreSQL Management Tool)**: `http://localhost:5050`
  - Username: `admin@deepmed.tech`
  - Password: `admin`

- **Attu (Milvus Management Tool)**: `http://localhost:8000`

### Development Environment Setup

1. Install dependencies
```bash
npm install
```

2. Set up environment variables
```bash
cp .env.example .env.local
```
Then edit `.env.local` file with the following key configurations:
- Database connection info (`DATABASE_URL`)
- NextAuth secret key (`NEXTAUTH_SECRET`)
- AI service API keys (`AI_API_KEY` and `OPENAI_API_KEY`)
- OAuth provider information (if enabled)

3. Start development server
```bash
npm run dev
```

4. Access the application
```
http://localhost:3000
```

## Development Guide

### Database Migration

Use Prisma for database migrations:

```bash
# Generate migration
npx prisma migrate dev --name <migration-name>

# Apply migration
npx prisma migrate deploy
```

### Milvus Connection

Connect to Milvus in the application:

```typescript
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// Configure connection using environment variables
const milvusClient = new MilvusClient({
  address: `${process.env.MILVUS_HOST}:${process.env.MILVUS_PORT}`,
});

// Example: Create collection
async function createCollection() {
  try {
    const collectionName = 'medical_documents';
    const dim = 1536; // Vector dimension, depends on your embedding model

    await milvusClient.createCollection({
      collection_name: collectionName,
      fields: [
        {
          name: 'id',
          data_type: 5, // DataType.Int64
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'content',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        },
        {
          name: 'vector',
          data_type: 101, // DataType.FloatVector
          dim,
        },
      ],
    });
    
    console.log(`Collection ${collectionName} created successfully`);
  } catch (error) {
    console.error('Failed to create collection:', error);
  }
}
```

## Project Features

- **Streaming Chat**: Real-time typewriter effect using SSE
- **Vector Search**: Efficient similarity search using Milvus
- **Knowledge Base Management**: Create and manage professional knowledge bases
- **Multi-language Support**: Built-in translation functionality

## Tech Stack

### Core Framework
- [Next.js 14](https://nextjs.org/) - React Framework
- [React 19](https://react.dev/) - UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

### Database
- [Prisma](https://www.prisma.io/) - Next Generation ORM
- [PostgreSQL](https://www.postgresql.org/) - Relational Database

### UI/Styling
- [shadcn/ui](https://ui.shadcn.com/) - High-quality UI Component Library
- [Radix UI](https://www.radix-ui.com/) - Unstyled Component Library
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Lucide Icons](https://lucide.dev/) - Icon Library

### State Management & Data Fetching
- [React Query](https://tanstack.com/query/latest) - Server State Management
- [React Hook Form](https://react-hook-form.com/) - Form Management
- [Zod](https://zod.dev/) - Type Validation

### Feature Components
- [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) - PDF Highlighting
- [react-dropzone](https://react-dropzone.js.org/) - File Drag & Drop
- [react-markdown](https://remarkjs.github.io/react-markdown/) - Markdown Rendering

### Development Tools
- [ESLint](https://eslint.org/) - Code Linting
- [Prettier](https://prettier.io/) - Code Formatting
- [Husky](https://typicode.github.io/husky/) - Git Hooks

## Available Scripts

```bash
# Development
yarn run dev         # Start development server
yarn run lint        # Run code linting

# Database
yarn run db:generate # Generate Prisma Client
yarn run db:migrate  # Run database migrations
yarn run db:reset    # Reset database
yarn run db:studio   # Start Prisma Studio

# Testing
yarn run test        # Run all tests
yarn run test:unit   # Run unit tests
yarn run test:e2e    # Run end-to-end tests
yarn run test:watch  # Run tests in watch mode
yarn run test:ci     # Run tests in CI environment

# Build & Deploy
yarn run build       # Build for production
yarn run start       # Start production server

# Utility Scripts
yarn run create:user # Create test user account
```

## Testing Scripts

The project's test scripts are located in the `src/scripts/tests` directory and include the following types of tests:

### Unit Tests
- `src/scripts/tests/unit/`: Contains all unit test files
  - `api/`: API endpoint tests
  - `components/`: React component tests
  - `utils/`: Utility function tests
  - `hooks/`: Custom Hook tests

### End-to-End Tests
- `src/scripts/tests/e2e/`: Contains all end-to-end test files
  - `auth/`: Authentication flow tests
  - `search/`: Search functionality tests
  - `chat/`: Chat functionality tests
  - `upload/`: File upload tests

### Integration Tests
- `src/scripts/tests/integration/`: Contains all integration test files
  - `database/`: Database operation tests
  - `milvus/`: Milvus vector database tests
  - `api-flow/`: API flow integration tests

### Test Utils and Helpers
- `src/scripts/tests/utils/`: Test utilities
  - `mocks/`: Mock data and functions
  - `fixtures/`: Test datasets
  - `helpers/`: Test helper functions

### Running Specific Tests
```bash
# Run specific test file
yarn run test path/to/test-file.test.ts

# Run tests matching specific pattern
yarn run test --testNamePattern="search functionality"

# Run tests in specific directory
yarn run test src/scripts/tests/unit/api

# Run tests with coverage report
yarn run test --coverage
```

## Utility Scripts

### Create Test User Account
Creates a test user account for development purposes:
```bash
npx tsx src/scripts/create-test-user.ts
```

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) as the UI component library. It's a high-quality collection of components built on top of Radix UI and Tailwind CSS.

### Adding New Components

Use the shadcn CLI to add components:

```bash
npx shadcn@latest add button
```

All components will be added to the `src/components/ui`

### add testing user account
```bash
npx tsx src/scripts/create-test-user.ts 
```
or

```bash
yarn run create:user
```
<a name="中文"></a>
# DeepMed Search

DeepMed Search 是一个基于 Next.js 构建的医疗搜索和聊天应用程序，提供实时流式聊天体验和智能搜索功能。

## 技术架构

- **前端**: Next.js, React, TailwindCSS
- **后端**: Next.js API Routes 和 Server Actions
- **数据库**: PostgreSQL (结构化数据)
- **向量数据库**: Milvus (知识库和语义搜索)
- **流式传输**: Server-Sent Events (SSE) 实现打字机效果

## 快速开始

### 使用 Docker Compose 启动依赖服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 服务访问地址

启动后，可以通过以下地址访问各服务：

- **PostgreSQL**: `localhost:5432`
  - 用户名: `postgres`
  - 密码: `postgres`
  - 数据库: `deepmed`

- **Milvus**: `localhost:19530`

- **MinIO**: 
  - API: `localhost:9000`
  - Web 控制台: `localhost:9001`
  - 用户名: `minioadmin`
  - 密码: `minioadmin`

- **PgAdmin (PostgreSQL 管理工具)**: `http://localhost:5050`
  - 用户名: `admin@deepmed.tech`
  - 密码: `admin`

- **Attu (Milvus 管理工具)**: `http://localhost:8000`

### 开发环境设置

1. 安装依赖
```bash
npm install
```

2. 设置环境变量
```bash
cp .env.example .env.local
```
然后编辑 `.env.local` 文件，填写以下关键配置：
- 数据库连接信息 (`DATABASE_URL`)
- NextAuth 认证密钥 (`NEXTAUTH_SECRET`)
- AI 服务 API 密钥 (`AI_API_KEY` 和 `OPENAI_API_KEY`)
- OAuth 提供商信息（如果启用）

3. 启动开发服务器
```bash
npm run dev
```

4. 访问应用
```
http://localhost:3000
```

## 开发指南

### 数据库迁移

使用 Prisma 进行数据库迁移：

```bash
# 生成迁移
npx prisma migrate dev --name <migration-name>

# 应用迁移
npx prisma migrate deploy
```

### Milvus 连接

在应用中连接 Milvus：

```typescript
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// 使用环境变量配置连接
const milvusClient = new MilvusClient({
  address: `${process.env.MILVUS_HOST}:${process.env.MILVUS_PORT}`,
});

// 示例：创建集合
async function createCollection() {
  try {
    const collectionName = 'medical_documents';
    const dim = 1536; // 向量维度，取决于你使用的嵌入模型

    await milvusClient.createCollection({
      collection_name: collectionName,
      fields: [
        {
          name: 'id',
          data_type: 5, // DataType.Int64
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'content',
          data_type: 21, // DataType.VarChar
          max_length: 65535,
        },
        {
          name: 'vector',
          data_type: 101, // DataType.FloatVector
          dim,
        },
      ],
    });
    
    console.log(`Collection ${collectionName} created successfully`);
  } catch (error) {
    console.error('Failed to create collection:', error);
  }
}
```

## 项目特点

- **流式聊天**: 使用 SSE 实现实时打字机效果
- **向量搜索**: 使用 Milvus 进行高效相似度搜索
- **知识库管理**: 支持创建和管理专业知识库
- **多语言支持**: 内置多语言翻译功能

## 技术栈

### 核心框架
- [Next.js 14](https://nextjs.org/) - React 框架
- [React 19](https://react.dev/) - UI 库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

### 数据库
- [Prisma](https://www.prisma.io/) - 下一代 ORM
- [PostgreSQL](https://www.postgresql.org/) - 关系型数据库

### UI/样式
- [shadcn/ui](https://ui.shadcn.com/) - 高质量 UI 组件库
- [Radix UI](https://www.radix-ui.com/) - 无样式组件库
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Lucide Icons](https://lucide.dev/) - 图标库

### 状态管理与数据获取
- [React Query](https://tanstack.com/query/latest) - 服务器状态管理
- [React Hook Form](https://react-hook-form.com/) - 表单管理
- [Zod](https://zod.dev/) - 类型验证

### 功能组件
- [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) - PDF 高亮
- [react-dropzone](https://react-dropzone.js.org/) - 文件拖放
- [react-markdown](https://remarkjs.github.io/react-markdown/) - Markdown 渲染

### 开发工具
- [ESLint](https://eslint.org/) - 代码检查
- [Prettier](https://prettier.io/) - 代码格式化
- [Husky](https://typicode.github.io/husky/) - Git 钩子

## 可用脚本

```bash
# 开发
yarn run dev         # 启动开发服务器
yarn run lint        # 运行代码检查

# 数据库
yarn run db:generate # 生成 Prisma 客户端
yarn run db:migrate  # 运行数据库迁移
yarn run db:reset    # 重置数据库
yarn run db:studio   # 启动 Prisma Studio

# 测试
yarn run test        # 运行所有测试
yarn run test:unit   # 运行单元测试
yarn run test:e2e    # 运行端到端测试
yarn run test:watch  # 以监视模式运行测试
yarn run test:ci     # 在 CI 环境中运行测试

# 构建和部署
yarn run build       # 构建生产版本
yarn run start       # 启动生产服务器

# 实用脚本
yarn run create:user # 创建测试用户账号
```

## 测试脚本

项目的测试脚本位于 `src/scripts/tests` 目录下，包含以下类型的测试：

### 单元测试
- `src/scripts/tests/unit/`: 包含所有单元测试文件
  - `api/`: API 端点测试
  - `components/`: React 组件测试
  - `utils/`: 工具函数测试
  - `hooks/`: 自定义 Hook 测试

### 端到端测试
- `src/scripts/tests/e2e/`: 包含所有端到端测试文件
  - `auth/`: 认证流程测试
  - `search/`: 搜索功能测试
  - `chat/`: 聊天功能测试
  - `upload/`: 文件上传测试

### 集成测试
- `src/scripts/tests/integration/`: 包含所有集成测试文件
  - `database/`: 数据库操作测试
  - `milvus/`: Milvus 向量数据库测试
  - `api-flow/`: API 流程集成测试

### 测试工具和辅助函数
- `src/scripts/tests/utils/`: 测试辅助工具
  - `mocks/`: 模拟数据和函数
  - `fixtures/`: 测试数据集
  - `helpers/`: 测试辅助函数

### 运行特定测试
```bash
# 运行特定测试文件
yarn run test path/to/test-file.test.ts

# 运行匹配特定模式的测试
yarn run test --testNamePattern="search functionality"

# 运行特定目录下的测试
yarn run test src/scripts/tests/unit/api

# 运行测试并生成覆盖率报告
yarn run test --coverage
```

## 实用脚本

### 创建测试用户账号
创建用于开发目的的测试用户账号：
```bash
npx tsx src/scripts/create-test-user.ts
或者
```bash
yarn run create:user
```
## UI 组件

本项目使用 [shadcn/ui](https://ui.shadcn.com/) 作为 UI 组件库。它是一个基于 Radix UI 和 Tailwind CSS 构建的高质量组件集合。

### 添加新组件

使用 shadcn CLI 添加组件：

```bash
npx shadcn@latest add button
```

所有组件将被添加到 `src/components/ui` 目录