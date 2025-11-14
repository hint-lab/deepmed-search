# Google OAuth 登录修复说明

## 修复内容

### 1. 环境变量格式问题
**问题**: `.env` 文件中的环境变量值被引号包围，导致 Next.js 无法正确解析。

**修复**: 
- 移除了所有环境变量值周围的双引号
- 修复前: `NEXTAUTH_URL="http://localhost:3000"`
- 修复后: `NEXTAUTH_URL=http://localhost:3000`

### 2. Google OAuth 配置增强
**添加内容**:
- 添加了 Google OAuth 授权参数（prompt, access_type, response_type）
- 添加了 `signIn` 回调函数，自动创建/更新 OAuth 用户
- 启用了开发模式调试日志

### 3. 用户自动创建
**功能**: 
- 当用户首次使用 Google/GitHub 登录时，系统会自动创建用户账号
- OAuth 用户不需要密码（password 字段为空）
- 如果用户已存在，会自动关联账号

## 如何使用

### 1. 重启开发服务器（重要！）
```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 2. 访问登录页面
```
http://localhost:3000/login
```

### 3. 点击 "使用 Google 登录"

### 4. 验证 Google OAuth 应用配置

确保在 [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 中：

1. **已授权的重定向 URI** 包含：
   ```
   http://localhost:3000/api/auth/callback/google
   ```

2. **OAuth 同意屏幕** 已配置（至少配置为测试模式）

3. **如果是测试模式**，确保你的 Google 账号已添加为测试用户

## 常见问题

### 问题1: 仍然看到 "error=Configuration"
**解决**: 
1. 确认已重启开发服务器
2. 检查浏览器控制台和服务器日志
3. 运行诊断脚本: `npm run dev` 后查看控制台日志

### 问题2: "fetch failed" 错误
**原因**: Google OAuth 应用配置问题
**解决**:
1. 检查 Redirect URI 是否完全匹配（包括协议、端口）
2. 确保 OAuth 应用状态为"已发布"或添加了测试用户
3. 检查 Client ID 和 Client Secret 是否正确

### 问题3: 登录后跳转到错误页面
**解决**:
1. 检查数据库连接是否正常
2. 查看服务器日志中的错误信息
3. 确保 `NEXTAUTH_SECRET` 已正确配置

## 验证配置

运行诊断脚本（需要重启服务器后才能正确读取环境变量）：
```bash
node check-oauth.js
```

应该看到：
```
✅ NEXTAUTH_URL: 已配置
✅ NEXTAUTH_SECRET: 已配置
✅ Google OAuth: 已配置
   - Redirect URI 应该是: http://localhost:3000/api/auth/callback/google
```

## 技术细节

### 修改的文件
1. **`src/lib/auth.ts`**:
   - 添加了 Google OAuth 授权参数
   - 实现了 `signIn` 回调函数，自动处理 OAuth 用户
   - 添加了调试模式配置

2. **`.env`**:
   - 移除了环境变量值中的引号

### 代码变更
```typescript
// Google Provider 配置
Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
    authorization: {
        params: {
            prompt: "consent",
            access_type: "offline",
            response_type: "code"
        }
    }
})

// signIn 回调
async signIn({ user, account, profile }) {
    if (account?.provider === 'google' || account?.provider === 'github') {
        // 自动创建或查找用户
        // ...
    }
    return true;
}
```

## 后续步骤

修复完成后，Google 登录应该可以正常工作。如果仍有问题：

1. 查看服务器控制台的详细错误信息（已启用 debug 模式）
2. 检查 Google Cloud Console 中的配置
3. 参考 `OAUTH_SETUP.md` 获取详细配置指南
