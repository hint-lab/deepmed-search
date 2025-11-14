# OAuth 登录配置指南

本应用支持 Google 和 GitHub OAuth 登录。OAuth 登录是可选的，如果不配置，用户仍可以使用邮箱和密码登录。

## Google OAuth 配置

### 1. 创建 Google OAuth 应用

1. 访问 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建或选择一个项目
3. 点击 "创建凭据" → "OAuth 客户端 ID"
4. 配置 OAuth 同意屏幕（如果尚未配置）
5. 选择应用类型：**Web 应用**
6. 添加授权的重定向 URI：
   ```
   http://localhost:3000/api/auth/callback/google
   ```
   如果是生产环境，替换为你的域名：
   ```
   https://your-domain.com/api/auth/callback/google
   ```

### 2. 配置环境变量

将获得的 Client ID 和 Client Secret 添加到 `.env.local` 文件：

```bash
GOOGLE_CLIENT_ID="your-google-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

## GitHub OAuth 配置

### 1. 创建 GitHub OAuth 应用

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 "New OAuth App"
3. 填写应用信息：
   - **Application name**: DeepMed Search (或你的应用名)
   - **Homepage URL**: `http://localhost:3000` (或你的域名)
   - **Authorization callback URL**: 
     ```
     http://localhost:3000/api/auth/callback/github
     ```
     生产环境：
     ```
     https://your-domain.com/api/auth/callback/github
     ```

### 2. 配置环境变量

将获得的 Client ID 和 Client Secret 添加到 `.env.local` 文件：

```bash
GITHUB_CLIENT_ID="your-github-client-id-here"
GITHUB_CLIENT_SECRET="your-github-client-secret-here"
```

## 验证配置

1. 重启开发服务器：
   ```bash
   npm run dev
   ```

2. 访问登录页面：`http://localhost:3000/login`

3. 检查：
   - 如果配置了 Google OAuth，应该看到 "使用 Google 登录" 按钮
   - 如果配置了 GitHub OAuth，应该看到 "使用 GitHub 登录" 按钮
   - 如果都没配置，只会显示邮箱密码登录表单

## 注意事项

- OAuth 登录是**可选的**，不配置也不影响应用的基本使用
- 如果只配置其中一个 OAuth 提供商，登录页面只会显示该按钮
- 生产环境部署时，记得更新重定向 URI 为实际的域名
- 确保 `NEXTAUTH_SECRET` 已正确配置（用于 JWT 加密）

## 故障排查

### 问题：看不到 OAuth 登录按钮

**原因**：环境变量未配置或配置不正确

**解决方案**：
1. 检查 `.env.local` 文件中是否有 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
2. 确保环境变量值正确（不含多余空格或引号）
3. 重启开发服务器

### 问题：点击 OAuth 登录后出现错误

**可能原因**：
1. 重定向 URI 配置不正确
2. Client Secret 错误
3. OAuth 应用未发布（Google 需要发布应用）

**解决方案**：
1. 检查 Google/GitHub OAuth 应用设置中的重定向 URI 是否与实际匹配
2. 重新生成 Client Secret 并更新环境变量
3. 对于 Google OAuth，确保应用已发布或添加测试用户

### 问题：Console 警告 "Google OAuth not configured"

这是正常的提示信息，表示未配置 Google OAuth。如果你不需要 Google 登录，可以忽略此警告。

## 完整的 .env.local 示例

```bash
# 数据库连接
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/deepmed"

# NextAuth 配置（必需）
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-replace-with-random-string"

# 加密密钥（必需）
ENCRYPTION_KEY="your-encryption-key-32-chars-minimum-replace-this"

# Redis（必需）
REDIS_URL="redis://localhost:6379"

# OAuth 提供商（可选）
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```
