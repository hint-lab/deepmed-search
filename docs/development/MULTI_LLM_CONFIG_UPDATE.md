# 多 LLM 配置功能更新

## 更新概述

根据用户需求，将原有的单一 LLM 配置升级为支持多配置管理。用户现在可以：
- 创建多个 LLM 配置
- 为每个配置命名（例如：工作账号、个人账号）
- 在多个配置之间切换激活状态
- 只有激活的配置会被系统使用

## 主要变更

### 1. 数据库架构变更 ✅

#### 移除 User 表中的 LLM 字段
从 User 模型中移除了以下字段：
- `llmProvider`
- `llmApiKey`
- `llmModel`
- `llmReasonModel`
- `llmBaseUrl`

#### 新建 LLMConfig 表
创建了独立的 LLMConfig 表来存储用户的多个配置：

```prisma
model LLMConfig {
  id             String   @id @default(cuid())
  name           String   // 配置名称（用户自定义）
  provider       String   // LLM 提供商
  apiKey         String   // 加密的 API Key
  model          String?  // 模型名称
  reasonModel    String?  // 推理模型名称
  baseUrl        String?  // 自定义 API Base URL
  isActive       Boolean  @default(false) // 是否激活
  userId         String   // 用户ID
  user           User     @relation(...)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
  @@index([userId, isActive])
}
```

**数据库迁移**: `20251111035334_add_llm_config_table`

### 2. 类型定义更新 ✅

**文件**: `src/types/user.ts`

新增/修改的类型：
- `LLMConfig`: 单个 LLM 配置接口
- `UserLLMConfigList`: 配置列表接口
- `CreateLLMConfigParams`: 创建配置参数
- `UpdateLLMConfigParams`: 更新配置参数

### 3. 后端 API 更新 ✅

**文件**: `src/actions/user.ts`

#### 新增 API
1. `getUserLLMConfigs()`: 获取用户的所有配置
2. `createLLMConfig()`: 创建新配置
3. `updateLLMConfig()`: 更新配置
4. `deleteLLMConfig()`: 删除配置
5. `activateLLMConfig()`: 激活指定配置
6. `testLLMConfig()`: 测试配置

#### 移除 API
- `getUserLLMConfig()` (已被 `getUserLLMConfigs()` 替代)
- `updateUserLLMConfig()` (已被 `createLLMConfig()` 和 `updateLLMConfig()` 替代)
- `testUserLLMConfig()` (已被 `testLLMConfig()` 替代)

### 4. Provider 工厂更新 ✅

**文件**: `src/lib/llm-provider/index.ts`

修改 `createProviderFromUserConfig()` 函数：
- 从 LLMConfig 表查询激活的配置
- 使用激活配置创建 Provider
- 如果没有激活配置，fallback 到系统默认

### 5. 前端 UI 更新 ✅

**文件**: `src/app/settings/llm/page.tsx`

完全重写 LLM 设置页面，新功能包括：

#### 配置列表视图
- 显示所有配置卡片
- 激活的配置有视觉标识
- 显示提供商、模型、创建时间等信息

#### 配置管理功能
- ✅ 创建新配置
- ✅ 编辑配置
- ✅ 删除配置
- ✅ 激活/切换配置
- ✅ 测试配置连接

#### 对话框表单
- 配置名称输入
- 提供商选择（创建时可选，编辑时不可修改）
- API Key 输入（编辑时可选）
- 模型选择
- Base URL 配置

## 使用说明

### 用户操作流程

1. **访问设置页面**
   - 点击页面右上角"设置" → "LLM 配置"

2. **创建第一个配置**
   - 点击"新建配置"按钮
   - 填写配置名称（如"工作账号"）
   - 选择提供商
   - 输入 API Key
   - （可选）选择模型和配置 Base URL
   - 点击"测试连接"验证
   - 点击"保存"

3. **创建更多配置**
   - 重复步骤 2
   - 可以创建多个不同提供商的配置
   - 每个配置都有独立的 API Key

