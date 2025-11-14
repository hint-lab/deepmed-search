# DeepMed Search Documentation Center

> English | [中文](./README.md)

Welcome to DeepMed Search Documentation Center! Here you'll find all project documentation to help you get started quickly and understand the system in depth.

## 📚 Documentation Categories

### 🚀 Deployment

Quick deployment and production environment configuration guides.

- **[SSL Quick Start Guide](./deployment/SSL_QUICKSTART.en.md)** ([中文](./deployment/SSL_QUICKSTART.md))
  - Enable HTTPS in 3 steps
  - Let's Encrypt automatic certificates
  - Quick configuration script

- **[Traefik SSL Detailed Setup](./deployment/TRAEFIK_SSL_SETUP.md)**
  - Traefik configuration guide
  - Certificate management
  - Security best practices

- **[Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)**
  - Pre-deployment checklist
  - Environment variables configuration
  - Security hardening recommendations
  - Monitoring and maintenance

- **[SSL Setup Script](./deployment/setup-ssl.sh)**
  - Automated configuration tool
  - DNS and firewall checks
  - One-click deployment

### ⚙️ Setup Guides

System component configuration and feature setup.

- **[OAuth Authentication Setup](./setup/OAUTH_SETUP.md)**
  - Google OAuth configuration
  - Authentication flow explanation
  - Environment variables setup

- **[Document Parser Setup](./setup/DOCUMENT_PARSER_SETUP.md)**
  - Markitdown configuration
  - MinerU configuration
  - GPU support

- **[Encryption Key Setup](./setup/ENCRYPTION_KEY_SETUP.md)**
  - Key generation
  - Secure storage
  - Key management

- **[Real-time Progress Configuration](./setup/REALTIME_PROGRESS.md)**
  - WebSocket configuration
  - Progress tracking setup

- **[Progress Feature Quick Start](./setup/PROGRESS_QUICKSTART.md)**
  - Progress bar integration
  - Usage examples

- **[BullMQ Board Usage](./setup/BULLMQ_BOARD_USAGE.md)**
  - Queue monitoring
  - Task management

- **[Attu Usage Guide](./setup/ATTU_USAGE.md)**
  - Milvus management interface
  - Vector database operations

- **[Redis Queue Viewing](./setup/REDIS_QUEUE_VIEWING.md)**
  - RedisInsight usage
  - Queue debugging

### 🛠️ Development

Developer guides and technical implementation details.

- **[Queue Service Migration Guide](./development/QUEUE_SERVICE_MIGRATION.md)**
  - Queue system architecture
  - Migration steps

- **[Search Configuration Implementation](./development/SEARCH_CONFIG_IMPLEMENTATION.md)**
  - Search engine integration
  - Configuration management

- **[Multi-LLM Configuration Update](./development/MULTI_LLM_CONFIG_UPDATE.md)**
  - Multi-model support
  - Configuration system

- **[User LLM Configuration Implementation](./development/USER_LLM_CONFIG_IMPLEMENTATION.md)**
  - User-level configuration
  - API key management

- **[Tools Analysis](./development/TOOLS_ANALYSIS.md)**
  - System tools analysis
  - Performance optimization

- **[Project Summary](./development/SUMMARY.md)**
  - Project overview
  - Technology stack
  - Architecture design

### 🔧 Troubleshooting

Common issues and solutions.

- **[Google OAuth Fix Guide](./troubleshooting/GOOGLE_OAUTH_FIX.md)**
  - OAuth login issues
  - Network problem resolution
  - Common errors

## 🎯 Quick Navigation

### I Want To...

- **Deploy to Production Quickly**
  1. [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
  2. [SSL Quick Start](./deployment/SSL_QUICKSTART.en.md)

- **Configure OAuth Login**
  - [OAuth Setup Guide](./setup/OAUTH_SETUP.md)

- **Configure Document Parsing**
  - [Document Parser Setup](./setup/DOCUMENT_PARSER_SETUP.md)

- **Monitor Queue Tasks**
  - [BullMQ Board Usage](./setup/BULLMQ_BOARD_USAGE.md)
  - [Redis Queue Viewing](./setup/REDIS_QUEUE_VIEWING.md)

- **Develop New Features**
  - [Development Documentation](./development/)

- **Solve Problems**
  - [Troubleshooting](./troubleshooting/)

## 📖 By Role

### System Administrator

1. **Deployment and Maintenance**
   - [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
   - [Traefik SSL Setup](./deployment/TRAEFIK_SSL_SETUP.md)
   
2. **Monitoring and Management**
   - [BullMQ Board](./setup/BULLMQ_BOARD_USAGE.md)
   - [Attu Management Interface](./setup/ATTU_USAGE.md)

### Developer

1. **Getting Started**
   - [Project Summary](./development/SUMMARY.md)
   - [Architecture Documentation](./development/)

2. **Feature Integration**
   - [Search Configuration](./development/SEARCH_CONFIG_IMPLEMENTATION.md)
   - [LLM Configuration](./development/MULTI_LLM_CONFIG_UPDATE.md)

### User

1. **Feature Configuration**
   - [OAuth Login Setup](./setup/OAUTH_SETUP.md)
   - [Document Parser Configuration](./setup/DOCUMENT_PARSER_SETUP.md)

## 📦 Module Documentation

Documentation for individual project modules:

- [Document Parser](../src/lib/document-parser/README.md)
- [Document Tracker](../src/lib/document-tracker/README.md)
- [Text Cleaner](../src/lib/text-cleaner/README.md)
- [LLM Provider](../src/lib/llm-provider/README.md)
- [Markitdown Integration](../src/lib/markitdown/README.md)
- [MinerU Integration](../src/lib/mineru/README.md)

## 🐳 Docker Related

- [Docker Mirror Setup](../docker/MIRROR_SETUP.md)
- [MinerU Optimization Guide](../docker/mineru/OPTIMIZATION.md)
- [MinerU Docker Guide](../docker/mineru/README.md)

## 🌐 Language Support

This documentation is available in both Chinese and English:

- Chinese: `*.md`
- English: `*.en.md`

Some documents are still being translated. Contributions are welcome!

## 🤝 Contributing to Documentation

To improve documentation:

1. Fork the project
2. Create a documentation branch
3. Submit improvements
4. Create a Pull Request

Documentation guidelines:
- Use Markdown format
- Provide bilingual versions (Chinese & English) when applicable
- Include clear examples and screenshots
- Keep directory structure clean

## 📮 Feedback

For documentation issues or suggestions:
- Submit an Issue
- Contact project maintainers
- Join discussions

---

**Last Updated**: 2024-11-14

