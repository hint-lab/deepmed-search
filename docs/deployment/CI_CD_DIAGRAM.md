# 🎯 DeepMed Search CI/CD 流程图

## 📊 1. 完整 CI/CD 流程

```mermaid
graph TB
    subgraph "开发者"
        Dev[👨‍💻 开发者]
        DevCode[编写代码]
    end
    
    subgraph "GitHub 仓库"
        MainBranch[main 分支<br/>❌ 不触发部署]
        DemoBranch[demo-without-gpu 分支<br/>✅ 自动部署]
    end
    
    subgraph "GitHub Actions"
        Trigger{触发条件}
        BuildJob[🔨 Job 1: 构建镜像]
        BuildApp[构建 App 镜像]
        BuildWorker[构建 Worker 镜像]
        BuildMarkitdown[构建 Markitdown 镜像]
        PushRegistry[📤 推送到腾讯云 TCR]
        
        DeployJob[🚀 Job 2: 部署]
        SSHConnect[SSH 连接服务器]
        PullCode[拉取代码]
        PullImages[拉取镜像]
        RestartServices[重启服务]
        
        NotifyJob[📢 Job 3: 通知]
        FeishuNotify[发送飞书通知]
    end
    
    subgraph "腾讯云容器镜像服务"
        Registry[📦 jpccr.ccs.tencentyun.com<br/>/deepmedsearch/]
        AppImage[app:latest]
        WorkerImage[worker:latest]
        MarkitdownImage[markitdown:latest]
    end
    
    subgraph "生产服务器"
        Server[🖥️ /home/deploy/deepmed-search]
        Postgres[(PostgreSQL)]
        Redis[(Redis)]
        Milvus[(Milvus)]
        MinIO[(MinIO)]
        AppContainer[App 容器]
        WorkerContainer[Worker 容器]
        MarkitdownContainer[Markitdown 容器]
    end
    
    subgraph "通知"
        Feishu[📱 飞书群]
    end
    
    Dev --> DevCode
    DevCode -->|git push| MainBranch
    DevCode -->|git push| DemoBranch
    
    DemoBranch -->|触发| Trigger
    Trigger -->|是| BuildJob
    Trigger -->|否| MainBranch
    
    BuildJob --> BuildApp
    BuildJob --> BuildWorker
    BuildJob --> BuildMarkitdown
    
    BuildApp --> PushRegistry
    BuildWorker --> PushRegistry
    BuildMarkitdown --> PushRegistry
    
    PushRegistry --> Registry
    Registry --> AppImage
    Registry --> WorkerImage
    Registry --> MarkitdownImage
    
    PushRegistry --> DeployJob
    
    DeployJob --> SSHConnect
    SSHConnect --> PullCode
    PullCode --> PullImages
    PullImages -->|从 Registry| AppImage
    PullImages -->|从 Registry| WorkerImage
    PullImages -->|从 Registry| MarkitdownImage
    
    PullImages --> RestartServices
    RestartServices --> Server
    
    Server --> AppContainer
    Server --> WorkerContainer
    Server --> MarkitdownContainer
    
    AppContainer --> Postgres
    AppContainer --> Redis
    AppContainer --> Milvus
    AppContainer --> MinIO
    AppContainer --> MarkitdownContainer
    
    WorkerContainer --> Postgres
    WorkerContainer --> Redis
    WorkerContainer --> Milvus
    WorkerContainer --> MarkitdownContainer
    
    DeployJob --> NotifyJob
    NotifyJob --> FeishuNotify
    FeishuNotify --> Feishu
    
    style DemoBranch fill:#90EE90
    style MainBranch fill:#FFB6C1
    style BuildJob fill:#87CEEB
    style DeployJob fill:#FFD700
    style NotifyJob fill:#DDA0DD
    style Registry fill:#FFA500
    style Server fill:#98FB98
```

## 🌿 2. 分支策略流程图

```mermaid
graph LR
    subgraph "开发流程"
        Dev[开发代码]
        MainCommit[提交到 main]
        MainPush[推送到 main]
        NoDeploy[❌ 不触发部署]
    end
    
    subgraph "部署流程"
        Merge[合并到 demo]
        DemoPush[推送到 demo-without-gpu]
        Trigger[触发 GitHub Actions]
        AutoDeploy[✅ 自动部署]
    end
    
    subgraph "同步流程"
        Sync[定期同步]
        MainToDemo[main → demo]
    end
    
    Dev --> MainCommit
    MainCommit --> MainPush
    MainPush --> NoDeploy
    
    MainCommit --> Merge
    Merge --> DemoPush
    DemoPush --> Trigger
    Trigger --> AutoDeploy
    
    MainPush --> Sync
    Sync --> MainToDemo
    MainToDemo --> DemoPush
    
    style NoDeploy fill:#FFB6C1
    style AutoDeploy fill:#90EE90
    style Trigger fill:#FFD700
```

