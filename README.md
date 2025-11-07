# DeepMed Search

> **Note:** This project is still a work in progress. Some features may be incomplete or subject to change.

English | [中文](./README.zh-CN.md)

DeepMed Search is a versatile search application built with the Next.js App Router, featuring a unified interface for Web Search, LLM Introspection, and Knowledge Base (KB) Search.

## ✨ Features

### Unified Search Interface
- Single search bar with tabs to seamlessly switch between three search modes
- Modern responsive design that adapts to all devices
- Smooth interaction experience

### Web Search
- Support for multiple search engines:
  - **Tavily**: AI-optimized search engine
  - **Jina**: Intelligent web content extraction
  - **DuckDuckGo**: Privacy-focused search
- Real-time web information retrieval
- Clear display of search results

### LLM Introspection
- Support for major language models:
  - **GPT** (OpenAI)
  - **DeepSeek**
  - **Gemini** (Google)
- Direct answers based on model's internal knowledge
- Quick access to structured responses

### Knowledge Base Search
- **Intelligent Retrieval**: Precise search based on semantic similarity
- **Hybrid Search**: Combines vector search and BM25 full-text search, balancing semantic understanding and keyword matching
- **Chinese Optimization**: Native Chinese search support using pg_jieba segmentation
- **Detailed Results**: Displays source document, relevance score, page number, and more
- **Interactive Experience**: Click results to view full text chunks and details

### Knowledge Base Management
- Create and manage multiple knowledge bases
- Upload and process documents (PDF, DOCX, TXT, etc.)
- Automatic vector embedding generation
- View and delete knowledge base content

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui, Radix UI
- **Icons**: Lucide Icons
- **Internationalization**: react-i18next, i18next
- **Forms**: React Hook Form, Zod
- **File Upload**: react-dropzone

### Backend
- **Runtime**: Next.js Server Actions
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Vector Storage**: pgvector extension
- **Chinese Segmentation**: pg_jieba extension

### External Services
- **Embedding Model**: OpenAI API (or compatible)
- **Search Services**: Tavily, Jina, DuckDuckGo
- **LLM Services**: GPT, DeepSeek, Gemini
- **File Storage**: MinIO (optional)
- **Cache**: Redis (optional)

### Development Tools
- **Code Standards**: ESLint, Prettier
- **Git Hooks**: Husky

## 📐 System Architecture

```mermaid
graph TD
    subgraph Frontend["Frontend (Next.js)"]
        UI["User Interface<br/>(React Components)"]
        Hooks["Hooks & Context<br/>(State Management)"]
    end

    subgraph Backend["Backend (Next.js Server)"]
        Actions["Server Actions<br/>(Request Handling)"]
        Lib["Core Libraries<br/>(Business Logic)"]
        Auth["Authentication<br/>(NextAuth)"]
    end

    subgraph Storage["Data Storage"]
        PG["PostgreSQL<br/>(pgvector + pg_jieba)"]
        Files["File Storage<br/>(MinIO)"]
    end

    subgraph External["External Services"]
        OpenAI["OpenAI API<br/>(Embeddings)"]
        SearchAPI["Search APIs<br/>(Tavily/Jina/DuckDuckGo)"]
        LLMAPI["LLM APIs<br/>(GPT/DeepSeek/Gemini)"]
    end

    %% Connections
    UI <--> Hooks
    Hooks --> Actions
    Actions --> Lib
    Lib --> PG
    Lib --> Files
    Lib --> OpenAI
    Lib --> SearchAPI
    Lib --> LLMAPI
    Auth <--> PG

    %% Styles
    classDef frontend fill:#D1E8FF,stroke:#333
    classDef backend fill:#E0E0E0,stroke:#333
    classDef database fill:#FFF2CC,stroke:#333
    classDef external fill:#FFD1DC,stroke:#333

    class Frontend frontend
    class Backend backend
    class Storage database
    class External external
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+ (or use Docker)

### 1. Clone the Project

```bash
git clone <repository-url>
cd deepmed-search
```

### 2. Start Dependencies

This project uses Docker Compose to manage development environment dependencies, including PostgreSQL, Redis, and MinIO.

#### Start All Services

```bash
# Start all services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Or start only specific services
docker-compose up -d postgres redis
```

#### Check Service Status

```bash
# View all service status
docker-compose ps

# View service logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f minio
```

#### Stop and Restart Services

```bash
# Stop all services
docker-compose stop

# Restart services
docker-compose restart

