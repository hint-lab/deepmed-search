/**
 * 统一文档解析器
 * 支持多种解析方式：MarkItDown（本地/Docker）、MinerU（远程）
 */

import logger from '@/utils/logger';
import { processDocumentWithMinerU } from '../mineru/client';
import { convertToMarkdown as convertWithLocalMarkItDown } from '../markitdown/client';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import axios from 'axios';
import FormData from 'form-data';

export type ParserType = 'markitdown-docker' | 'mineru-docker' | 'mineru-cloud';

export interface DocumentParseResult {
  success: boolean;
  content: string;
  pages?: Array<{ pageNum: number; content: string; tokens?: number }>;
  metadata?: {
    processingTime?: number;
    documentId?: string;
    fileName?: string;
    [key: string]: any;
  };
  error?: string;
}

export interface DocumentParseOptions {
  parserType?: ParserType;
  fileName?: string;
  maintainFormat?: boolean;
  prompt?: string;
}

/**
 * 下载 URL 文件到临时目录
 */
async function downloadUrlToTemp(url: string): Promise<string> {
  const fileName = path.basename(url.split('?')[0]); // 移除查询参数
  const tempFilePath = path.join(os.tmpdir(), `deepmed-${Date.now()}-${fileName}`);

  logger.info('[Document Parser] 下载文件', { url, tempFilePath });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  await fs.writeFile(tempFilePath, Buffer.from(buffer));

  return tempFilePath;
}

/**
 * 使用 Docker 中的 MarkItDown 转换文档
 */
async function convertWithDockerMarkItDown(filePathOrUrl: string): Promise<DocumentParseResult> {
  const startTime = Date.now();
  let tempFilePath: string | null = null;

  try {
    const markitdownUrl = process.env.MARKITDOWN_URL || 'http://localhost:5001';

    // 如果是 URL，先下载到临时文件
    const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
    const filePath = isUrl ? await downloadUrlToTemp(filePathOrUrl) : filePathOrUrl;
    if (isUrl) {
      tempFilePath = filePath;
    }

    logger.info('[Document Parser] 使用 Docker MarkItDown', {
      originalPath: filePathOrUrl,
      filePath,
      url: markitdownUrl,
      isUrl,
    });

    // 创建表单数据
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    form.append('file', fileStream, { filename: fileName });

    // 使用 axios 发送请求（更好的 form-data 支持）
    const response = await axios.post(`${markitdownUrl}/convert`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error || 'MarkItDown 转换失败');
    }

    const processingTime = Date.now() - startTime;

    logger.info('[Document Parser] Docker MarkItDown 转换成功', {
      filePathOrUrl,
      filePath,
      processingTime,
      contentLength: result.content.length,
    });

    // 简单分页处理
    const pages = result.content
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0)
      .map((content: string, i: number) => ({
        pageNum: i + 1,
        content: content.trim(),
        tokens: content.split(/\s+/).length,
      }));

    return {
      success: true,
      content: result.content,
      pages,
      metadata: {
        processingTime,
        fileName: result.metadata?.filename,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Document Parser] Docker MarkItDown 转换失败', {
      filePathOrUrl,
      processingTime,
      error: errorMsg,
    });

    return {
      success: false,
      content: '',
      error: errorMsg,
      metadata: {
        processingTime,
      },
    };
  } finally {
    // 清理临时文件
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        logger.info('[Document Parser] 已清理临时文件', { tempFilePath });
      } catch (err) {
        logger.warn('[Document Parser] 清理临时文件失败', {
          tempFilePath,
          error: err instanceof Error ? err.message : '未知错误'
        });
      }
    }
  }
}

/**
 * 使用 Docker MinerU 转换文档
 */
