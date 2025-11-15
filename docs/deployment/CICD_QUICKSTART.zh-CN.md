# CI/CD 快速开始指南

> 5分钟快速设置自动部署

## 🚀 最简单的方式：GitHub Actions

### 步骤 1: 生成 SSH 密钥

```bash
# 在本地机器上
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy

# 复制公钥到服务器
ssh-copy-id -i ~/.ssh/github_deploy.pub your-user@your-server

# 查看私钥（准备复制到 GitHub）
cat ~/.ssh/github_deploy
```

### 步骤 2: 配置 GitHub Secrets

访问您的 GitHub 仓库：
```
Settings → Secrets and variables → Actions → New repository secret
```

添加以下 secrets：

| 名称 | 值 | 说明 |
|------|-----|------|
| `SERVER_HOST` | `your.server.ip` | 服务器 IP |
| `SERVER_USER` | `deploy` | SSH 用户名 |
| `SSH_PRIVATE_KEY` | 刚才生成的私钥内容 | 完整的私钥 |
| `SERVER_PORT` | `22` | SSH 端口（可选） |

### 步骤 3: 修改部署路径

编辑 `.github/workflows/deploy.yml`，修改项目路径：

```yaml
script: |
  cd /home/deploy/deepmed-search  # 改成您的实际路径
```

### 步骤 4: 准备服务器

```bash
# SSH 登录到服务器
ssh your-user@your-server

# 克隆项目
sudo mkdir -p /home/deploy
sudo chown -R $USER:$USER /home/deploy
cd /home/deploy
git clone https://github.com/your-org/deepmed-search.git
cd deepmed-search

# 配置环境
cp .env.example .env
nano .env  # 修改配置

# 确保脚本可执行
chmod +x scripts/deploy.sh
```

### 步骤 5: 测试

推送代码触发部署：

```bash
git add .
git commit -m "test: CI/CD"
git push origin main
```

查看部署状态：
```
https://github.com/your-org/deepmed-search/actions
```

---

## 🎯 完成！

现在每次推送到 `demo-without-gpu` 分支，都会自动部署到服务器。

**注意**：
- `main` 分支：日常开发，推送不触发部署
- `demo-without-gpu` 分支：演示环境，推送时自动部署

## 📊 查看部署日志

```bash
# 在服务器上
tail -f /home/deploy/deepmed-search/deploy.log
```

## 🔧 故障排查

### 部署失败？

1. **检查 SSH 连接**
   ```bash
   ssh -i ~/.ssh/github_deploy your-user@your-server
   ```

2. **检查服务器日志**
   ```bash
   tail -50 /home/deploy/deepmed-search/deploy.log
   ```

3. **手动部署测试**
   ```bash
   cd /home/deploy/deepmed-search
   bash scripts/deploy.sh
   ```

### GitHub Actions 报错？

1. 检查 Secrets 是否正确配置
2. 查看 Actions 日志中的详细错误
3. 确认服务器路径正确

---

## 🎓 进阶配置

想要更多功能？查看：

- [完整 CI/CD 指南](./CICD_SETUP.md) - Webhook、Watchtower 等
- [部署检查清单](./DEPLOYMENT_CHECKLIST.md) - 生产环境配置
- [SSL 配置](./SSL_QUICKSTART.md) - HTTPS 设置

---

**提示**：首次部署建议在低峰期进行，并做好数据备份。