# Stop and remove containers (keep data)
docker-compose down

# Complete cleanup (including data volumes, use with caution!)
docker-compose down -v
```

#### Service Description

- **PostgreSQL**: Pre-installed with pgvector and pg_jieba extensions for vector search and Chinese word segmentation
- **Redis**: Used for caching and queue system (optional)
- **MinIO**: S3-compatible object storage for document files (optional)

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

```bash
# Copy environment variable template
cp .env.example .env.local
```

Edit `.env.local` and configure the following required items:

```bash
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"

# NextAuth authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OpenAI API (for generating embeddings, required for KB search)
OPENAI_API_KEY="your-openai-api-key"
OPENAI_BASE_URL="https://api.openai.com/v1"

# Web search APIs
TAVILY_API_KEY="your-tavily-api-key"
JINA_API_KEY="your-jina-api-key"

# Optional: Other LLM APIs
# DEEPSEEK_API_KEY="your-deepseek-api-key"
# GEMINI_API_KEY="your-gemini-api-key"

# Optional: MinIO file storage
# MINIO_ENDPOINT="localhost:9000"
# MINIO_ACCESS_KEY="minioadmin"
# MINIO_SECRET_KEY="minioadmin"
```

### 4. Initialize Database

```bash
# Run database migrations
npx prisma migrate dev
# or
yarn db:migrate

# Initialize PostgreSQL extensions
yarn db:init

# Verify extension installation
yarn db:test
```

### 5. Create Test User

```bash
# Create default test user
npm run create:user
# or
yarn create:user
```

This will create the following test account:

| Field | Value |
|-------|-------|
| Email | `test@example.com` |
| Password | `password123` |
| Name | Test User |
| Language | Chinese (zh) |

> **Note**: First run will automatically create a test tenant and test user. If the user already exists, the creation will be skipped.

### 6. Start Development Server

```bash
npm run dev
# or
yarn dev
```

Visit http://localhost:3000 to start using the application!

### 7. Login to the System

1. Open your browser and visit http://localhost:3000
2. Click the login button
3. Use the test account to login:
   - **Email**: `test@example.com`
   - **Password**: `password123`

### Service Access Points

| Service | Address | Credentials |
|---------|---------|-------------|
| **Application** | http://localhost:3000 | See test account above |
| **PostgreSQL** | `localhost:5432` | User: `postgres`<br/>Password: `postgres`<br/>Database: `deepmed` |
| **Redis** | `localhost:6379` | No password |
| **MinIO API** | http://localhost:9000 | User: `minioadmin`<br/>Password: `minioadmin` |
| **MinIO Console** | http://localhost:9001 | User: `minioadmin`<br/>Password: `minioadmin` |
| **Prisma Studio** | http://localhost:5555 | Access after running `yarn db:studio` |

## 📖 Development Guide

### Database Management

#### Create Migration

```bash
# Generate migration after modifying schema.prisma
npx prisma migrate dev --name <migration-name>
```

#### View Database

```bash
# Start Prisma Studio
yarn db:studio
```

### Knowledge Base Vector Search

#### How It Works

Knowledge base search is based on vector embedding technology:

1. **Document Upload**: Users upload documents (PDF, DOCX, TXT, etc.)
2. **Text Extraction**: System extracts text content from documents
3. **Chunking**: Long texts are split into appropriately sized chunks
4. **Generate Embeddings**: OpenAI API generates vector representations for each text chunk
5. **Store Vectors**: Vectors are stored in PostgreSQL (using pgvector extension)
6. **Retrieve Matches**: During search, query text is also converted to vectors, and most relevant text chunks are found through cosine similarity

#### Search Modes

The application supports three search modes:

1. **Vector Search**
   - Based on semantic similarity
   - Understands synonyms and context
   - Suitable for conceptual questions

2. **Full-Text Search**
   - Based on BM25 algorithm
   - Precise keyword matching
   - Suitable for finding specific terms

3. **Hybrid Search** (Recommended)
   - Combines vector search and full-text search
   - Balances semantic understanding and keyword matching
   - Suitable for most use cases

#### Adjust Search Parameters

You can adjust search parameters in `src/lib/pgvector/operations.ts`:

```typescript
// Weight configuration
bm25Weight: 0.3,      // Full-text search weight
vectorWeight: 0.7,    // Vector search weight

// Threshold configuration
bm25Threshold: 0.1,   // Minimum score for full-text search
vectorThreshold: 0.3, // Minimum similarity for vector search
minSimilarity: 0.3,   // Final result minimum similarity

