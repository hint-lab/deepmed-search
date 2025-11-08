import { exec } from 'child_process';
import { promisify } from 'util';
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
    result = md.convert("${filePath.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")
    print(result.text_content)
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

      // 执行转换
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} -c ${JSON.stringify(pythonScript)}`,
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