## 🐳 3. Docker 镜像构建流程

```mermaid
graph TB
    subgraph "App 镜像构建"
        AppDeps[FROM node:20-bookworm<br/>安装依赖]
        AppBuilder[FROM deps AS builder<br/>复制源代码<br/>生成 Prisma Client<br/>构建 Next.js]
        AppRunner[FROM node:20-bookworm-slim<br/>复制构建产物<br/>安装生产依赖]
        AppFinal[最终镜像 ~1GB]
    end
    
    subgraph "Worker 镜像构建"
        WorkerDeps[FROM node:20-bookworm<br/>安装依赖]
        WorkerBuilder[FROM deps AS builder<br/>复制源代码<br/>生成 Prisma Client<br/>构建 Worker]
        WorkerRunner[FROM node:20-bookworm-slim<br/>复制构建产物<br/>安装生产依赖]
        WorkerFinal[最终镜像 ~500MB]
    end
    
    subgraph "Markitdown 镜像构建"
        MarkitdownDeps[FROM python:3.11<br/>安装依赖]
        MarkitdownBuilder[复制代码<br/>安装 Python 包]
        MarkitdownFinal[最终镜像 ~300MB]
    end
    
    AppDeps --> AppBuilder
    AppBuilder --> AppRunner
    AppRunner --> AppFinal
    
    WorkerDeps --> WorkerBuilder
    WorkerBuilder --> WorkerRunner
    WorkerRunner --> WorkerFinal
    
    MarkitdownDeps --> MarkitdownBuilder
    MarkitdownBuilder --> MarkitdownFinal
    
    AppFinal --> Registry[推送到腾讯云 TCR]
    WorkerFinal --> Registry
    MarkitdownFinal --> Registry
    
    style AppFinal fill:#87CEEB
    style WorkerFinal fill:#87CEEB
    style MarkitdownFinal fill:#87CEEB
    style Registry fill:#FFA500
```

## 🏗️ 4. 服务器部署架构

```mermaid
graph TB
    subgraph "服务器 /home/deploy/deepmed-search"
        subgraph "Docker Compose 服务"
            App[App 容器<br/>Next.js 应用<br/>端口: 3000]
            Worker[Worker 容器<br/>队列处理器<br/>BullMQ]
            Markitdown[Markitdown 容器<br/>文档解析器<br/>端口: 5000]
        end
        
        subgraph "数据服务"
            Postgres[(PostgreSQL<br/>端口: 5432<br/>数据库)]
            Redis[(Redis<br/>端口: 6379<br/>缓存/队列)]
            Milvus[(Milvus<br/>端口: 19530<br/>向量数据库)]
            MinIO[(MinIO<br/>端口: 9000<br/>对象存储)]
        end
        
        subgraph "配置文件"
            ComposeFile[docker-compose.demo.yml]
            EnvFile[.env<br/>环境变量]
            GitRepo[Git 仓库<br/>demo-without-gpu 分支]
        end
    end
    
    subgraph "外部访问"
        Traefik[Traefik 反向代理<br/>HTTPS]
        Users[👥 用户]
    end
    
    App --> Postgres
    App --> Redis
    App --> Milvus
    App --> MinIO
    App --> Markitdown
    
    Worker --> Postgres
    Worker --> Redis
    Worker --> Milvus
    Worker --> Markitdown
    
    Traefik --> App
    Users --> Traefik
    
    ComposeFile --> App
    ComposeFile --> Worker
    ComposeFile --> Markitdown
    ComposeFile --> Postgres
    ComposeFile --> Redis
    ComposeFile --> Milvus
    ComposeFile --> MinIO
    
    EnvFile --> App
    EnvFile --> Worker
    
    GitRepo --> ComposeFile
    
    style App fill:#87CEEB
    style Worker fill:#87CEEB
    style Markitdown fill:#87CEEB
    style Postgres fill:#98FB98
    style Redis fill:#FF6347
    style Milvus fill:#FFD700
    style MinIO fill:#FFA500
    style Traefik fill:#DDA0DD
```

## 🔄 5. 部署时序图

```mermaid
sequenceDiagram
    participant Dev as 👨‍💻 开发者
    participant GitHub as 📦 GitHub
    participant Actions as ⚙️ GitHub Actions
    participant TCR as ☁️ 腾讯云 TCR
    participant Server as 🖥️ 生产服务器
    participant Feishu as 📱 飞书
    
    Dev->>GitHub: git push demo-without-gpu
    GitHub->>Actions: 触发 workflow
    
    Note over Actions: Job 1: 构建镜像
    
    Actions->>Actions: Checkout 代码
    Actions->>Actions: 登录腾讯云 TCR
    Actions->>Actions: 构建 App 镜像
    Actions->>Actions: 构建 Worker 镜像
    Actions->>Actions: 构建 Markitdown 镜像
    
    Actions->>TCR: 推送 App 镜像
    Actions->>TCR: 推送 Worker 镜像
    Actions->>TCR: 推送 Markitdown 镜像
    
    Note over Actions: Job 2: 部署
    
    Actions->>Server: SSH 连接
    Server->>Server: git pull demo-without-gpu
    Server->>TCR: docker pull app:latest
    Server->>TCR: docker pull worker:latest
    Server->>TCR: docker pull markitdown:latest
    Server->>Server: docker compose up -d
    Server->>Actions: 部署完成
    
    Note over Actions: Job 3: 通知
    
    Actions->>Feishu: 发送部署通知
    Feishu-->>Dev: 📱 收到通知
    
    Note over Dev,Feishu: 总耗时: 5-10 分钟
```

