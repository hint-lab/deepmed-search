import {
  MinerUConfig,
  MinerUTaskOptions,
  MinerUTaskResponse,
  MinerUTaskStatusResponse,
  MinerUProcessResult,
  MinerUTaskState,
} from './types';
import { validateMinerUConfig } from './config';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * MinerU API 客户端
 */
export class MinerUClient {
  private config: MinerUConfig;

  constructor(config: Partial<MinerUConfig>) {
    this.config = validateMinerUConfig(config);
  }

  /**
   * 创建处理任务
   */
  async createTask(options: MinerUTaskOptions): Promise<MinerUTaskResponse> {
    try {
      const url = `${this.config.baseUrl}/v4/extract/task`;

      logger.info('[MinerU] 创建任务', {
        url,
        fileUrl: options.fileUrl,
        fileName: options.fileName,
      });

      // 检查文件 URL 是否为本地地址
      if (options.fileUrl.includes('localhost') || options.fileUrl.includes('127.0.0.1')) {
        logger.warn('[MinerU] 警告：文件 URL 使用本地地址，MinerU 云端服务无法访问', {
          fileUrl: options.fileUrl,
          hint: '请参考 src/lib/mineru/LIMITATIONS.md 了解解决方案',
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          file_url: options.fileUrl,
          file_name: options.fileName,
          model: options.model || 'default',
          maintain_format: options.maintainFormat ?? true,
          prompt: options.prompt,
          ...options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[MinerU] 创建任务失败', {
          status: response.status,
          error: errorText,
        });
        throw new Error(`MinerU API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      logger.info('[MinerU] API 响应', {
        success: data.success,
        hasData: !!data.data,
        hasTaskId: !!data.data?.task_id,
        error: data.error,
        data: data,
      });

      if (!data.success || !data.data?.task_id) {
        const errorMsg = data.error || data.message || 'Failed to create task';
        logger.error('[MinerU] 任务创建失败（响应数据）', {
          errorMsg,
          fullResponse: data,
        });
        throw new Error(errorMsg);
      }

      logger.info('[MinerU] 任务创建成功', {
        taskId: data.data.task_id,
      });

      return data;
    } catch (error) {
      logger.error('[MinerU] 创建任务异常', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<MinerUTaskStatusResponse> {
    try {
      const url = `${this.config.baseUrl}/v4/extract/task/${taskId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[MinerU] 获取任务状态失败', {
          taskId,
          status: response.status,
          error: errorText,
        });
        throw new Error(`MinerU API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error('[MinerU] 获取任务状态异常', {
        taskId,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 下载任务结果
   */
  async downloadResult(downloadUrl: string, outputPath: string): Promise<void> {
    try {
      logger.info('[MinerU] 开始下载结果', {
        downloadUrl,
        outputPath,
      });

      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // 确保输出目录存在
      await fs.ensureDir(path.dirname(outputPath));

      // 写入文件
      const buffer = await response.arrayBuffer();
      await fs.writeFile(outputPath, Buffer.from(buffer));

      logger.info('[MinerU] 下载完成', {
        outputPath,
        size: buffer.byteLength,
      });
    } catch (error) {
      logger.error('[MinerU] 下载结果失败', {
        downloadUrl,
        outputPath,
        error: error instanceof Error ? error.message : '未知错误',
      });
      throw error;
    }
  }

  /**
   * 提取 ZIP 文件中的 Markdown 内容
   */
  async extractMarkdownFromZip(zipPath: string): Promise<{
    pages: Array<{ pageNum: number; content: string; tokens: number }>;
    extracted: string;
  }> {
    // 这里需要解压 ZIP 文件并提取 Markdown
    // 可以使用 adm-zip 或类似库
    // 暂时返回空结果，需要根据实际 ZIP 结构实现
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    const extractDir = path.join(os.tmpdir(), 'mineru-extract', uuidv4());
    await fs.ensureDir(extractDir);

    try {
      // 解压 ZIP 文件
      await execAsync(`unzip -q "${zipPath}" -d "${extractDir}"`);

      // 查找 Markdown 文件
      const files = await fs.readdir(extractDir, { recursive: true });
      const mdFiles = files
        .filter((f) => typeof f === 'string' && f.endsWith('.md'))
        .sort() as string[];

      const pages: Array<{ pageNum: number; content: string; tokens: number }> = [];
      let allContent = '';

      for (let i = 0; i < mdFiles.length; i++) {
        const filePath = path.join(extractDir, mdFiles[i]);
        const content = await fs.readFile(filePath, 'utf-8');
        const tokens = content.split(/\s+/).length;

        pages.push({
          pageNum: i + 1,
          content,
          tokens,
        });

        allContent += content + '\n\n';
      }

      // 清理临时目录
      await fs.remove(extractDir);

      return {
        pages,
        extracted: allContent.trim(),
      };
    } catch (error) {
      // 清理临时目录
      await fs.remove(extractDir).catch(() => { });
      throw error;
    }
  }

  /**
   * 轮询任务直到完成
   */
  async waitForTaskCompletion(
    taskId: string,
    pollInterval: number = 5000,
    maxWaitTime: number = 300000
  ): Promise<MinerUTaskStatusResponse> {
    const startTime = Date.now();

    while (true) {
      const status = await this.getTaskStatus(taskId);

      if (!status.success || !status.data) {
        throw new Error(status.error || 'Failed to get task status');
      }

      const { state, progress, err_msg } = status.data;

      logger.info('[MinerU] 任务状态', {
        taskId,
        state,
        progress,
      });

      if (state === MinerUTaskState.DONE) {
        return status;
      }

      if (state === MinerUTaskState.FAILED) {
        throw new Error(err_msg || 'Task failed');
      }

      // 检查超时
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Task timeout');
      }

      // 等待后继续轮询
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

/**
 * 处理文档（主函数）
 */
export async function processDocumentWithMinerU(
  filePathOrUrl: string,
  options: Partial<MinerUTaskOptions> = {}
): Promise<MinerUProcessResult> {
  const startTime = Date.now();
  const documentId = uuidv4();

  try {
    logger.info('[MinerU] 开始处理文档', {
      documentId,
      filePathOrUrl,
    });

    // 从用户上下文获取 MinerU API Key
    const { getMineruApiKey, hasUserDocumentContext } = require('../document-parser/user-context');

    let apiKey: string;
    try {
      if (hasUserDocumentContext()) {
        apiKey = getMineruApiKey();
      } else {
        // 回退到环境变量（用于非队列任务）
        apiKey = process.env.MINERU_API_KEY || '';
        if (!apiKey) {
          throw new Error('MINERU_API_KEY 未配置');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'MinerU API Key 未配置';
      logger.warn('[MinerU] ' + errorMsg);
      return {
        success: false,
        error: errorMsg,
        metadata: {
          documentId,
          processingTime: Date.now() - startTime,
        },
      };
    }

    // 检查文件类型
    const fileExt = path.extname(filePathOrUrl).toLowerCase();

    // 如果是 txt 文件，直接读取内容返回
    if (fileExt === '.txt') {
      let content: string;
      if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
        const response = await fetch(filePathOrUrl);
        content = await response.text();
      } else {
        content = await fs.readFile(filePathOrUrl, 'utf-8');
      }

      const processingTime = Date.now() - startTime;
      return {
        success: true,
        data: {
          pages: [
            {
              pageNum: 1,
              content,
              tokens: content.split(/\s+/).length,
            },
          ],
          extracted: content,
          summary: null,
        },
        metadata: {
          processingTime,
          documentId,
          fileName: path.basename(filePathOrUrl),
          inputTokens: content.split(/\s+/).length,
          outputTokens: content.split(/\s+/).length,
        },
      };
    }

    // 创建 MinerU 客户端
    const client = new MinerUClient({
      apiKey,
    });

    // 创建任务
    const taskResponse = await client.createTask({
      fileUrl: filePathOrUrl,
      fileName: options.fileName || path.basename(filePathOrUrl),
      model: options.model,
      maintainFormat: options.maintainFormat ?? true,
      prompt: options.prompt,
      ...options,
    });

    if (!taskResponse.success || !taskResponse.data?.task_id) {
      throw new Error(taskResponse.error || 'Failed to create task');
    }

    const taskId = taskResponse.data.task_id;

    // 等待任务完成
    const statusResponse = await client.waitForTaskCompletion(taskId);

    if (!statusResponse.data?.full_zip_url) {
      throw new Error('Task completed but no download URL provided');
    }

    // 下载结果
    const tempDir = path.join(os.tmpdir(), 'mineru', documentId);
    await fs.ensureDir(tempDir);
    const zipPath = path.join(tempDir, 'result.zip');

    await client.downloadResult(statusResponse.data.full_zip_url, zipPath);

    // 提取 Markdown 内容
    const { pages, extracted } = await client.extractMarkdownFromZip(zipPath);

    // 清理临时文件
    await fs.remove(tempDir).catch(() => { });

    const processingTime = Date.now() - startTime;

    logger.info('[MinerU] 文档处理完成', {
      documentId,
      processingTime,
      pagesCount: pages.length,
    });

    return {
      success: true,
      data: {
        pages,
        extracted,
        summary: null,
      },
      metadata: {
        processingTime,
        documentId,
        completionTime: processingTime,
        fileName: path.basename(filePathOrUrl),
        inputTokens: extracted.split(/\s+/).length,
        outputTokens: extracted.split(/\s+/).length,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('[MinerU] 文档处理失败', {
      documentId,
      processingTime,
      error: error instanceof Error ? error.message : '未知错误',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      metadata: {
        documentId,
        processingTime,
      },
    };
  }
}

