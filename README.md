# DeepMed Search

> **Note:** This project is still a work in progress. Some features may be incomplete or subject to change.

English | [中文](./README.zh-CN.md)

DeepMed Search is a versatile search application built with the Next.js App Router, featuring a unified interface for Web Search, LLM Introspection, and Knowledge Base (KB) Search.

## 🎬 Product Demo

All in one flow demo:

![DeepMed Search Demo](./public/demo.gif)

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
- **Vector Optimization**: Uses Milvus professional vector database for high-performance retrieval
- **Detailed Results**: Displays source document, relevance score, page number, and more
- **Interactive Experience**: Click results to view full text chunks and details

### Knowledge Base Management
- Create and manage multiple knowledge bases
- Upload and process documents (PDF, DOCX, TXT, etc.)
- Automatic vector embedding generation
- View and delete knowledge base content

### Deep Research
- **AI-Powered Research**: Autonomous research agent for comprehensive topic exploration
- **Multi-Step Process**: Automatically generates research questions, searches, analyzes, and synthesizes information
- **Queue System**: Background task processing with BullMQ and Redis
- **Real-Time Progress**: Server-Sent Events (SSE) for live status updates
- **User-Isolated Configuration**: Each user's API keys are securely isolated using AsyncLocalStorage

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
- **Database**: PostgreSQL (structured data)
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Vector Database**: Milvus (vector storage and retrieval)
- **AI SDK**: Vercel AI SDK (@ai-sdk/openai)
- **Queue System**: BullMQ + Redis (background task processing)
- **Context Isolation**: AsyncLocalStorage (concurrent user task isolation)
- **Encryption**: User API keys encrypted in database

### External Services
- **AI Services**: Vercel AI SDK with OpenAI provider (embeddings and chat)
- **Search Services**: Tavily, Jina, DuckDuckGo
- **LLM Providers**: OpenAI, DeepSeek, Google Vertex AI
- **Document Processing**: Supports three parser types:
  - **MarkItDown Docker**: Multi-format document parsing (PDF, DOCX, PPT, images, etc.)
  - **MinerU Docker**: High-quality PDF parsing (self-hosted)
  - **MinerU Cloud**: Cloud-based PDF parsing service
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
        Settings["Settings Pages<br/>(LLM/Search/Document)"]
    end

    subgraph Backend["Backend (Next.js Server)"]
        Actions["Server Actions<br/>(Request Handling)"]
        API["API Routes<br/>(Queue/Status)"]
        Lib["Core Libraries<br/>(Business Logic)"]
        Auth["Authentication<br/>(NextAuth v5)"]
        Context["AsyncLocalStorage<br/>(User Context Isolation)"]
    end

    subgraph Queue["Queue System"]
        BullMQ["BullMQ<br/>(Task Queue)"]
        Worker["Queue Worker<br/>(Background Processing)"]
        Redis["Redis<br/>(Queue Backend)"]
    end

    subgraph Storage["Data Storage"]
        PG["PostgreSQL<br/>(Users, Encrypted Keys, etc.)"]
        Milvus["Milvus<br/>(Vector Database)"]
        MinIO["MinIO<br/>(Files + Vectors)"]
    end

    subgraph External["External Services (User-Configured)"]
        LLMProviders["LLM Providers<br/>(OpenAI/DeepSeek/Google)"]
        SearchAPI["Search APIs<br/>(Tavily/Jina/NCBI)"]
        DocParser["Document Parsers<br/>(MarkItDown/MinerU)"]
        AISDK["Vercel AI SDK<br/>(Vector Embeddings)"]
    end

    %% Frontend Connections
    UI --> Actions
    UI --> API
    Settings --> Actions

    %% Backend Connections
    Actions --> Lib
    API --> BullMQ
    Actions --> PG
    Auth <--> PG
    Lib --> Context
    
    %% Queue Connections
    BullMQ <--> Redis
    BullMQ --> Worker
    Worker --> Context
    Context --> PG
    
    %% Worker to External Services
    Worker --> LLMProviders
    Worker --> SearchAPI
    Worker --> DocParser
    
    %% Storage Connections
    Lib --> PG
    Lib --> Milvus
    Lib --> MinIO
    Worker --> PG
    Worker --> Milvus
    
    %% External Service Connections
    Lib --> AISDK
    Lib --> LLMProviders
    Lib --> SearchAPI

    %% Styles
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

