# DeepMed Search 文档中心

> [English](./README.en.md) | 中文

欢迎来到 DeepMed Search 文档中心！这里包含了项目的所有文档，帮助您快速上手和深入了解系统。

## 📚 文档分类

### 🚀 部署相关 (Deployment)

快速部署和生产环境配置指南。

- **[SSL 快速启动指南](./deployment/SSL_QUICKSTART.md)** ([English](./deployment/SSL_QUICKSTART.en.md))
  - 3 步启用 HTTPS
  - Let's Encrypt 自动证书
  - 快速配置脚本

- **[Traefik SSL 详细配置](./deployment/TRAEFIK_SSL_SETUP.md)**
  - Traefik 配置说明
  - 证书管理
  - 安全最佳实践

- **[部署检查清单](./deployment/DEPLOYMENT_CHECKLIST.md)**
  - 部署前必检项
  - 环境变量配置
  - 安全加固建议
  - 监控和维护

- **[SSL 配置脚本](./deployment/setup-ssl.sh)**
  - 自动化配置工具
  - DNS 和防火墙检查
  - 一键部署

### ⚙️ 设置指南 (Setup)

系统组件配置和功能设置。

- **[OAuth 认证设置](./setup/OAUTH_SETUP.md)**
  - Google OAuth 配置
  - 认证流程说明
  - 环境变量配置

- **[文档解析器设置](./setup/DOCUMENT_PARSER_SETUP.md)**
  - Markitdown 配置
  - MinerU 配置
  - GPU 支持

- **[加密密钥设置](./setup/ENCRYPTION_KEY_SETUP.md)**
  - 密钥生成
  - 安全存储
  - 密钥管理

- **[实时进度配置](./setup/REALTIME_PROGRESS.md)**
  - WebSocket 配置
  - 进度追踪设置

- **[进度功能快速开始](./setup/PROGRESS_QUICKSTART.md)**
  - 进度条集成
  - 使用示例

- **[BullMQ 队列面板](./setup/BULLMQ_BOARD_USAGE.md)**
  - 队列监控
  - 任务管理

- **[Attu 使用指南](./setup/ATTU_USAGE.md)**
  - Milvus 管理界面
  - 向量数据库操作

- **[Redis 队列查看](./setup/REDIS_QUEUE_VIEWING.md)**
  - RedisInsight 使用
  - 队列调试

### 🛠️ 开发文档 (Development)

开发者指南和技术实现细节。

- **[队列服务迁移指南](./development/QUEUE_SERVICE_MIGRATION.md)**
  - 队列系统架构
  - 迁移步骤

- **[搜索配置实现](./development/SEARCH_CONFIG_IMPLEMENTATION.md)**
  - 搜索引擎集成
  - 配置管理

- **[多 LLM 配置更新](./development/MULTI_LLM_CONFIG_UPDATE.md)**
  - 多模型支持
  - 配置系统

- **[用户 LLM 配置实现](./development/USER_LLM_CONFIG_IMPLEMENTATION.md)**
  - 用户级别配置
  - API 密钥管理

- **[工具分析](./development/TOOLS_ANALYSIS.md)**
  - 系统工具分析
  - 性能优化

- **[项目总结](./development/SUMMARY.md)**
  - 项目概述
  - 技术栈
  - 架构设计

### 🔧 故障排查 (Troubleshooting)

常见问题和解决方案。

- **[Google OAuth 修复指南](./troubleshooting/GOOGLE_OAUTH_FIX.md)**
  - OAuth 登录问题
  - 网络问题解决
  - 常见错误

## 🎯 快速导航

### 我想...

- **快速部署到生产环境**
  1. [部署检查清单](./deployment/DEPLOYMENT_CHECKLIST.md)
  2. [SSL 快速启动](./deployment/SSL_QUICKSTART.md)

- **配置 OAuth 登录**
  - [OAuth 设置指南](./setup/OAUTH_SETUP.md)

- **配置文档解析**
  - [文档解析器设置](./setup/DOCUMENT_PARSER_SETUP.md)

- **监控队列任务**
  - [BullMQ 面板使用](./setup/BULLMQ_BOARD_USAGE.md)
  - [Redis 队列查看](./setup/REDIS_QUEUE_VIEWING.md)

- **开发新功能**
  - [开发文档目录](./development/)

- **解决问题**
  - [故障排查目录](./troubleshooting/)

## 📖 按角色查看

### 系统管理员

1. **部署和维护**
   - [部署检查清单](./deployment/DEPLOYMENT_CHECKLIST.md)
   - [Traefik SSL 配置](./deployment/TRAEFIK_SSL_SETUP.md)
   
2. **监控和管理**
   - [BullMQ 面板](./setup/BULLMQ_BOARD_USAGE.md)
   - [Attu 管理界面](./setup/ATTU_USAGE.md)

### 开发人员

1. **开始开发**
   - [项目总结](./development/SUMMARY.md)
   - [架构文档](./development/)

2. **集成功能**
   - [搜索配置](./development/SEARCH_CONFIG_IMPLEMENTATION.md)
   - [LLM 配置](./development/MULTI_LLM_CONFIG_UPDATE.md)

### 用户

1. **功能配置**
   - [OAuth 登录设置](./setup/OAUTH_SETUP.md)
   - [文档解析配置](./setup/DOCUMENT_PARSER_SETUP.md)

## 📦 模块文档

项目各模块的专属文档：

- [文档解析器](../src/lib/document-parser/README.md)
- [文档追踪器](../src/lib/document-tracker/README.md)
- [文本清理器](../src/lib/text-cleaner/README.md)
- [LLM 提供者](../src/lib/llm-provider/README.md)
- [Markitdown 集成](../src/lib/markitdown/README.md)
- [MinerU 集成](../src/lib/mineru/README.md)

## 🐳 Docker 相关

- [Docker 镜像源设置](../docker/MIRROR_SETUP.md)
- [MinerU 优化指南](../docker/mineru/OPTIMIZATION.md)
- [MinerU Docker 说明](../docker/mineru/README.md)

## 🌐 语言支持

本文档提供中英文双语版本：

- 中文文档：`*.md`
- English: `*.en.md`

部分文档正在翻译中，欢迎贡献！

## 🤝 贡献文档

如果您想改进文档：

1. Fork 项目
2. 创建文档分支
3. 提交改进
4. 发起 Pull Request

文档规范：
- 使用 Markdown 格式
- 提供中英文双语版本（如适用）
- 包含清晰的示例和截图
- 保持目录结构整洁

## 📮 反馈

如有文档问题或建议，请：
- 提交 Issue
- 联系项目维护者
- 参与讨论区

---

**最后更新**: 2024-11-14

