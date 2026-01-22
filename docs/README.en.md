# DeepMed Search Documentation Center

> English | [中文](./README.md)

Welcome to the DeepMed Search Documentation Center! Find all project documentation here to help you get started quickly and understand the system in depth.

## 🚀 Quick Navigation

### Just Getting Started?

- **[Quick Start](../README.md#quick-start)** - Get up and running in 5 minutes locally
- **[Quick Deployment](./deployment/QUICKSTART.md)** - Deploy to server in 5-10 minutes

### Ready for Production?

- **[Production Deployment](./deployment/PRODUCTION.md)** - Complete production environment setup guide
- **[CI/CD Automation](./deployment/CICD.md)** - GitHub Actions automated deployment

### Need Help?

- **[Troubleshooting](./troubleshooting/)** - Common issues and solutions
- **[GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)** - Submit issues and suggestions

## 📚 Documentation Categories

### 🚢 Deployment

Quick deployment and production environment configuration guides.

| Document | Description | Level |
|----------|-------------|-------|
| **[Quick Deployment](./deployment/QUICKSTART.md)** | Deploy to server in 5-10 minutes | ⭐ Easy |
| **[Production Deployment](./deployment/PRODUCTION.md)** | Complete production setup with security hardening | ⭐⭐ Medium |
| **[CI/CD Automation](./deployment/CICD.md)** | GitHub Actions automated deployment | ⭐⭐⭐ Advanced |
| [Branching Strategy](./deployment/BRANCHING_STRATEGY.en.md) | Development and deployment branch management | ⭐ Easy |
| [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md) | Pre-production deployment checklist | ⭐⭐ Medium |
| [SSL/HTTPS Quick Setup](./deployment/SSL_QUICKSTART.en.md) | Enable HTTPS in 3 steps | ⭐ Easy |
| [Traefik SSL Setup](./deployment/TRAEFIK_SSL_SETUP.md) | Traefik reverse proxy and SSL configuration | ⭐⭐ Medium |
| [Docker Compose Usage](./deployment/DOCKER_COMPOSE_USAGE.zh-CN.md) | Docker Compose configuration guide | ⭐⭐ Medium |
| [Tencent Cloud Registry](./deployment/TENCENT_CLOUD_REGISTRY.md) | TCR setup and usage | ⭐⭐ Medium |

### ⚙️ Setup

System component configuration and feature setup.

| Document | Description |
|----------|-------------|
| **[OAuth Setup](./setup/OAUTH_SETUP.md)** | Google/GitHub OAuth configuration |
| **[Document Parser Setup](./setup/DOCUMENT_PARSER_SETUP.md)** | MarkItDown and MinerU configuration |
| [Encryption Key Setup](./setup/ENCRYPTION_KEY_SETUP.md) | API key encryption setup |
| [BullMQ Board Usage](./setup/BULLMQ_BOARD_USAGE.md) | Queue monitoring dashboard |
| [Attu Usage Guide](./setup/ATTU_USAGE.md) | Milvus vector database management |
| [Redis Queue Viewing](./setup/REDIS_QUEUE_VIEWING.md) | RedisInsight usage guide |
| [Real-time Progress](./setup/REALTIME_PROGRESS.md) | WebSocket progress configuration |
| [Progress Quick Start](./setup/PROGRESS_QUICKSTART.md) | Progress bar usage examples |

### 🛠️ Development

Developer guides and technical implementation details.

| Document | Description |
|----------|-------------|
| [Queue Service Migration](./development/QUEUE_SERVICE_MIGRATION.md) | BullMQ queue system architecture |
| [Search Config Implementation](./development/SEARCH_CONFIG_IMPLEMENTATION.md) | User-level search configuration |
| [Multi-LLM Config Update](./development/MULTI_LLM_CONFIG_UPDATE.md) | LLM configuration system |
| [User LLM Config](./development/USER_LLM_CONFIG_IMPLEMENTATION.md) | User-level LLM configuration |
| [Tools Analysis](./development/TOOLS_ANALYSIS.md) | Project tools and libraries analysis |
| [Development Summary](./development/SUMMARY.md) | Development history and architecture evolution |

### 🔧 Troubleshooting

Common issues and solutions.

| Document | Description |
|----------|-------------|
| [Google OAuth Fix](./troubleshooting/GOOGLE_OAUTH_FIX.md) | OAuth authentication common issues |

### 📖 Other Documentation

| Document | Description |
|----------|-------------|
| [Documentation Guide](./DOCUMENTATION_GUIDE.en.md) | How to write and maintain documentation |
| [Migration Summary](./MIGRATION_SUMMARY.md) | Project migration records |

## 🎯 Use Case Navigation

### Scenario 1: Local Development

1. Read [Main README](../README.md)
2. Follow quick start steps to set up local environment
3. Refer to [OAuth Setup](./setup/OAUTH_SETUP.md) for authentication
4. Refer to [Document Parser Setup](./setup/DOCUMENT_PARSER_SETUP.md) for document processing

### Scenario 2: Quick Demo

1. Use [Quick Deployment Guide](./deployment/QUICKSTART.md)
2. Complete deployment in 5-10 minutes
3. Access application and test features

### Scenario 3: Production Launch

1. Prepare: Review [Deployment Checklist](./deployment/DEPLOYMENT_CHECKLIST.md)
2. Deploy: Follow [Production Deployment Guide](./deployment/PRODUCTION.md)
3. Configure SSL: Refer to [SSL Quick Setup](./deployment/SSL_QUICKSTART.en.md)
4. Automate: Set up [CI/CD](./deployment/CICD.md)

### Scenario 4: Team Collaboration

1. Understand [Branching Strategy](./deployment/BRANCHING_STRATEGY.en.md)
2. Configure [CI/CD Automation](./deployment/CICD.md)
3. Set up code review process

## 💡 Tips

- **First Time**: Recommend running locally first, deploy to server after familiar with features
- **Production**: Must configure HTTPS and security hardening
- **Issues**: Check corresponding troubleshooting docs first
- **Updates**: Follow [GitHub Releases](https://github.com/hint-lab/deepmed-search/releases)

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Milvus Documentation](https://milvus.io/docs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

## 📧 Get Help

- 💬 **Questions**: [GitHub Discussions](https://github.com/hint-lab/deepmed-search/discussions)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)
- 📧 **Email**: wang-hao@shu.edu.cn
- 💼 **Organization**: [H!NT Lab](https://hint-lab.github.io/)

## 🤝 Contribute Documentation

Found documentation issues or want to improve documentation?

1. Fork the repository
2. Edit relevant documentation
3. Submit Pull Request

See [Documentation Contribution Guide](./DOCUMENTATION_GUIDE.en.md)

---

<div align="center">

**Welcome to DeepMed Search!**

If this project helps you, please give us a ⭐️

[⬆ Back to top](#deepmed-search-documentation-center)

</div>