- **PostgreSQL**: Stores structured data (users, documents, knowledge bases, encrypted API keys, etc.)
- **Milvus**: Professional vector database for high-performance vector retrieval
- **Redis**: Used for caching and BullMQ queue system (required for Deep Research)
- **MinIO**: S3-compatible object storage for file storage and Milvus vector persistence
- **MarkItDown**: Document parser service for multi-format document processing (port 5001)
- **MinerU**: Document parser service for high-quality PDF processing (port 8000)
- **Queue Worker**: Background worker for processing Deep Research and document conversion tasks

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

Edit `.env.local` and configure the following **infrastructure-related** items:

```bash
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"

# NextAuth authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Encryption key for storing user API keys securely
ENCRYPTION_KEY="your-encryption-key-32-chars-min"

# Redis (for queue system)
REDIS_URL="redis://localhost:6379"


# Optional: MinIO file storage
# MINIO_ENDPOINT="localhost:9000"
# MINIO_ACCESS_KEY="minioadmin"
# MINIO_SECRET_KEY="minioadmin"
```

> **🔐 User-Configured API Keys**
> 
> **LLM API Keys, Search API Keys, and Document Parser settings are now configured per-user in the web interface** (not in `.env` file):
> 
> 1. Start the application
> 2. Login with your account
> 3. Visit Settings pages:
>    - **`/settings/llm`** - Configure LLM providers (DeepSeek, OpenAI, Google)
>    - **`/settings/search`** - Configure search providers (Tavily, Jina, NCBI)
>    - **`/settings/document`** - Configure document parser (MarkItDown, MinerU, MinerU Cloud)
> 4. Each user's API keys are encrypted and stored in the database
> 5. **Concurrent tasks are isolated** using AsyncLocalStorage - multiple users can run tasks simultaneously with their own API keys
> 
> This approach provides:
> - ✅ **Multi-tenant support** - Each user has their own API keys
> - ✅ **Security** - API keys are encrypted in the database
> - ✅ **Concurrency safety** - AsyncLocalStorage ensures task isolation
> - ✅ **Flexibility** - Users can switch providers anytime

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

### 7. Start Queue Worker (for Deep Research)

To use Deep Research features, start the queue worker in a **separate terminal**:

```bash
# Build the worker
npm run build:worker
# or
yarn build:worker

# Start the worker (in a new terminal)
node dist/index.cjs
```

Or use Docker Compose:

```bash
# Start queue worker service
docker-compose up -d queue-worker

# View worker logs
docker-compose logs -f queue-worker
```

The queue worker processes background tasks such as:
- Deep Research tasks
- Document conversion tasks

### 8. Login to the System

1. Open your browser and visit http://localhost:3000
2. Click the login button
3. Use the test account to login:
   - **Email**: `test@example.com`
   - **Password**: `password123`

### 9. Configure Your API Keys

After logging in, configure your personal API keys in the Settings pages:

1. **LLM Configuration** (`/settings/llm`):
   - Add LLM providers (DeepSeek, OpenAI, Google Gemini)
   - Configure API keys and base URLs
   - Set default models
   - Test and activate configurations

2. **Search Configuration** (`/settings/search`):
   - Choose search provider (Tavily or Jina)
   - Configure Tavily API Key (for Tavily search)
   - Configure Jina API Key (for Jina search and content extraction)
   - Configure NCBI API Key (optional, for PubMed searches)

3. **Document Parser Configuration** (`/settings/document`):
   - Choose parser type:
     - **MarkItDown** (Docker): Multi-format document parsing
     - **MinerU** (Docker): High-quality PDF parsing with OCR
     - **MinerU Cloud**: Cloud-based parsing service (requires API key)
   - Configure MinerU API Key (if using MinerU Cloud)

