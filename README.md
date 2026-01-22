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
[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-brightgreen)](https://www.docker.com/)

<!-- language -->
[English](./README.md) | [简体中文](./README.zh-CN.md) | 📚 [Documentation Center](./docs/README.en.md)

</div>

> **⚠️ Development Notice:** This project is actively under development. Some features may be incomplete or subject to change.

## 📖 Introduction

DeepMed Search is a comprehensive AI-powered medical research platform built with Next.js, providing unified access to multiple search capabilities through an intelligent interface. It combines web search, large language models, knowledge base management, and autonomous research agents to accelerate medical literature discovery and research workflows.

The platform emphasizes user privacy and flexibility by allowing each user to configure their own API keys for various services, with all credentials encrypted and securely stored.

## 🎬 Demo

![DeepMed Search Demo](./public/demo.gif)

## ✨ Key Features

- 🌐 **Multi-Engine Web Search** - Tavily, Jina, and DuckDuckGo integration
- 🤖 **LLM Q&A** - Support for OpenAI, DeepSeek, and Google Gemini
- 📚 **Knowledge Base Management** - Vector-based semantic search with Milvus
- 🔬 **Deep Research Agent** - Autonomous multi-step research with citation tracking
- 🔄 **Asynchronous Processing** - BullMQ queue system for background tasks
- 📊 **Real-Time Progress** - Server-Sent Events (SSE) for live updates
- 🔒 **User Isolation** - Each user's API keys securely encrypted and isolated
- 🎨 **Modern UI** - Responsive design with dark mode support
- 🌍 **Internationalization** - Multi-language support (EN, ZH, JA, KO, FR, AR)

## 🛠 Technology Stack

**Frontend:** Next.js 15.2.4 (App Router), TypeScript 5.x, React 19.0.0, Tailwind CSS 4.x, shadcn/ui

**Runtime:** Node.js 20.x (Bookworm)

**Backend:** Next.js Server Actions, Prisma ORM, NextAuth.js v5, BullMQ + Redis

**Databases:** PostgreSQL (structured data), Milvus (vector search), MinIO (file storage)

**AI/ML:** Vercel AI SDK, OpenAI provider, multiple LLM integrations

**Document Processing:** MarkItDown (multi-format), MinerU (PDF with GPU support)

## 🚀 Quick Start

### Prerequisites

- **Node.js 20.x** (recommended: 20.12.0 or later)
- **React 19.0.0**
- **Next.js 15.2.4**
- Docker and Docker Compose
- Git

### 1. Clone & Setup

```bash
git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search
npm install
cp .env.example .env.local
```

### 2. Configure Environment

Edit `.env.local` with your infrastructure settings:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
ENCRYPTION_KEY="your-encryption-key-32-chars"
REDIS_URL="redis://localhost:6379"
```

> 💡 **User API Keys**: LLM and search API keys are configured per-user in the web interface at `/settings/*`, not in environment variables.

### 3. Start Services

```bash
# Start all infrastructure services
docker-compose up -d

# Run database migrations
npx prisma migrate dev

# Create test user
npm run create:user
```

### 4. Launch Application

```bash
# Terminal 1: Start the web application
npm run dev

# Terminal 2: Start queue worker (required for document processing and research)
npm run build:worker
node dist/index.cjs
```

Visit **http://localhost:3000** and login with:
- Email: `test@example.com`
- Password: `password123`

### 5. Configure Your API Keys

After login, visit Settings to configure your personal API keys:
- `/settings/llm` - LLM providers (OpenAI, DeepSeek, Google)
- `/settings/search` - Search APIs (Tavily, Jina, NCBI)
- `/settings/document` - Document parsers (MarkItDown, MinerU)

## 📖 Documentation

For detailed guides, visit our [Documentation Center](./docs/README.en.md):

- **[Quick Deployment](./docs/deployment/QUICKSTART.md)** - Deploy in 5-10 minutes
- **[Production Guide](./docs/deployment/PRODUCTION.md)** - Complete production setup
- **[CI/CD Setup](./docs/deployment/CICD.md)** - Automated deployment with GitHub Actions
- **[OAuth Configuration](./docs/setup/OAUTH_SETUP.md)** - Google/GitHub authentication
- **[Document Parsers](./docs/setup/DOCUMENT_PARSER_SETUP.md)** - MarkItDown and MinerU setup
- **[Troubleshooting](./docs/troubleshooting/)** - Common issues and solutions

## 📐 System Architecture

```mermaid
graph TD
    Frontend[Next.js Frontend] --> Backend[Server Actions]
    Backend --> Queue[BullMQ Queue System]
    Backend --> PG[PostgreSQL]
    Backend --> Milvus[Milvus Vector DB]
    Queue --> Worker[Queue Worker]
    Worker --> External[External APIs]
    External --> LLM[LLM Providers]
    External --> Search[Search APIs]
    External --> Parser[Document Parsers]
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🔗 Related Projects

- [MinerU](https://github.com/opendatalab/MinerU) - High-quality PDF document parsing
- [Next.js](https://nextjs.org/) - The React framework for production
- [Milvus](https://milvus.io/) - Vector database for AI applications
- [BullMQ](https://docs.bullmq.io/) - Premium message queue for NodeJS

## 📧 Contact & Support

- 💬 **Issues**: [GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)
- 📧 **Email**: wang-hao@shu.edu.cn
- 💼 **Organization**: [H!NT Lab](https://hint-lab.github.io/)

---

<div align="center">

### Built with ❤️ by the DeepMed Team

**Powered by Next.js, TypeScript, and AI**

© 2025 DeepMed Search. All rights reserved.

[⬆ Back to top](#-deepmed-search)

</div>
