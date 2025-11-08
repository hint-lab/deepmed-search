# MarkItDown 集成方案

使用微软的 [MarkItDown](https://github.com/microsoft/markitdown) 作为本地文档处理方案。

## 为什么选择 MarkItDown？

- ✅ **微软官方** - 质量保证，持续维护
- ✅ **格式全面** - PDF、DOCX、PPTX、XLSX、图片、音频、HTML、ZIP、EPUB
- ✅ **专为 LLM 设计** - 输出结构化 Markdown
- ✅ **本地处理** - 无需公网访问
- ✅ **可选依赖** - 按需安装特定格式支持
- ✅ **Python 简单** - 易于集成和维护

## 安装

### 方式 1：通过 Python 子进程（推荐）

**优点：** 不需要额外的 Node.js 依赖

```bash
# 1. 安装 Python 包（全功能）
pip install 'markitdown[all]'

# 或者按需安装
pip install markitdown
pip install 'markitdown[pdf]'    # 支持 PDF
pip install 'markitdown[docx]'   # 支持 Word
pip install 'markitdown[pptx]'   # 支持 PowerPoint
pip install 'markitdown[xlsx]'   # 支持 Excel
```

### 方式 2：独立 Python 环境

```bash
# 创建虚拟环境
python -m venv venv-markitdown
source venv-markitdown/bin/activate  # Linux/macOS
# venv-markitdown\Scripts\activate  # Windows

# 安装
pip install 'markitdown[all]'
```

## 实现方案

### 创建 MarkItDown 客户端

创建 `src/lib/markitdown/client.ts`：

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import logger from '@/utils/logger';

const execAsync = promisify(exec);

export interface MarkItDownOptions {
  pythonPath?: string;  // Python 可执行文件路径
  timeout?: number;     // 超时时间（毫秒）
}

export interface MarkItDownResult {
  success: boolean;
  content: string;
  error?: string;
  processingTime?: number;
}

export class MarkItDownClient {
  private pythonPath: string;
  private timeout: number;

  constructor(options: MarkItDownOptions = {}) {
    // 默认使用系统 Python
    this.pythonPath = options.pythonPath || process.env.MARKITDOWN_PYTHON_PATH || 'python3';
    this.timeout = options.timeout || 60000; // 60 秒超时
  }

  /**
   * 检查 MarkItDown 是否已安装
   */
  async checkInstallation(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.pythonPath} -c "import markitdown; print('OK')"`);
      return stdout.trim() === 'OK';
    } catch (error) {
      logger.error('[MarkItDown] 未安装或配置错误', {
        pythonPath: this.pythonPath,
        error: error instanceof Error ? error.message : '未知错误',
      });
      return false;
    }
  }

  /**
   * 转换文档为 Markdown
   */
  async convert(filePath: string): Promise<MarkItDownResult> {
    const startTime = Date.now();

    try {
      // 检查文件是否存在
      if (!await fs.pathExists(filePath)) {
        return {
          success: false,
          content: '',
          error: `文件不存在: ${filePath}`,
        };
      }

      logger.info('[MarkItDown] 开始转换文档', {
        filePath,
        size: (await fs.stat(filePath)).size,
      });

      // 构建 Python 命令
      const pythonScript = `
from markitdown import MarkItDown
import sys

try:
    md = MarkItDown()
    result = md.convert("${filePath.replace(/\\/g, '\\\\')}")
    print(result.text_content)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

      // 执行转换
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} -c '${pythonScript}'`,
        {
          timeout: this.timeout,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr && stderr.includes('ERROR:')) {
        throw new Error(stderr.replace('ERROR:', '').trim());
      }

      const processingTime = Date.now() - startTime;

      logger.info('[MarkItDown] 转换成功', {
        filePath,
        processingTime,
        contentLength: stdout.length,
      });

      return {
        success: true,
        content: stdout,
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : '未知错误';

      logger.error('[MarkItDown] 转换失败', {
        filePath,
        processingTime,
        error: errorMsg,
      });

      return {
        success: false,
        content: '',
        error: errorMsg,
        processingTime,
      };
    }
  }

  /**
   * 批量转换文档
   */
  async convertBatch(filePaths: string[]): Promise<MarkItDownResult[]> {
    const results: MarkItDownResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.convert(filePath);
      results.push(result);
    }

    return results;
  }
}

/**
 * 创建默认 MarkItDown 客户端实例
 */
export function createMarkItDownClient(options?: MarkItDownOptions): MarkItDownClient {
  return new MarkItDownClient(options);
}

/**
 * 快捷转换函数
 */
export async function convertToMarkdown(filePath: string): Promise<MarkItDownResult> {
  const client = createMarkItDownClient();
  return await client.convert(filePath);
}
```

### 集成到文档处理流程

修改 `src/lib/bullmq/document-worker/index.ts`：

```typescript
import { createMarkItDownClient } from '@/lib/markitdown/client';
import { getLocalFilePath } from '@/lib/minio/operations';

export async function processDocument(data: DocumentProcessJobData): Promise<DocumentProcessJobResult> {
  const { documentId, options, documentInfo } = data;

  try {
    if (!documentInfo || !documentInfo.uploadFile) {
      throw new Error('文档信息不完整');
    }

    // 获取本地文件路径
    const localFilePath = await getLocalFilePath(documentInfo.uploadFile.location);

    logger.info('[Document Worker] 使用 MarkItDown 处理文档', {
      documentId,
      localFilePath,
    });

    // 使用 MarkItDown 转换
    const markItDownClient = createMarkItDownClient();
    
    // 先检查是否已安装
    const isInstalled = await markItDownClient.checkInstallation();
    if (!isInstalled) {
      throw new Error('MarkItDown 未安装，请运行: pip install markitdown[all]');
    }

    // 转换文档
    const result = await markItDownClient.convert(localFilePath);

    if (!result.success) {
      throw new Error(result.error || '文档转换失败');
    }

    // 将 Markdown 内容按页分割（简单实现）
    const pages = result.content.split('\n\n').map((content, i) => ({
      content: content.trim(),
      contentLength: content.trim().length,
    })).filter(p => p.contentLength > 0);

    return {
      success: true,
      data: {
        pages,
        extracted: result.content,
        summary: {
          totalPages: pages.length,
          ocr: {
            successful: pages.length,
            failed: 0,
          },
          extracted: result.content,
        },
      },
      error: '',
      metadata: {
        documentId,
        processingTime: result.processingTime || 0,
      },
    };
  } catch (error) {
    logger.error('[Document Worker] MarkItDown 处理失败', {
      documentId,
      error: error instanceof Error ? error.message : '未知错误',
    });

    throw error;
  }
}
```

## 配置

### 环境变量

在 `.env.local` 中配置：

```env
# MarkItDown Python 路径（可选）
MARKITDOWN_PYTHON_PATH=python3
# 或使用虚拟环境
# MARKITDOWN_PYTHON_PATH=/path/to/venv-markitdown/bin/python

# 文档解析器选择
DOCUMENT_PARSER=markitdown
```

### 检查安装

创建测试脚本 `src/scripts/test-markitdown.ts`：

```typescript
import { createMarkItDownClient } from '@/lib/markitdown/client';

async function testMarkItDown() {
  const client = createMarkItDownClient();

  // 检查安装
  console.log('检查 MarkItDown 安装状态...');
  const isInstalled = await client.checkInstallation();
  
  if (isInstalled) {
    console.log('✅ MarkItDown 已正确安装');
  } else {
    console.log('❌ MarkItDown 未安装');
    console.log('请运行: pip install markitdown[all]');
    process.exit(1);
  }

  // 测试转换（如果有测试文件）
  const testFile = process.argv[2];
  if (testFile) {
    console.log(`\n测试转换文件: ${testFile}`);
    const result = await client.convert(testFile);
    
    if (result.success) {
      console.log('✅ 转换成功');
      console.log(`处理时间: ${result.processingTime}ms`);
      console.log(`内容长度: ${result.content.length} 字符`);
      console.log('\n--- Markdown 内容预览 ---');
      console.log(result.content.substring(0, 500));
      console.log('...');
    } else {
      console.log('❌ 转换失败:', result.error);
    }
  }
}

testMarkItDown().catch(console.error);
```

运行测试：

```bash
# 检查安装
npx tsx src/scripts/test-markitdown.ts

# 测试转换
npx tsx src/scripts/test-markitdown.ts /path/to/test.pdf
```

## 支持的格式

MarkItDown 支持以下格式：

| 格式 | 扩展名 | 依赖包 |
|------|--------|--------|
| PDF | `.pdf` | `markitdown[pdf]` |
| Word | `.docx`, `.doc` | `markitdown[docx]` |
| PowerPoint | `.pptx`, `.ppt` | `markitdown[pptx]` |
| Excel | `.xlsx`, `.xls` | `markitdown[xlsx]` |
| 图片 | `.jpg`, `.png` | 内置（OCR via LLM） |
| 音频 | `.mp3`, `.wav` | `markitdown[speech]` |
| HTML | `.html`, `.htm` | 内置 |
| 文本 | `.txt`, `.csv`, `.json`, `.xml` | 内置 |
| ZIP | `.zip` | 内置 |
| EPUB | `.epub` | `markitdown[epub]` |

## 与其他方案对比

| 特性 | MarkItDown | MinerU | pdf-parse |
|------|-----------|--------|-----------|
| 本地处理 | ✅ | ❌ | ✅ |
| 格式支持 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| 转换质量 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 安装难度 | ⭐⭐ (Python) | ⭐ (API) | ⭐ (npm) |
| 处理速度 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| OCR 支持 | ✅ | ✅ | ❌ |
| 成本 | 免费 | 付费 | 免费 |

## 故障排查

### 问题 1：MarkItDown 未找到

```bash
# 检查 Python 安装
python3 --version

# 检查 MarkItDown 安装
python3 -c "import markitdown; print(markitdown.__version__)"

# 重新安装
pip install --upgrade markitdown[all]
```

### 问题 2：特定格式不支持

```bash
# 安装特定格式支持
pip install 'markitdown[pdf]'
pip install 'markitdown[docx]'
pip install 'markitdown[xlsx]'
```

### 问题 3：转换超时

```typescript
// 增加超时时间
const client = createMarkItDownClient({
  timeout: 120000, // 2 分钟
});
```

### 问题 4：内存不足

```typescript
// 对大文件，可以考虑分页处理或限制并发
const result = await client.convert(filePath);
```

## 快速开始

```bash
# 1. 安装 MarkItDown
pip install 'markitdown[all]'

# 2. 配置环境变量
echo "DOCUMENT_PARSER=markitdown" >> .env.local

# 3. 测试
npx tsx src/scripts/test-markitdown.ts

# 4. 重启应用
yarn dev

# 5. 上传文档测试
# 现在文档会自动使用 MarkItDown 本地处理！
```

## 下一步

- [ ] 实现 `src/lib/markitdown/client.ts`
- [ ] 集成到 document-worker
- [ ] 创建测试脚本
- [ ] 添加错误处理和重试机制
- [ ] 考虑使用 Python MCP 服务器（更高效）

## 参考资源

- [MarkItDown GitHub](https://github.com/microsoft/markitdown)
- [MarkItDown PyPI](https://pypi.org/project/markitdown/)
- [微软官方博客](https://microsoft.github.io/markitdown/)

