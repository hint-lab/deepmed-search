# 🌿 分支策略说明

## 📋 双分支架构

本项目采用**双分支部署策略**，避免频繁触发生产部署。

### 分支说明

| 分支 | 用途 | 部署时机 | 配置文件 | 说明 |
|------|------|---------|---------|------|
| **main** | 开发环境 | 推送不部署 | `docker-compose.yml` | 日常开发，频繁更新，用户本地部署 |
| **demo-without-gpu** | 演示环境 | 推送时自动部署 | `docker-compose.demo.yml` | 演示展示，不常更新，使用预构建镜像 |

## 🔄 工作流程

### 日常开发流程

```bash
# 1. 在 main 分支开发（默认）
git checkout main

# 2. 开发功能
# ... 修改代码 ...

# 3. 提交并推送
git add .
git commit -m "feat: 新功能"
git push origin main

# 4. main 分支不会自动部署
# 用户可以自己本地运行：docker compose up -d
```

### 更新演示环境（触发自动部署）

```bash
# 1. 确认 main 分支开发完成并测试通过

# 2. 切换到 demo 分支
git checkout demo-without-gpu

# 3. 合并 main 分支的更新
git merge main

# 4. 推送到远程（触发自动部署）
git push origin demo-without-gpu

# 5. GitHub Actions 自动部署到演示服务器
# 几分钟后自动完成
```

## 🎯 分支特点

### demo-without-gpu 分支

**目的**：日常开发和测试

**特点**：
- ✅ 推送即部署
- ✅ 使用预构建镜像（轻量）
- ✅ 无 GPU 依赖
- ✅ 部署速度快
- ✅ 适合频繁更新

**适用场景**：
- 功能开发
- Bug 修复
- 快速测试
- 演示展示

### main 分支

**目的**：生产环境稳定版本

**特点**：
- ✅ 只在发布时更新
- ✅ 经过测试的稳定代码
- ✅ 使用预构建镜像
- ✅ 可配置更完整的功能

**适用场景**：
- 正式发布
- 重要更新
- 版本标记
- 生产部署

## 📊 部署对比

| 项目 | main | demo-without-gpu |
|------|------|-----------------|
| 推送频率 | 频繁（每天多次） | 低（不常更新） |
| 自动部署 | ❌ 否 | ✅ 是 |
| 配置文件 | docker-compose.yml | docker-compose.demo.yml |
| 编译方式 | 本地编译（用户自己） | 预构建镜像（自动） |
| 内存需求 | 较高（8GB+） | 较低（2GB+） |
| 部署方式 | 用户本地部署 | 服务器自动部署 |
| 用途 | 开发测试 | 演示展示 |

## 🚀 快速命令

### 创建新功能

```bash
# 从 demo 分支创建功能分支
git checkout demo-without-gpu
git checkout -b feature/new-feature

# 开发完成后合并到 demo
git checkout demo-without-gpu
git merge feature/new-feature
git push origin demo-without-gpu
```

### 修复 Bug

```bash
# 在 demo 分支修复
git checkout demo-without-gpu
git add .
git commit -m "fix: 修复问题"
git push origin demo-without-gpu

# 测试通过后合并到 main
git checkout main
git merge demo-without-gpu
git push origin main
```

### 紧急修复（Hotfix）

```bash
# 直接在 main 分支修复
git checkout main
git add .
git commit -m "hotfix: 紧急修复"
git push origin main

# 同步到 demo 分支
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

## 🔐 保护规则（建议）

### demo-without-gpu 分支

- ⚪ 无特殊保护
- ✅ 允许强制推送（如需要）
- ✅ 允许删除（谨慎）

### main 分支

- ✅ 启用分支保护
- ✅ 要求 PR 审核（推荐）
- ✅ 要求状态检查通过
- ❌ 禁止强制推送
- ❌ 禁止删除

## 🌐 服务器分支管理

### 当前配置

服务器上**两个分支共存**：

```bash
cd /home/deploy/deepmed-search

# 查看当前分支
git branch

# 应该看到：
# * demo-without-gpu
#   main
```

### 切换分支（手动）

```bash
# 切换到演示环境
git checkout demo-without-gpu
git pull origin demo-without-gpu
docker compose -f docker-compose.demo.yml up -d

# 切换到生产环境
git checkout main
git pull origin main
docker compose -f docker-compose.demo.yml up -d
```

**注意**：GitHub Actions 会自动切换到对应分支，通常无需手动操作。

## 📝 提交规范（建议）

使用语义化提交信息：

```bash
# 新功能
git commit -m "feat: 添加用户登录功能"

# Bug 修复
git commit -m "fix: 修复文件上传问题"

# 文档更新
git commit -m "docs: 更新部署文档"

# 性能优化
git commit -m "perf: 优化数据库查询"

# 重构代码
git commit -m "refactor: 重构用户模块"

# 样式调整
git commit -m "style: 调整页面布局"

# 测试相关
git commit -m "test: 添加单元测试"

# 构建相关
git commit -m "chore: 更新依赖包"
```

## ⚠️ 注意事项

### 1. 避免直接在 main 开发

❌ 不推荐：
```bash
git checkout main
# 直接修改代码
git commit -m "fix: 修复"
git push origin main
```

✅ 推荐：
```bash
git checkout demo-without-gpu
# 修改并测试
git commit -m "fix: 修复"
git push origin demo-without-gpu
# 测试通过后再合并到 main
```

### 2. 定期同步 main 到 demo

```bash
# 保持 demo 分支包含 main 的所有更新
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

### 3. 冲突解决

```bash
# 如果合并时有冲突
git checkout main
git merge demo-without-gpu

# 如果有冲突，手动解决后
git add .
git commit -m "merge: 合并 demo 到 main"
git push origin main
```

## 📚 相关文档

- [部署快速开始](./QUICKSTART.zh-CN.md)
- [生产环境部署](./PRODUCTION.zh-CN.md)
- [CI/CD 自动部署](./CICD.zh-CN.md)
- [腾讯云配置](./TENCENT_CLOUD_REGISTRY.md)

---

**策略制定**: 2025-11-15  
**适用环境**: 生产 + 演示环境

