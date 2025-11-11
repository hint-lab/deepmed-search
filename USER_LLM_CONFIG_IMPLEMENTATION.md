# 用户 LLM 配置功能实现总结

## 概述

成功实现了用户自定义 LLM 配置功能，允许用户在注册后配置自己的 LLM API Key 和服务商选择（DeepSeek/OpenAI/Google），加密存储到数据库，聊天时优先使用用户配置。

## 已完成的工作

### 1. 数据库层修改 ✅

- **文件**: `prisma/schema.prisma`
- **修改内容**:
  - 扩展 User 模型，添加了以下字段：
    - `llmProvider`: LLM 提供商（deepseek/openai/google）
    - `llmApiKey`: 加密的 API Key
    - `llmModel`: 用户选择的模型名称
    - `llmReasonModel`: 推理模型名称（用于 DeepSeek）
    - `llmBaseUrl`: 自定义 API Base URL
  - 创建并应用了数据库迁移：`20251111034429_add_user_llm_config`

### 2. API Key 加密/解密工具 ✅

- **文件**: `src/lib/crypto.ts`
- **实现内容**:
  - `encryptApiKey()`: 使用 AES-256-GCM 加密 API Key
  - `decryptApiKey()`: 解密 API Key
  - `validateEncryptionKey()`: 验证加密密钥配置
  - 使用环境变量 `ENCRYPTION_KEY` 作为密钥

### 3. 后端 API 实现 ✅

#### 3.1 用户 LLM 配置 Actions
- **文件**: `src/actions/user.ts`
- **新增函数**:
  - `getUserLLMConfig()`: 获取用户的 LLM 配置（不返回解密的 API Key）
  - `updateUserLLMConfig()`: 更新用户的 LLM 配置（加密存储）
  - `testUserLLMConfig()`: 测试用户配置的 API Key 是否有效

#### 3.2 Provider 工厂方法扩展
- **文件**: `src/lib/llm-provider/index.ts`
- **新增函数**:
  - `createProviderFromUserConfig()`: 从用户配置创建 Provider 实例
  - 优先使用用户配置，如果没有则 fallback 到系统默认配置

#### 3.3 聊天消息处理修改
- **文件**: `src/actions/chat-message.ts`
- **修改内容**:
  - 将所有 `ProviderFactory.getProvider(ProviderType.DeepSeek)` 调用
  - 替换为 `await createProviderFromUserConfig(userId)`
  - 支持动态获取用户配置的 Provider

### 4. 前端 UI 实现 ✅

#### 4.1 LLM 设置页面
- **文件**: `src/app/settings/llm/page.tsx`
- **功能**:
  - 提供商选择下拉框（DeepSeek/OpenAI/Google）
  - API Key 输入框（密码类型）
  - 模型选择下拉框（根据提供商动态更新）
  - Base URL 输入框（可选）
  - "测试连接" 按钮
  - "保存配置" 按钮
  - 显示配置状态（已配置/未配置）

#### 4.2 设置页面布局
- **文件**: `src/app/settings/layout.tsx`
- **功能**:
  - 侧边栏导航
  - 响应式设计
  - 可扩展支持更多设置页面

#### 4.3 设置菜单更新
- **文件**: `src/components/header/settings-menu.tsx`
- **修改内容**:
  - 添加 "LLM 配置" 菜单项
  - 链接到 `/settings/llm`

### 5. 类型定义和国际化 ✅

#### 5.1 类型定义
- **文件**: `src/types/user.ts`
- **新增类型**:
  - `UserLLMConfig`: 用户 LLM 配置接口
  - `UpdateUserLLMConfigParams`: 更新配置参数接口

#### 5.2 国际化翻译
- **文件**: 
  - `src/i18n/locales/zh.json` (中文)
  - `src/i18n/locales/en.json` (英文)
- **新增翻译**: 完整的 LLM 设置相关翻译

## 使用说明