4. **切换配置**
   - 在配置列表中找到要使用的配置
   - 点击"激活"按钮
   - 系统会自动将其他配置设为非激活状态

5. **编辑配置**
   - 点击配置卡片上的编辑按钮
   - 修改名称、模型等信息
   - 可选择性更新 API Key
   - 保存更改

6. **删除配置**
   - 点击配置卡片上的删除按钮
   - 确认删除
   - 如果删除的是激活配置，系统会自动激活最早的配置

### 自动规则

1. **首个配置自动激活**: 创建第一个配置时，自动设为激活状态
2. **删除激活配置**: 删除激活配置后，自动激活最早创建的配置
3. **配置隔离**: 每个用户只能看到和管理自己的配置

## 技术细节

### 配置激活机制

使用数据库事务确保激活操作的原子性：

```typescript
await prisma.$transaction([
  // 1. 将所有配置设为非激活
  prisma.lLMConfig.updateMany({
    where: { userId: session.user.id },
    data: { isActive: false },
  }),
  // 2. 激活指定配置
  prisma.lLMConfig.update({
    where: { id: configId },
    data: { isActive: true },
  }),
]);
```

### 查询优化

使用组合索引提高查询性能：
```prisma
@@index([userId])
@@index([userId, isActive])
```

### 安全性

- ✅ API Key 加密存储（AES-256-GCM）
- ✅ 用户只能访问自己的配置
- ✅ 级联删除（删除用户时自动删除配置）
- ✅ 服务端验证所有操作

## 兼容性说明

### 数据迁移

原有的单一配置数据（User 表中的 LLM 字段）不会自动迁移到新表。理由：
1. 旧字段被完全移除
2. 用户需要重新创建配置
3. 这是一次清理和改进的机会

如果需要保留旧配置，可以在迁移前运行数据迁移脚本（未包含在此更新中）。

### API 变更

前端需要更新以下调用：
- `getUserLLMConfig()` → `getUserLLMConfigs()`
- `updateUserLLMConfig()` → `createLLMConfig()` 或 `updateLLMConfig()`
- `testUserLLMConfig()` → `testLLMConfig()`

## 文件清单

### 修改的文件
- `prisma/schema.prisma` - 数据库模型
- `src/types/user.ts` - 类型定义
- `src/actions/user.ts` - 后端 API
- `src/lib/llm-provider/index.ts` - Provider 工厂
- `src/app/settings/llm/page.tsx` - 前端 UI

### 新增的文件
- `prisma/migrations/20251111035334_add_llm_config_table/` - 数据库迁移

## 测试建议

### 功能测试
1. ✅ 创建多个配置
2. ✅ 切换激活状态
3. ✅ 编辑配置（带/不带 API Key 更新）
4. ✅ 删除配置（激活/非激活）
5. ✅ 测试连接功能
6. ✅ 使用不同配置进行对话

### 边界测试
1. 删除所有配置后的行为
2. 删除激活配置的行为
3. 同时激活多个配置（应被阻止）
4. 无效 API Key 的处理

### 性能测试
1. 创建大量配置（100+）的性能
2. 频繁切换配置的性能
3. 配置查询的响应时间

## 未来优化建议

1. **批量导入/导出**: 支持配置的导入和导出
2. **配置模板**: 预设常见提供商的配置模板
3. **使用统计**: 记录每个配置的使用次数和 Token 消耗
4. **配置分组**: 支持将配置分组管理
5. **快速切换**: 在聊天界面添加快速切换配置的功能
6. **配置共享**: 团队成员之间共享配置（企业功能）

## 已知限制

1. **配置数量**: 当前未限制单用户的配置数量
2. **名称唯一性**: 未强制配置名称唯一（允许重名）
3. **历史记录**: 不记录配置的修改历史

## 完成状态

✅ 数据库迁移完成
✅ 后端 API 完成
✅ 前端 UI 完成
✅ 无 Linting 错误
✅ 功能测试通过

---

**更新时间**: 2025-11-11
**版本**: 2.0.0
**向后兼容**: ❌ 需要重新创建配置

