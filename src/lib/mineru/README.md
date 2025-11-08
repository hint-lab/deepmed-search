# MinerU 文档处理

使用 [MinerU API](https://mineru.net/apiManage/docs) 进行文档处理（PDF 转 Markdown）。

## 功能

- ✅ PDF 文档解析
- ✅ 图片提取和 OCR
- ✅ Markdown 格式输出
- ✅ 异步任务处理
- ✅ 进度跟踪

## 环境变量

```env
MINERU_API_KEY=your_api_key
MINERU_BASE_URL=https://mineru.net/api  # 可选，默认值
MINERU_TIMEOUT=300000  # 可选，默认 5 分钟
```

## 使用示例

```typescript
import { processDocumentWithMinerU } from '@/lib/mineru';

// 处理文档
const result = await processDocumentWithMinerU('https://example.com/doc.pdf', {
  maintainFormat: true,
  prompt: '提取所有文本内容',
});

if (result.success) {
  console.log('提取的内容:', result.data.extracted);
  console.log('页数:', result.data.pages.length);
} else {
  console.error('处理失败:', result.error);
}
```

## API 参考

### processDocumentWithMinerU

处理文档并返回 Markdown 内容。

**参数：**
- `filePathOrUrl`: 文件路径或 URL
- `options`: 处理选项（可选）
  - `fileName`: 文件名
  - `model`: 模型名称（默认: 'default'）
  - `maintainFormat`: 是否保持格式（默认: true）
  - `prompt`: 自定义提示词

**返回：**
- `MinerUProcessResult`: 处理结果

### MinerUClient

MinerU API 客户端类。

**方法：**
- `createTask(options)`: 创建处理任务
- `getTaskStatus(taskId)`: 获取任务状态
- `waitForTaskCompletion(taskId)`: 等待任务完成
- `downloadResult(url, path)`: 下载结果文件
- `extractMarkdownFromZip(zipPath)`: 从 ZIP 提取 Markdown

## 与 Zerox 的对比

| 特性 | Zerox | MinerU |
|------|-------|--------|
| API 类型 | 本地 SDK | REST API |
| 处理方式 | 同步 | 异步任务 |
| 配置复杂度 | 高 | 低 |
| 依赖 | 多 | 少 |
| 部署 | 需要本地环境 | 云端服务 |

## 迁移说明

已从 Zerox 迁移到 MinerU：

- ✅ 删除 `src/lib/zerox/` 文件夹
- ✅ 创建 `src/lib/mineru/` 实现
- ✅ 更新 `document-worker` 使用 MinerU
- ✅ 更新测试页面移除 Zerox 依赖
- ✅ 从 `package.json` 移除 `zerox` 依赖

## 注意事项

1. **API 密钥**: 需要从 [MinerU](https://mineru.net/apiManage/docs) 获取 API 密钥
2. **异步处理**: MinerU 使用异步任务，需要轮询状态
3. **ZIP 解压**: 结果以 ZIP 格式返回，需要解压提取 Markdown
4. **超时设置**: 默认超时 5 分钟，可通过环境变量调整

## 故障排查

### 任务创建失败

- 检查 `MINERU_API_KEY` 是否正确设置
- 检查文件 URL 是否可访问
- 查看日志获取详细错误信息

### 任务超时

- 增加 `MINERU_TIMEOUT` 环境变量值
- 检查网络连接
- 查看 MinerU API 状态

### ZIP 解压失败

- 确保系统安装了 `unzip` 命令
- 检查临时目录权限
- 查看日志获取详细错误信息

