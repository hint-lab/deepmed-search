# Document Parser 客户端

这个模块提供了一个客户端库，用于与远端的 Koa 文档处理服务器进行交互。它封装了文档上传、解析、摘要生成等功能，使前端应用能够方便地调用文档处理服务。

## 功能特点

- 文档上传与处理
- 文档状态查询
- 文档内容获取
- 文档分块获取
- 文档格式转换
- 文档摘要生成
- 进度回调支持

## 安装

确保项目中已安装 `axios` 依赖：

```bash
npm install axios
# 或
yarn add axios
```

## 使用方法

### 基本用法

```typescript
import { DocumentParser } from '@/lib/document-parser';

// 创建 DocumentParser 实例
const documentParser = new DocumentParser({
  baseUrl: 'http://localhost:3000', // 替换为实际的 Koa 服务器地址
  apiKey: 'your-api-key', // 如果需要认证，替换为实际的 API 密钥
});

// 上传并解析文档
const file = new File(['文件内容'], 'example.pdf', { type: 'application/pdf' });
const result = await documentParser.parseDocument(file, {
  model: 'gpt-4o',
  maintainFormat: true,
});

console.log('解析结果:', result);
```

### 生成文档摘要

```typescript
// 生成文档摘要
const summaryResult = await documentParser.summarizeDocument(file, {
  maxLength: 300,
  format: 'bullet',
});

console.log('摘要结果:', summaryResult);
```

### 获取文档处理状态

```typescript
// 上传文档
const { documentId, status } = await documentParser.uploadDocument(file);

// 获取处理状态
const currentStatus = await documentParser.getDocumentStatus(documentId);
console.log('处理状态:', currentStatus);
```

### 获取文档内容

```typescript
// 获取处理后的文档内容
const content = await documentParser.getDocumentContent(documentId);
console.log('文档内容:', content);
```

### 获取文档分块

```typescript
// 获取文档分块
const chunks = await documentParser.getDocumentChunks(documentId);
console.log('文档分块:', chunks);
```

### 转换文档格式

```typescript
// 转换文档格式
const converted = await documentParser.convertDocument(documentId, 'markdown');
console.log('转换后的文档:', converted);
```

### 使用进度回调

```typescript
// 解析文档并监听进度
const result = await documentParser.parseDocument(
  file,
  { model: 'gpt-4o' },
  (status) => {
    console.log('处理进度:', status);
    // 可以在这里更新 UI 显示进度
  }
);
```

## API 参考

### DocumentParser 类

#### 构造函数

```typescript
constructor(config: DocumentParserConfig)
```

参数:
- `config.baseUrl`: Koa 服务器的基础 URL
- `config.apiKey`: 可选的 API 密钥，用于认证

#### 方法

- `uploadDocument(file: File, options?: DocumentParseOptions)`: 上传文档并开始处理
- `getDocumentStatus(documentId: string)`: 获取文档处理状态
- `getDocumentContent(documentId: string)`: 获取处理后的文档内容
- `getDocumentChunks(documentId: string)`: 获取文档分块
- `convertDocument(documentId: string, format: string)`: 转换文档格式
- `parseDocument(file: File, options?: DocumentParseOptions, onProgress?: (status: DocumentStatus) => void)`: 解析文档（完整流程）
- `summarizeDocument(file: File, options?: DocumentSummaryOptions, onProgress?: (status: DocumentStatus) => void)`: 生成文档摘要

## 示例

查看 `example.ts` 文件获取完整的使用示例。

## 注意事项

- 确保 Koa 服务器已正确配置并运行
- 对于大文件，建议使用进度回调函数来显示处理进度
- 处理大型文档可能需要较长时间，请适当设置超时时间 