async function convertWithDockerMinerU(filePath: string, fileName?: string): Promise<DocumentParseResult> {
  const startTime = Date.now();

  try {
    const mineruUrl = process.env.MINERU_DOCKER_URL || 'http://localhost:8000';

    logger.info('[Document Parser] 使用 Docker MinerU', {
      filePath,
      fileName,
      url: mineruUrl,
    });

    // 创建表单数据
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    // 发送请求
    const response = await fetch(`${mineruUrl}/v4/extract/task`, {
      method: 'POST',
      body: form as any,
      headers: form.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MinerU Docker API 错误: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (result.code !== 'success') {
      throw new Error(result.message || 'MinerU Docker 转换失败');
    }

    const processingTime = Date.now() - startTime;

    logger.info('[Document Parser] Docker MinerU 转换成功', {
      filePath,
      processingTime,
      contentLength: result.data.extracted?.length || 0,
      pageCount: result.data.pages?.length || 0,
    });

    return {
      success: true,
      content: result.data.extracted || '',
      pages: result.data.pages || [],
      metadata: {
        ...result.data.metadata,
        processingTime,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Document Parser] Docker MinerU 转换失败', {
      filePath,
      processingTime,
      error: errorMsg,
    });

    return {
      success: false,
      content: '',
      error: errorMsg,
      metadata: {
        processingTime,
      },
    };
  }
}

/**
 * 使用 MinerU Cloud 转换文档（需要公网 URL）
 */
async function convertWithMinerUCloud(
  fileUrl: string,
  options: DocumentParseOptions
): Promise<DocumentParseResult> {
  const startTime = Date.now();

  try {
    logger.info('[Document Parser] 使用 MinerU', {
      fileUrl,
    });

    const result = await processDocumentWithMinerU(fileUrl, {
      fileName: options.fileName,
      maintainFormat: options.maintainFormat,
      prompt: options.prompt,
    });

    if (!result.success) {
      return {
        success: false,
        content: '',
        error: result.error,
        metadata: result.metadata,
      };
    }

    return {
      success: true,
      content: result.data?.extracted || '',
      pages: result.data?.pages?.map(p => ({
        pageNum: p.pageNum,
        content: p.content,
        tokens: p.tokens,
      })),
      metadata: result.metadata,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Document Parser] MinerU 转换失败', {
      fileUrl,
      processingTime,
      error: errorMsg,
    });

    return {
      success: false,
      content: '',
      error: errorMsg,
      metadata: {
        processingTime,
      },
    };
  }
}

/**
 * 解析文档（统一入口）
 * 
 * @param filePathOrUrl 本地文件路径或公网 URL
 * @param options 解析选项
 */
export async function parseDocument(
  filePathOrUrl: string,
  options: DocumentParseOptions = {}
): Promise<DocumentParseResult> {
  // 优先从用户上下文获取解析器类型，然后是选项，最后是环境变量
  const { getDocumentParser, hasUserDocumentContext } = require('./user-context');

  const parserType: ParserType =
    options.parserType ||
    (hasUserDocumentContext() ? getDocumentParser() : undefined) ||
    (process.env.DOCUMENT_PARSER as ParserType) ||
    'markitdown-docker';

  logger.info('[Document Parser] 开始解析文档', {
    filePathOrUrl,
    parserType,
  });

  try {
    // 根据解析器类型选择不同的实现
    switch (parserType) {
      case 'markitdown-docker':
        // Docker MarkItDown（通过 HTTP API）
        return await convertWithDockerMarkItDown(filePathOrUrl);

      case 'mineru-docker':
        // Docker MinerU（通过 HTTP API，支持本地文件）
        return await convertWithDockerMinerU(filePathOrUrl, options.fileName);

      case 'mineru-cloud':
        // MinerU Cloud（云端服务，需要公网 URL）
        if (!filePathOrUrl.startsWith('http://') && !filePathOrUrl.startsWith('https://')) {
          return {
            success: false,
            content: '',
            error: 'MinerU Cloud 需要公网可访问的 URL，请使用 markitdown-docker 或 mineru-docker 处理本地文件',
          };
        }
        return await convertWithMinerUCloud(filePathOrUrl, options);

      default:
        return {
          success: false,
          content: '',
          error: `不支持的解析器类型: ${parserType}`,
        };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '未知错误';

    logger.error('[Document Parser] 解析失败', {
      filePathOrUrl,
      parserType,
      error: errorMsg,
    });

    return {
      success: false,
      content: '',
      error: errorMsg,
    };
  }
}

/**
 * 获取当前配置的解析器类型
 */
export function getCurrentParserType(): ParserType {
  return (process.env.DOCUMENT_PARSER as ParserType) || 'markitdown-docker';
}

/**
 * 检查解析器是否可用
 */
export async function checkParserAvailability(parserType: ParserType): Promise<boolean> {
  try {
    switch (parserType) {
      case 'markitdown-docker': {
        const url = process.env.MARKITDOWN_URL || 'http://localhost:5001';
        const response = await fetch(`${url}/health`);
        return response.ok;
      }

      case 'mineru-docker': {
        const url = process.env.MINERU_DOCKER_URL || 'http://localhost:8000';
        const response = await fetch(`${url}/health`);
        return response.ok;
      }

      case 'mineru-cloud': {
        const apiKey = process.env.MINERU_API_KEY;
        return !!apiKey;
      }

      default:
        return false;
    }
  } catch (error) {
    logger.error('[Document Parser] 检查解析器可用性失败', {
      parserType,
      error: error instanceof Error ? error.message : '未知错误',
    });
    return false;
  }
}