### 环境变量配置

**重要**: 在使用此功能前，必须在 `.env` 文件中添加加密密钥：

```env
# 用于加密用户 API Key 的密钥（必须是32字符以上的随机字符串）
ENCRYPTION_KEY=your-random-32-char-or-longer-encryption-key-here
```

您可以使用以下命令生成一个安全的加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 用户使用流程

1. **用户注册/登录**
   - 用户完成注册或登录

2. **访问设置页面**
   - 点击页面右上角的"设置"按钮
   - 选择"LLM 配置"

3. **配置 LLM**
   - 选择提供商（DeepSeek/OpenAI/Google）
   - 输入 API Key
   - （可选）选择模型
   - （可选）配置 Base URL

4. **测试连接**
   - 点击"测试连接"按钮
   - 验证 API Key 是否有效

5. **保存配置**
   - 测试成功后，点击"保存配置"
   - 配置被加密存储到数据库

6. **开始使用**
   - 进入聊天页面
   - 系统将自动使用用户配置的 LLM 进行对话

## 安全特性

1. **加密存储**: API Key 使用 AES-256-GCM 加密算法存储
2. **前端安全**: 前端永不显示已保存的 API Key（密码输入框）
3. **服务端验证**: 用户只能访问自己的配置
4. **Fallback 机制**: 如果用户配置无效，自动使用系统默认配置

## 系统架构

```
用户请求
    ↓
聊天页面
    ↓
getChatMessageStream / sendChatMessageAction
    ↓
createProviderFromUserConfig(userId)
    ↓
├─ 查询用户配置（数据库）
├─ 解密 API Key
├─ 创建对应的 Provider
└─ 返回 Provider 实例
    ↓
执行聊天逻辑
```

## 测试建议

1. **功能测试**:
   - 测试不同提供商的配置
   - 测试无效 API Key 的处理
   - 测试未配置时的 fallback

2. **安全测试**:
   - 验证 API Key 加密存储
   - 验证前端不显示已保存的 API Key
   - 验证用户只能访问自己的配置

3. **性能测试**:
   - 测试大量用户同时使用不同配置
   - 测试配置读取性能

## 注意事项

1. **加密密钥**: 必须在 `.env` 中配置 `ENCRYPTION_KEY`
2. **密钥安全**: 加密密钥应妥善保管，不要提交到版本控制
3. **数据迁移**: 如果修改加密算法，需要迁移现有用户的加密数据
4. **测试账户**: 系统默认配置仍然可用，适合测试和未配置用户

## 文件清单

### 新增文件
- `src/lib/crypto.ts` - 加密/解密工具
- `src/app/settings/llm/page.tsx` - LLM 设置页面
- `src/app/settings/layout.tsx` - 设置页面布局
- `prisma/migrations/20251111034429_add_user_llm_config/` - 数据库迁移

### 修改文件
- `prisma/schema.prisma` - 数据库模型
- `src/types/user.ts` - 类型定义
- `src/actions/user.ts` - 用户相关 Actions
- `src/lib/llm-provider/index.ts` - Provider 工厂
- `src/actions/chat-message.ts` - 聊天消息处理
- `src/components/header/settings-menu.tsx` - 设置菜单
- `src/i18n/locales/zh.json` - 中文翻译
- `src/i18n/locales/en.json` - 英文翻译

## 未来优化建议

1. **速率限制**: 添加 API Key 测试的速率限制
2. **配置历史**: 记录配置修改历史
3. **多 API Key**: 支持用户配置多个 API Key 并自动轮换
4. **使用统计**: 显示用户的 Token 使用统计
5. **配额管理**: 添加用户级别的使用配额管理

## 完成状态

✅ 所有计划功能已实现
✅ 所有单元测试通过
✅ 无 Linting 错误
✅ 数据库迁移已应用
✅ 文档已完成

---

**实现时间**: 2025-11-11
**版本**: 1.0.0

