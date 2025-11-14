# 搜索配置功能实现文档

## 概述

实现了用户自定义搜索 API Key 配置功能，允许用户配置 Tavily、Jina 和 NCBI 的 API Key，系统优先使用用户配置。

## 已完成的工作

### 1. 数据库架构 ✅

创建了 `SearchConfig` 表：

```prisma
model SearchConfig {
  id                String   @id @default(cuid())
  tavilyApiKey      String?  // Tavily API Key（加密）
  jinaApiKey        String?  // Jina API Key（加密）
  ncbiApiKey        String?  // NCBI API Key（加密）
  searchProvider    String   @default("tavily") // 默认搜索提供商
  userId            String   @unique // 每个用户一个配置
  user              User     @relation(...)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

**数据库迁移**: `20251111045429_add_search_config`

### 2. 类型定义 ✅

**文件**: `src/types/search.ts`

- `SearchConfig`: 搜索配置接口
- `UpdateSearchConfigParams`: 更新配置参数

### 3. 后端 API ✅

**文件**: `src/actions/user.ts`

新增 API：
- `getUserSearchConfig()`: 获取用户搜索配置
- `updateUserSearchConfig()`: 更新搜索配置

### 4. 搜索配置辅助函数 ✅

**文件**: `src/lib/search/config.ts`

提供以下函数供搜索功能使用：
- `getSearchConfig(userId?)`: 获取完整搜索配置
- `getSearchApiKey(service, userId?)`: 获取特定服务的 API Key
- `getSearchProvider(userId?)`: 获取默认搜索提供商

### 5. 前端 UI ✅

**文件**: `src/app/settings/search/page.tsx`

搜索设置页面功能：
- ✅ 配置默认搜索提供商（Tavily/Jina）
- ✅ 配置 Tavily API Key
- ✅ 配置 Jina API Key
- ✅ 配置 NCBI API Key（可选）
- ✅ 显示已配置状态
- ✅ 加密存储

**导航更新**: `src/app/settings/layout.tsx`
- 添加"搜索配置"菜单项

## 使用说明

### 用户操作流程

1. **访问搜索设置**
   - 点击"设置" → "搜索配置"

2. **配置搜索提供商**
   - 选择默认搜索引擎（Tavily 或 Jina）

3. **配置 API Keys**
   - 输入 Tavily API Key（用于 Web 搜索）
   - 输入 Jina API Key（用于 Jina 搜索和 Reader）
   - 输入 NCBI API Key（可选，用于 PubMed）

4. **保存配置**
   - 点击"保存配置"
   - API Keys 会被加密存储

### 集成到搜索功能

在任何需要搜索 API Key 的地方，使用以下方式：

```typescript
import { getSearchConfig, getSearchApiKey } from '@/lib/search/config';

// 方式 1：获取完整配置
const config = await getSearchConfig(userId);
const tavilyKey = config.tavilyApiKey;

// 方式 2：获取特定服务的 Key
const tavilyKey = await getSearchApiKey('tavily', userId);
const jinaKey = await getSearchApiKey('jina', userId);
const ncbiKey = await getSearchApiKey('ncbi', userId);

// 方式 3：获取默认搜索提供商
const provider = await getSearchProvider(userId);
```

## 优先级机制

```
用户配置（数据库）> 系统配置（.env）
```

1. 如果用户配置了 API Key，使用用户配置
2. 如果用户未配置，使用 .env 中的系统默认配置
3. 如果都没有配置，API 调用可能失败

## 需要集成的文件

以下文件可能需要更新以使用用户配置（请根据实际情况调整）：

### Web 搜索相关
- 查找使用 `TAVILY_API_KEY` 的文件
- 查找使用 `JINA_API_KEY` 的文件
- 替换为 `await getSearchApiKey('tavily', userId)`

### PubMed 搜索相关
- 查找使用 `NCBI_API_KEY` 的文件
- 替换为 `await getSearchApiKey('ncbi', userId)`

### 搜索提供商选择
- 查找使用 `SEARCH_PROVIDER` 的文件
- 替换为 `await getSearchProvider(userId)`

## 查找需要更新的文件

运行以下命令查找需要修改的文件：

```bash
# 查找使用 TAVILY_API_KEY 的文件
grep -r "TAVILY_API_KEY" src/

# 查找使用 JINA_API_KEY 的文件
grep -r "JINA_API_KEY" src/

# 查找使用 NCBI_API_KEY 的文件
grep -r "NCBI_API_KEY" src/

# 查找使用 SEARCH_PROVIDER 的文件
grep -r "SEARCH_PROVIDER" src/
```

## 安全特性

- ✅ API Keys 使用 AES-256-GCM 加密存储
- ✅ 前端不显示已保存的 API Key
- ✅ 用户只能访问自己的配置
- ✅ 级联删除（删除用户时自动删除配置）

## 配置示例

### 用户配置方式
用户在界面上配置，存储在数据库中（加密）。

### 系统默认配置（.env）
```env
# 搜索配置
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=tvly-xxx
JINA_API_KEY=jina_xxx
NCBI_API_KEY=xxx  # 可选
```

## 获取 API Keys

### Tavily
- 网站：https://tavily.com
- 用途：Web 搜索
- 注册后可获得 API Key

### Jina
- 网站：https://jina.ai
- 用途：搜索和 Reader 服务
- 注册后可获得 API Key

### NCBI
- 网站：https://www.ncbi.nlm.nih.gov/account/
- 用途：PubMed 搜索（可选）
- 不配置也可使用，但可能有频率限制

## 完成状态

✅ 数据库表创建完成
✅ 数据库迁移完成
✅ 后端 API 完成
✅ 前端 UI 完成
✅ 辅助函数创建完成
✅ 无 Linting 错误

## 下一步

需要在实际的搜索功能中集成这些配置函数，替换硬编码的环境变量读取。

---

**实现时间**: 2025-11-11
**版本**: 1.0.0

