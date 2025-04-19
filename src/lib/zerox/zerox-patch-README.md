# Zerox 补丁：支持自定义 Base URL

这个补丁为 zerox 库的 OpenAIModel 类添加了自定义 base URL 支持，使其能够连接到非官方的 OpenAI API 端点。

## 问题

zerox 库的 OpenAIModel 类硬编码了 API 的 base URL 为 "https://api.openai.com/v1/chat/completions"，不支持自定义 base URL。

## 解决方案

我们创建了一个补丁，修改了 OpenAIModel 类，使其支持自定义 base URL。

## 使用方法

### 1. 应用补丁

在项目启动时，运行补丁脚本：

```javascript
// 在应用入口文件中
require('./lib/apply-zerox-patch');
```

或者手动运行补丁脚本：

```bash
node scripts/apply-zerox-patch.js
```

### 2. 使用自定义 base URL

创建 Zerox 实例时，提供 baseUrl 参数：

```javascript
const { Zerox } = require('zerox');

const zerox = new Zerox({
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', // 自定义 base URL
  model: 'gpt-4o-mini',
});
```

### 3. 示例

查看 `src/lib/zerox-example.js` 文件，了解完整的使用示例。

## 注意事项

- 补丁会修改 node_modules 中的文件，在重新安装依赖后需要重新应用补丁
- 补丁会检查是否已经应用过，避免重复应用
- 如果 zerox 库更新，可能需要重新应用补丁

## 补丁内容

补丁主要做了以下修改：

1. 在 OpenAIModel 构造函数中添加 baseUrl 参数
2. 修改 handleOCR 和 handleExtraction 方法中的 API 调用，使用 this.baseUrl 替代硬编码的 URL

## 贡献

如果你发现任何问题或有改进建议，请提交 issue 或 pull request。 