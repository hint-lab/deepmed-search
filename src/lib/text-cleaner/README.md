# Text Cleaner - PDF 文本清理工具

使用 LLM 清理 PDF 提取文本中的多余换行，提升文档可读性。

## 功能

- ✅ 清理 PDF 提取文本中的多余换行
- ✅ 合并被拆散的句子
- ✅ 保留段落结构
- ✅ 保留表格和列表格式
- ✅ 支持长文本分批处理
- ✅ 使用统一的 LLM Provider 系统

## 使用场景

PDF 文档提取时经常会因为排版问题将句子拆成多行，例如：

```
慢性髓性白血病（CML）是一种骨髓增殖性肿
瘤，其特征是费城染色体阳性，导致BCR-ABL融
合基因的形成。
```

使用 Text Cleaner 后：

```
慢性髓性白血病（CML）是一种骨髓增殖性肿瘤，其特征是费城染色体阳性，导致BCR-ABL融合基因的形成。
```

## 环境变量

```env
# 是否启用文本清理（默认: true）
ENABLE_TEXT_CLEANING=true

# LLM Provider 配置（使用项目的 llm-provider 系统）
# 至少配置以下其中一个：
DEEPSEEK_API_KEY=your_key
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key
```

## API 使用

### 清理短文本

```typescript
import { cleanTextWithLLM } from '@/lib/text-cleaner';

const result = await cleanTextWithLLM('文本内容', {
  // 可选：指定 provider 类型
  providerType: ProviderType.DeepSeek,
});

if (result.success) {
  console.log('清理后的文本:', result.cleanedText);
}
```

### 清理长文本

```typescript
import { cleanLongText } from '@/lib/text-cleaner';

// 自动分批处理长文本
const result = await cleanLongText('很长的文本内容', {
  // 可选：指定每批最大字符数（默认: 8000）
  maxChunkSize: 8000,
  // 可选：指定 provider 类型
  providerType: ProviderType.OpenAI,
});

if (result.success) {
  console.log('清理后的文本:', result.cleanedText);
}
```

## 集成到文档处理流程

Text Cleaner 已自动集成到文档处理流程中：

```typescript
// 在 convertDocumentAction 中自动调用
const converted = await convertDocumentAction(documentId, options);
// PDF 提取的 Markdown 内容会自动清理多余换行
```

## 清理规则

1. **合并句子内的换行**：将被 PDF 排版拆散的句子合并
2. **保留段落换行**：保持段落之间的分隔
3. **保留表格结构**：不破坏表格的行列结构
4. **保留列表结构**：保持编号列表、项目符号列表
5. **不改变内容**：只修正换行，不修改文字
6. **保留专业术语**：医学术语、公式、数字保持原样

## 工作流程

```
PDF文件
  ↓
提取文本（MinerU/MarkItDown）
  ↓
检测多余换行
  ↓
LLM智能清理
  ↓
输出清洁文本
  ↓
文档分块 & 索引
```

## 性能优化

- **智能跳过**：短文本（<100字符）直接跳过
- **分批处理**：长文本自动分批，避免 token 限制
- **容错机制**：清理失败时自动使用原文本
- **Provider 单例**：复用 LLM Provider 实例

## 禁用文本清理

如果不需要清理功能，可以在 `.env` 中设置：

```env
ENABLE_TEXT_CLEANING=false
```

## 注意事项

1. **API 调用成本**：每次清理都会调用 LLM API，会产生费用
2. **处理时间**：长文本分批处理需要较长时间
3. **准确性**：LLM 清理结果取决于模型质量
4. **备份策略**：原始文本始终保留在 MinIO 中

## 技术栈

- **LLM Provider**：统一的 LLM 接口，支持 DeepSeek、OpenAI、Google
- **UUID**：生成临时对话 ID
- **Logger**：完整的日志记录

## 示例输出

### 输入（PDF 提取）

```
（2）指导组提倡关注 TFR 患者潜在的心理问题并作常规监

测，因为专业的心理帮助对某些患者是有必要的

（3） 医生应当意识到 TFR 监测中 BCR-ABL 水平波动可能会

导致患者出现焦虑
```

### 输出（清理后）

```
（2）指导组提倡关注 TFR 患者潜在的心理问题并作常规监测，因为专业的心理帮助对某些患者是有必要的

（3）医生应当意识到 TFR 监测中 BCR-ABL 水平波动可能会导致患者出现焦虑
```

## 开发计划

- [ ] 支持更多文档格式
- [ ] 添加清理质量评估
- [ ] 支持自定义清理规则
- [ ] 优化分批策略
- [ ] 添加清理历史记录