// Result count
limit: 10             // Number of results to return
```

#### PostgreSQL Extensions

The project uses two key PostgreSQL extensions:

- **pgvector**: Vector storage and similarity search
- **pg_jieba**: Chinese word segmentation for better Chinese full-text search support

### Adding UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) component library:

```bash
# Add new component
npx shadcn@latest add <component-name>

# Example: Add button component
npx shadcn@latest add button
```

Components will be automatically added to the `src/components/ui` directory.

### Code Standards

```bash
# Run code linting
yarn lint

# Auto-fix issues
yarn lint --fix
```

## 📝 Available Scripts

```bash
# Development
yarn dev              # Start development server
yarn build            # Build for production
yarn start            # Start production server

# Code Quality
yarn lint             # Run code linting
yarn test             # Run tests (if configured)

# Database
yarn db:generate      # Generate Prisma Client
yarn db:migrate       # Run database migrations
yarn db:push          # Push schema to database (dev)
yarn db:studio        # Start Prisma Studio
yarn db:init          # Initialize PostgreSQL extensions
yarn db:test          # Test database extensions

# Utilities
yarn create:user      # Create test user (if exists)
```

## 🔧 Troubleshooting

### Knowledge Base Search Returns Empty Results

#### 1. Check Database Extensions

```bash
# Test if extensions are correctly installed
yarn db:test
```

If the test fails, reinitialize:

```bash
yarn db:init
```

#### 2. Adjust Search Parameters

In `src/lib/pgvector/operations.ts`:

- **Lower `minSimilarity` threshold**: Get more results (but may be less relevant)
- **Adjust weight ratios**:
  - Increase `vectorWeight`: Emphasize semantic understanding
  - Increase `bm25Weight`: Emphasize keyword matching
- **Chinese search suggestion**: Use hybrid mode with lower thresholds

#### 3. Rebuild Indexes

```bash
# Recreate database indexes
psql $DATABASE_URL -f scripts/chunk.sql
```

#### 4. Check Embedding Model Configuration

Ensure correct configuration in `.env.local`:

```bash
OPENAI_API_KEY="your-key"
OPENAI_BASE_URL="https://api.openai.com/v1"
```

Test API connection:

```bash
curl $OPENAI_BASE_URL/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

#### 5. Chinese Search Optimization Tips

- Use **short and clear** keywords
- Try **different phrasings**
- Use **hybrid search** mode
- Appropriately lower similarity thresholds

### Docker Service Issues

```bash
# View container logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres

# Complete reset (Warning: will delete all data)
docker-compose down -v
docker-compose up -d postgres
```

### Database Connection Issues

Check connection string format:

```bash
# Correct format
DATABASE_URL="postgresql://username:password@host:port/database"

# Example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"
```

## 💡 Usage Examples

### Create Knowledge Base and Upload Documents

1. **Start Services**

```bash
# Start database
docker-compose up -d postgres

# Start application
yarn dev
```

2. **Create Knowledge Base**

- Visit `/knowledge` page
- Click "Create Knowledge Base" button
- Fill in knowledge base information:
  - Name: e.g., "Medical Literature"
  - Description: Explain the purpose
  - Other configurations (optional)
- Confirm creation

3. **Upload Documents**

- Enter knowledge base details page
- Switch to "Documents" tab
- Drag and drop files or click to upload
- Supported formats: PDF, DOCX, TXT, Markdown
- Wait for document processing (generating vector embeddings)

4. **Search Knowledge Base**

- Visit home page `/search`
- Select "Knowledge Base" tab
- Select knowledge base from dropdown
- Enter query
- View search results

### Using Web Search

```bash
# 1. Visit home page
http://localhost:3000

# 2. Select "Web Search" tab

# 3. Choose search engine:
#    - Tavily: Fastest, AI-optimized
#    - Jina: Most complete content extraction
#    - DuckDuckGo: Privacy-focused

# 4. Enter query and search
```

### Using LLM Q&A

```bash
# 1. Select "LLM" tab

# 2. Choose model:
#    - GPT: Most versatile
#    - DeepSeek: Good Chinese performance
#    - Gemini: Large context window

# 3. Enter question
# 4. Get structured answer
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 📧 Contact

For questions or suggestions, feel free to open an Issue or Pull Request.

---

<div align="center">

**Built with ❤️ by [H!NT Lab](https://hint-lab.github.io/)**

© 2025 DeepMed Search. All rights reserved.

</div>