## 📦 6. 镜像优化对比

```mermaid
graph LR
    subgraph "优化前"
        AppOld[App 镜像<br/>~2-3GB<br/>❌ 复制整个项目]
        WorkerOld[Worker 镜像<br/>~4GB<br/>❌ 复制整个项目]
    end
    
    subgraph "优化后"
        AppNew[App 镜像<br/>~1GB<br/>✅ 只复制必需文件<br/>✅ 清理缓存]
        WorkerNew[Worker 镜像<br/>~500MB<br/>✅ 只复制必需文件<br/>✅ 清理缓存]
    end
    
    AppOld -->|优化 50-60%| AppNew
    WorkerOld -->|优化 75-87%| WorkerNew
    
    style AppOld fill:#FFB6C1
    style WorkerOld fill:#FFB6C1
    style AppNew fill:#90EE90
    style WorkerNew fill:#90EE90
```

## 🔐 7. Secrets 配置关系

```mermaid
graph TB
    subgraph "GitHub Secrets"
        TencentUser[TENCENT_REGISTRY_USER<br/>100039842298]
        TencentPass[TENCENT_REGISTRY_PASSWORD<br/>腾讯云 TCR 密码]
        ServerHost[SERVER_HOST<br/>服务器 IP]
        ServerUser[SERVER_USER<br/>SSH 用户名]
        SSHKey[SSH_PRIVATE_KEY<br/>SSH 私钥]
        ServerPort[SERVER_PORT<br/>SSH 端口]
        FeishuWebhook[FEISHU_WEBHOOK_URL<br/>飞书 Webhook]
    end
    
    subgraph "GitHub Actions 使用"
        Login[登录腾讯云 TCR]
        SSH[SSH 连接服务器]
        Notify[发送飞书通知]
    end
    
    TencentUser --> Login
    TencentPass --> Login
    
    ServerHost --> SSH
    ServerUser --> SSH
    SSHKey --> SSH
    ServerPort --> SSH
    
    FeishuWebhook --> Notify
    
    style TencentUser fill:#FFA500
    style TencentPass fill:#FFA500
    style ServerHost fill:#87CEEB
    style ServerUser fill:#87CEEB
    style SSHKey fill:#87CEEB
    style FeishuWebhook fill:#DDA0DD
```

## 🎯 8. 服务依赖关系

```mermaid
graph TB
    subgraph "应用层"
        App[App 容器<br/>Next.js]
        Worker[Worker 容器<br/>BullMQ]
    end
    
    subgraph "服务层"
        Markitdown[Markitdown<br/>文档解析]
    end
    
    subgraph "数据层"
        Postgres[(PostgreSQL<br/>关系数据库)]
        Redis[(Redis<br/>缓存/队列)]
        Milvus[(Milvus<br/>向量数据库)]
        MinIO[(MinIO<br/>对象存储)]
    end
    
    App -->|查询/写入| Postgres
    App -->|缓存/队列| Redis
    App -->|向量搜索| Milvus
    App -->|文件存储| MinIO
    App -->|文档解析| Markitdown
    
    Worker -->|查询/写入| Postgres
    Worker -->|队列操作| Redis
    Worker -->|向量索引| Milvus
    Worker -->|文档解析| Markitdown
    
    style App fill:#87CEEB
    style Worker fill:#87CEEB
    style Markitdown fill:#FFD700
    style Postgres fill:#98FB98
    style Redis fill:#FF6347
    style Milvus fill:#FFD700
    style MinIO fill:#FFA500
```

---

## 📝 使用说明

这些 Mermaid 图表可以在以下地方查看：

1. **GitHub**: 直接在 Markdown 文件中渲染
2. **VS Code**: 安装 "Markdown Preview Mermaid Support" 插件
3. **在线编辑器**: https://mermaid.live/
4. **文档工具**: GitBook, Notion, Confluence 等

## 🔗 相关文档

- [CI/CD 详细配置](CICD_SETUP.md)
- [分支策略说明](../../BRANCHING_STRATEGY.md)
- [部署快速开始](../../DEPLOYMENT_QUICKSTART.md)
- [腾讯云配置](TENCENT_CLOUD_REGISTRY.md)

