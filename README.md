# DeepMed Search

[English](#english) | [中文](#中文)

<a name="english"></a>
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

## Getting Started

1. Clone the project and install dependencies:

```bash
git clone <repository-url>
cd deepmed-search
yarn run install
```

2. Configure environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` file with necessary environment variables:

```env
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/deepmed"

# Next Auth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Other configurations...
```

3. Initialize the database:

```bash
yarn run db:generate  # Generate Prisma Client
yarn run db:migrate   # Run database migrations
```

4. Start the development server:

```bash
yarn run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

## Project Structure

```
.
├── src/                    # Source Code
│   ├── app/               # Next.js App Router Routes
│   │   ├── ui/           # shadcn/ui Components
│   │   └── ...           # Custom Components
│   ├── hooks/            # React Hooks
│   ├── lib/              # Utility Functions
│   ├── types/            # TypeScript Types
│   └── i18n/             # Internationalization
├── prisma/               # Prisma Configuration & Migrations
├── public/              # Static Assets
└── scripts/             # Utility Scripts
```

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

# Build & Deploy
yarn run build       # Build for production
yarn run start       # Start production server
```

## UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) as the UI component library. It's a high-quality collection of components built on top of Radix UI and Tailwind CSS.

### Adding New Components

Use the shadcn-ui CLI to add components:

```bash
yarn run dlx shadcn-ui@latest add button
```

All components will be added to the `src/components/ui`