<div align="center">

<!-- logo -->
<p align="center">
  <h1>🔬 DeepMed Search</h1>
</p>

<!-- badges -->
[![GitHub stars](https://img.shields.io/github/stars/hint-lab/deepmed-search?style=social)](https://github.com/hint-lab/deepmed-search)
[![GitHub forks](https://img.shields.io/github/forks/hint-lab/deepmed-search?style=social)](https://github.com/hint-lab/deepmed-search)
[![GitHub issues](https://img.shields.io/github/issues/hint-lab/deepmed-search)](https://github.com/hint-lab/deepmed-search/issues)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)](https://www.docker.com/)

<!-- language -->
[English](./README.md) | [简体中文](./README.zh-CN.md) | 📚 [文档中心](./docs/README.md)

</div>

> **⚠️ 开发提示：** 本项目正在积极开发中，部分功能可能不完整或将来会有变更。

## 📖 项目简介

DeepMed Search 是一个全面的 AI 驱动医学研究平台，基于 Next.js 构建，通过智能界面提供统一的多种搜索能力访问。它结合了网页搜索、大语言模型、知识库管理和自主研究代理，加速医学文献发现和研究工作流程。

该平台强调用户隐私和灵活性，允许每个用户配置自己的各项服务 API 密钥，所有凭证都经过加密并安全存储。

## 🎬 产品演示

![DeepMed Search 演示](./public/demo.gif)

## ✨ 核心特性

- 🌐 **多引擎网页搜索** - 集成 Tavily、Jina 和 DuckDuckGo
- 🤖 **LLM 智能问答** - 支持 OpenAI、DeepSeek 和 Google Gemini
- 📚 **知识库管理** - 基于 Milvus 的向量语义搜索
- 🔬 **深度研究代理** - 自主多步骤研究，带引用追踪
- 🔄 **异步处理** - BullMQ 队列系统处理后台任务
- 📊 **实时进度** - 服务器发送事件 (SSE) 实时更新
- 🔒 **用户隔离** - 每个用户的 API 密钥安全加密和隔离
- 🎨 **现代界面** - 响应式设计，支持暗色模式
- 🌍 **国际化** - 多语言支持（中、英、日、韩、法、阿）

## 🛠 技术栈

**前端：** Next.js 14+ (App Router)、TypeScript、React 19、Tailwind CSS、shadcn/ui

**后端：** Next.js Server Actions、Prisma ORM、NextAuth.js v5、BullMQ + Redis

**数据库：** PostgreSQL（结构化数据）、Milvus（向量搜索）、MinIO（文件存储）

**AI/ML：** Vercel AI SDK、OpenAI provider、多种 LLM 集成

**文档处理：** MarkItDown（多格式）、MinerU（PDF，支持 GPU）

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Docker 和 Docker Compose
- Git

### 1. 克隆与设置

```bash
git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search
npm install
cp .env.example .env.local
```

### 2. 配置环境

编辑 `.env.local` 配置基础设施设置：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
ENCRYPTION_KEY="your-encryption-key-32-chars"
REDIS_URL="redis://localhost:6379"
```

> 💡 **用户 API 密钥**：LLM 和搜索 API 密钥在 Web 界面的 `/settings/*` 中按用户配置，不在环境变量中。

### 3. 启动服务

```bash
# 启动所有基础设施服务
docker-compose up -d

# 运行数据库迁移
npx prisma migrate dev

# 创建测试用户
npm run create:user
```

### 4. 启动应用

```bash
# 终端 1：启动 Web 应用
npm run dev

# 终端 2：启动队列 Worker（文档处理和研究必需）
npm run build:worker
node dist/index.cjs
```

访问 **http://localhost:3000** 并使用以下账号登录：
- 邮箱：`test@example.com`
- 密码：`password123`

### 5. 配置您的 API 密钥

登录后，访问设置页面配置您的个人 API 密钥：
- `/settings/llm` - LLM 提供商（OpenAI、DeepSeek、Google）
- `/settings/search` - 搜索 API（Tavily、Jina、NCBI）
- `/settings/document` - 文档解析器（MarkItDown、MinerU）

## 📖 文档

详细指南请访问我们的[文档中心](./docs/README.md)：

- **[快速部署](./docs/deployment/QUICKSTART.zh-CN.md)** - 5-10 分钟快速部署
- **[生产环境指南](./docs/deployment/PRODUCTION.zh-CN.md)** - 完整生产环境配置
- **[CI/CD 配置](./docs/deployment/CICD.zh-CN.md)** - GitHub Actions 自动部署
- **[OAuth 配置](./docs/setup/OAUTH_SETUP.md)** - Google/GitHub 认证配置
- **[文档解析器](./docs/setup/DOCUMENT_PARSER_SETUP.md)** - MarkItDown 和 MinerU 设置
- **[故障排查](./docs/troubleshooting/)** - 常见问题和解决方案

## 📐 系统架构

```mermaid
graph TD
    Frontend[Next.js 前端] --> Backend[Server Actions]
    Backend --> Queue[BullMQ 队列系统]
    Backend --> PG[PostgreSQL]
    Backend --> Milvus[Milvus 向量数据库]
    Queue --> Worker[队列 Worker]
    Worker --> External[外部 API]
    External --> LLM[LLM 提供商]
    External --> Search[搜索 API]
    External --> Parser[文档解析器]
```

## 🤝 贡献指南

我们欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'Add some AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🔗 相关项目

- [MinerU](https://github.com/opendatalab/MinerU) - 高质量 PDF 文档解析
- [Next.js](https://nextjs.org/) - 用于生产的 React 框架
- [Milvus](https://milvus.io/) - AI 应用向量数据库
- [BullMQ](https://docs.bullmq.io/) - NodeJS 高级消息队列

## 📧 联系与支持

- 💬 **问题反馈**：[GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)
- 📧 **邮箱**：wang-hao@shu.edu.cn
- 💼 **组织**：[H!NT Lab](https://hint-lab.github.io/)

---

<div align="center">

### 用 ❤️ 构建，由 DeepMed 团队开发

**基于 Next.js、TypeScript 和 AI 技术**

© 2025 DeepMed Search. 保留所有权利。

[⬆ 回到顶部](#-deepmed-search)

</div>
