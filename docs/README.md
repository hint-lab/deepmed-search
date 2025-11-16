# DeepMed Search 文档中心

> [English](./README.en.md) | 中文

欢迎来到 DeepMed Search 文档中心！这里包含了项目的所有文档，帮助您快速上手和深入了解系统。

## 🚀 快速导航

### 刚开始使用？

- **[快速开始](../README.zh-CN.md#快速开始)** - 5分钟快速上手，本地运行应用
- **[快速部署](./deployment/QUICKSTART.zh-CN.md)** - 5-10分钟部署到服务器

### 准备上线？

- **[生产环境部署](./deployment/PRODUCTION.zh-CN.md)** - 完整的生产环境配置指南
- **[CI/CD 自动部署](./deployment/CICD.zh-CN.md)** - GitHub Actions 自动化部署

### 需要帮助？

- **[故障排查](./troubleshooting/)** - 常见问题和解决方案
- **[GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)** - 提交问题和建议

## 📚 文档分类

### 🚢 部署相关 (Deployment)

快速部署和生产环境配置指南。

| 文档 | 说明 | 难度 |
|------|------|------|
| **[快速部署](./deployment/QUICKSTART.zh-CN.md)** | 5-10分钟快速部署到服务器 | ⭐ 简单 |
| **[生产环境部署](./deployment/PRODUCTION.zh-CN.md)** | 完整的生产环境配置，包含安全加固 | ⭐⭐ 中等 |
| **[CI/CD 自动部署](./deployment/CICD.zh-CN.md)** | GitHub Actions 自动化部署配置 | ⭐⭐⭐ 高级 |
| [分支策略](./deployment/BRANCHING_STRATEGY.md) | 开发和部署分支管理策略 | ⭐ 简单 |
| [部署检查清单](./deployment/DEPLOYMENT_CHECKLIST.md) | 生产部署前必查项目 | ⭐⭐ 中等 |
| [SSL/HTTPS 快速配置](./deployment/SSL_QUICKSTART.md) | 3步启用 HTTPS | ⭐ 简单 |
| [Traefik SSL 详细配置](./deployment/TRAEFIK_SSL_SETUP.md) | Traefik 反向代理和SSL配置 | ⭐⭐ 中等 |
| [Docker Compose 使用](./deployment/DOCKER_COMPOSE_USAGE.zh-CN.md) | Docker Compose 配置说明 | ⭐⭐ 中等 |
| [腾讯云容器镜像服务](./deployment/TENCENT_CLOUD_REGISTRY.md) | TCR 配置和使用 | ⭐⭐ 中等 |

### ⚙️ 功能配置 (Setup)

系统组件配置和功能设置。

| 文档 | 说明 |
|------|------|
| **[OAuth 认证设置](./setup/OAUTH_SETUP.md)** | Google/GitHub OAuth 配置 |
| **[文档解析器设置](./setup/DOCUMENT_PARSER_SETUP.md)** | MarkItDown 和 MinerU 配置 |
| [加密密钥设置](./setup/ENCRYPTION_KEY_SETUP.md) | API 密钥加密配置 |
| [BullMQ 队列面板](./setup/BULLMQ_BOARD_USAGE.md) | 队列监控界面使用 |
| [Attu 使用指南](./setup/ATTU_USAGE.md) | Milvus 向量数据库管理 |
| [Redis 队列查看](./setup/REDIS_QUEUE_VIEWING.md) | RedisInsight 使用指南 |
| [实时进度配置](./setup/REALTIME_PROGRESS.md) | WebSocket 进度推送配置 |
| [进度功能快速开始](./setup/PROGRESS_QUICKSTART.md) | 进度条使用示例 |

### 🛠️ 开发文档 (Development)

开发者指南和技术实现细节。

| 文档 | 说明 |
|------|------|
| [队列服务迁移指南](./development/QUEUE_SERVICE_MIGRATION.md) | BullMQ 队列系统架构 |
| [搜索配置实现](./development/SEARCH_CONFIG_IMPLEMENTATION.md) | 用户级搜索配置 |
| [多 LLM 配置更新](./development/MULTI_LLM_CONFIG_UPDATE.md) | LLM 配置系统 |
| [用户 LLM 配置实现](./development/USER_LLM_CONFIG_IMPLEMENTATION.md) | 用户级 LLM 配置 |
| [工具分析](./development/TOOLS_ANALYSIS.md) | 项目工具和库分析 |
| [开发总结](./development/SUMMARY.md) | 开发历程和架构演进 |

### 🔧 故障排查 (Troubleshooting)

常见问题和解决方案。

| 文档 | 说明 |
|------|------|
| [Google OAuth 问题修复](./troubleshooting/GOOGLE_OAUTH_FIX.md) | OAuth 认证常见问题 |

### 📖 其他文档

| 文档 | 说明 |
|------|------|
| [文档指南](./DOCUMENTATION_GUIDE.md) | 如何编写和维护文档 |
| [迁移总结](./MIGRATION_SUMMARY.md) | 项目迁移记录 |

## 🎯 使用场景导航

### 场景 1：本地开发

1. 阅读 [主 README](../README.zh-CN.md)
2. 按照快速开始步骤设置本地环境
3. 参考 [OAuth 配置](./setup/OAUTH_SETUP.md) 配置认证
4. 参考 [文档解析器配置](./setup/DOCUMENT_PARSER_SETUP.md) 设置文档处理

### 场景 2：快速演示

1. 使用 [快速部署指南](./deployment/QUICKSTART.zh-CN.md)
2. 5-10分钟完成部署
3. 访问应用并测试功能

### 场景 3：生产环境上线

1. 准备：查看 [部署检查清单](./deployment/DEPLOYMENT_CHECKLIST.md)
2. 部署：按照 [生产环境部署指南](./deployment/PRODUCTION.zh-CN.md) 操作
3. 配置 SSL：参考 [SSL 快速配置](./deployment/SSL_QUICKSTART.md)
4. 自动化：配置 [CI/CD](./deployment/CICD.zh-CN.md)

### 场景 4：团队协作

1. 了解 [分支策略](./deployment/BRANCHING_STRATEGY.md)
2. 配置 [CI/CD 自动部署](./deployment/CICD.zh-CN.md)
3. 设置代码审查流程

## 💡 提示

- **初次使用**：建议先本地运行，熟悉功能后再部署到服务器
- **生产部署**：务必配置 HTTPS 和做好安全加固
- **遇到问题**：先查看对应的故障排查文档
- **持续更新**：关注 [GitHub Releases](https://github.com/hint-lab/deepmed-search/releases)

## 🔗 外部资源

- [Next.js 文档](https://nextjs.org/docs)
- [Docker 文档](https://docs.docker.com/)
- [Milvus 文档](https://milvus.io/docs)
- [BullMQ 文档](https://docs.bullmq.io/)
- [Prisma 文档](https://www.prisma.io/docs)

## 📧 获取帮助

- 💬 **提问**：[GitHub Discussions](https://github.com/hint-lab/deepmed-search/discussions)
- 🐛 **报告问题**：[GitHub Issues](https://github.com/hint-lab/deepmed-search/issues)
- 📧 **邮件**：wang-hao@shu.edu.cn
- 💼 **组织**：[H!NT Lab](https://hint-lab.github.io/)

## 🤝 贡献文档

发现文档问题或想要改进文档？

1. Fork 仓库
2. 编辑相关文档
3. 提交 Pull Request

详见 [文档贡献指南](./DOCUMENTATION_GUIDE.md)

---

<div align="center">

**欢迎使用 DeepMed Search！**

如果这个项目对您有帮助，请给我们一个 ⭐️

[⬆ 回到顶部](#deepmed-search-文档中心)

</div>