> 🔒 **Security**: All API keys are encrypted before being stored in the database using the `ENCRYPTION_KEY` from your `.env` file.

### Service Access Points

| Service | Address | Credentials |
|---------|---------|-------------|
| **Application** | http://localhost:3000 | See test account above |
| **PostgreSQL** | `localhost:5432` | User: `postgres`<br/>Password: `postgres`<br/>Database: `deepmed` |
| **Milvus** | `localhost:19530` | gRPC endpoint for vector operations |
| **Attu (Milvus UI)** | http://localhost:8000 | Milvus administration interface |
| **Redis** | `localhost:6379` | No password |
| **MinIO API** | http://localhost:9000 | User: `minioadmin`<br/>Password: `minioadmin` |
| **MinIO Console** | http://localhost:9001 | User: `minioadmin`<br/>Password: `minioadmin` |
| **MarkItDown** | http://localhost:5001 | Document parser API |
| **MinerU Docker** | http://localhost:8000 | Document parser API (if enabled) |
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
2. **Text Extraction**: System extracts text content from documents using configured parser (MarkItDown or MinerU)
3. **Chunking**: Long texts are split into appropriately sized chunks
4. **Generate Embeddings**: Vercel AI SDK (with OpenAI provider) generates vector representations for each text chunk
5. **Store Vectors**: Vectors are stored in Milvus vector database
6. **Retrieve Matches**: During search, query text is also converted to vectors, and most relevant text chunks are found through similarity search

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

You can adjust search parameters in `src/lib/milvus/operations.ts`:

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

#### Milvus Vector Database

The project uses Milvus as the professional vector database:

- **High Performance**: Optimized for large-scale vector similarity search
- **Scalability**: Supports billions of vectors with distributed architecture
- **Multiple Index Types**: HNSW, IVF_FLAT, IVF_SQ8, etc.
- **Flexible Deployment**: Standalone or cluster mode

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

# Queue Worker
yarn build:worker     # Build queue worker
yarn worker           # Start queue worker (after build)

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

In `src/lib/milvus/operations.ts`:

- **Lower similarity threshold**: Get more results (but may be less relevant)
- **Adjust search parameters**:
  - `nprobe`: Number of units to query (higher = more accurate but slower)
  - `ef`: Size of the dynamic candidate list (for HNSW index)
  - `topK`: Number of results to return

#### 3. Check Milvus Connection

```bash
# Check Milvus service status
docker-compose ps milvus-standalone

# View Milvus logs
docker-compose logs -f milvus-standalone
```

#### 4. Rebuild Milvus Collection

```bash
# If vector data is corrupted, you may need to recreate the collection
# This will delete all vectors, so use with caution
```

#### 5. Check Embedding Model Configuration

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

#### 6. Search Optimization Tips

- Use **short and clear** keywords
- Try **different phrasings**
- Appropriately lower similarity thresholds
- Ensure vectors are properly indexed in Milvus

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

# Start document parser (choose one)
# Option 1: MarkItDown (recommended for multi-format documents)
docker-compose up -d markitdown

# Option 2: MinerU Docker (for high-quality PDF parsing)
# docker-compose up -d mineru

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

### Using Deep Research

```bash
# 1. Ensure queue worker is running:
docker-compose up -d queue-worker
# OR in development:
node dist/index.cjs

# 2. Visit Deep Research page:
http://localhost:3000/research

# 3. Enter your research topic/question

# 4. The AI agent will:
#    - Generate research questions
#    - Search for relevant information
#    - Analyze and synthesize findings
#    - Generate a comprehensive report

# 5. Monitor real-time progress via SSE
#    - See current step and status
#    - View intermediate results
#    - Track token usage

# 6. Download the final report
```

**Deep Research Features:**
- **Autonomous Research**: AI agent breaks down complex topics into research questions
- **Multi-Source Information**: Searches web, knowledge bases, and academic databases
- **Citation Tracking**: All claims are cited with source links
- **Real-Time Updates**: Server-Sent Events for live progress monitoring
- **Background Processing**: Long-running tasks handled by queue worker
- **User Isolation**: Each user's API keys and configurations are securely isolated

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
