/**
 * 统一文档解析器
 * 支持多种解析方式：MarkItDown（本地/Docker）、MinerU（远程）
 */

import logger from '@/utils/logger';
import { processDocumentWithMinerU } from '../mineru/client';
import { convertToMarkdown as convertWithLocalMarkItDown } from '../markitdown/client';
import { mapToMarkitdownLanguage, mapToMineruLanguage, normalizeLanguage } from '@/constants/language';
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
  documentId?: string; // 文档ID，用于图片上传到 MinIO
  language?: string;
}

/**
 * 下载 URL 文件到临时目录
 */
async function downloadUrlToTemp(url: string): Promise<string> {
  const fileName = path.basename(url.split('?')[0]); // 移除查询参数
  const tempFilePath = path.join(os.tmpdir(), `deepmed-${Date.now()}-${fileName}`);

  // 在 Docker 环境中，将 localhost:9000 替换为 minio:9000（容器内地址）
  let actualUrl = url;
  if (process.env.NODE_ENV === 'production' && url.includes('localhost:9000')) {
    actualUrl = url.replace('localhost:9000', 'minio:9000');
    logger.info('[Document Parser] 替换 URL 中的 localhost 为容器内地址', { originalUrl: url, actualUrl });
  }

  logger.info('[Document Parser] 下载文件', { url, actualUrl, tempFilePath });

  const response = await fetch(actualUrl);
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
async function convertWithDockerMarkItDown(
  filePathOrUrl: string,
  options: DocumentParseOptions = {}
): Promise<DocumentParseResult> {
  const startTime = Date.now();
  let tempFilePath: string | null = null;
  const markitdownUrl = process.env.MARKITDOWN_URL || 'http://localhost:5001';
  let filePath: string = filePathOrUrl;
  const documentId = options.documentId;
  const normalizedMarkitdownLanguage = options.language ? normalizeLanguage(options.language) : undefined;
  const language = options.language ? mapToMarkitdownLanguage(options.language) : undefined;

  try {
    // 如果是 URL，先下载到临时文件
    const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
    filePath = isUrl ? await downloadUrlToTemp(filePathOrUrl) : filePathOrUrl;
    if (isUrl) {
      tempFilePath = filePath;
    }

    logger.info('[Document Parser] 使用 Docker MarkItDown', {
      originalPath: filePathOrUrl,
      filePath,
      url: markitdownUrl,
      isUrl,
      documentId,
    });

    // 创建表单数据
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    form.append('file', fileStream, { filename: fileName });

    // 添加额外字段
    if (documentId) {
      form.append('document_id', documentId);
    }
    if (language) {
      form.append('language', language);
    }

    // 使用 axios 发送请求（更好的 form-data 支持）
    // 添加超时配置（5分钟）
    const response = await axios.post(`${markitdownUrl}/convert`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000, // 5分钟超时
    });

    const result = response.data;

    if (!result.success) {
      throw new Error(result.error || 'MarkItDown 转换失败');
    }

    // 检查返回的内容是否为空
    const content = result.content || '';
    if (!content || content.trim().length === 0) {
      logger.warn('[Document Parser] Docker MarkItDown 返回空内容', {
        filePathOrUrl,
        filePath,
        result: result,
      });
      throw new Error('MarkItDown 转换成功但返回内容为空。可能是文档格式不支持或解析失败。');
    }

    const processingTime = Date.now() - startTime;

    logger.info('[Document Parser] Docker MarkItDown 转换成功', {
      filePathOrUrl,
      filePath,
      processingTime,
      contentLength: content.length,
    });

    // 简单分页处理
    const pages = content
      .split('\n\n')
      .filter((p: string) => p.trim().length > 0)
      .map((content: string, i: number) => ({
        pageNum: i + 1,
        content: content.trim(),
        tokens: content.split(/\s+/).length,
      }));

    return {
      success: true,
      content: content,
      pages,
      metadata: {
        processingTime,
        fileName: result.metadata?.filename,
        language: normalizedMarkitdownLanguage ?? language,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    let errorMsg = error instanceof Error ? error.message : '未知错误';

    // 处理 axios 错误，提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = `连接 MarkItDown 服务超时。请检查服务是否正常运行（${markitdownUrl}）。如果使用 Docker，请确保容器已启动。`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMsg = `无法连接到 MarkItDown 服务（${markitdownUrl}）。请检查服务是否已启动。`;
      } else if (error.response) {
        errorMsg = `MarkItDown API 错误: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data) {
          const errorData = typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);
          errorMsg += ` - ${errorData}`;
        }
      } else {
        errorMsg = `网络错误: ${error.message}`;
      }
    }

    logger.error('[Document Parser] Docker MarkItDown 转换失败', {
      filePathOrUrl,
      filePath,
      markitdownUrl,
      processingTime,
      error: errorMsg,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });

    const normalizedLang = options.language ? normalizeLanguage(options.language) : undefined;

    return {
      success: false,
      content: '',
      error: errorMsg,
      metadata: {
        processingTime,
        language: normalizedLang,
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
async function convertWithDockerMinerU(
  filePathOrUrl: string,
  options: DocumentParseOptions = {}
): Promise<DocumentParseResult> {
  const startTime = Date.now();
  const mineruUrl = process.env.MINERU_URL || 'http://localhost:8000';
  let tempFilePath: string | null = null;
  let filePath: string = filePathOrUrl;
  const documentId = options.documentId;
  const fileName = options.fileName;
  const normalizedLanguage = normalizeLanguage(options.language);
  const mineruLanguage = mapToMineruLanguage(options.language);

  try {
    // 如果是 URL，先下载到临时文件
    const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
    if (isUrl) {
      filePath = await downloadUrlToTemp(filePathOrUrl);
      tempFilePath = filePath;
    }

    logger.info('[Document Parser] 使用 Docker MinerU', {
      originalPath: filePathOrUrl,
      filePath,
      fileName,
      url: mineruUrl,
      isUrl,
      documentId,
      language: normalizedLanguage,
    });

    // 检查文件是否存在
    if (!await fs.pathExists(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 创建表单数据（使用 form-data 包）
    const form = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const actualFileName = fileName || path.basename(filePath);
    form.append('file', fileStream, { filename: actualFileName });

    // 添加 documentId（如果有）
    if (documentId) {
      form.append('document_id', documentId);
    }

    // 添加语言参数（MinerU 使用 'ch' 表示简体中文，不是 'zh'）
    // 支持的语言代码：ch (简体中文), ch_server, ch_lite, chinese_cht (繁体中文), en, korean, japan 等
    // 如果不传递，MinerU API 会默认使用 'ch' (简体中文)
    form.append('lang', mineruLanguage);

    // 使用 axios 发送请求（更好的 form-data 支持）
    const response = await axios.post(`${mineruUrl}/v4/extract/task`, form, {
      headers: {
        ...form.getHeaders(),
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 300000, // 5分钟超时
    });

    const result = response.data;

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
        language: normalizedLanguage,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    let errorMsg = error instanceof Error ? error.message : '未知错误';

    // 处理 axios 错误，提供更详细的错误信息
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = `连接 MinerU 服务超时（${mineruUrl}）。请检查服务是否正常运行。如果使用 Docker，请运行: docker-compose up -d mineru`;
      } else if (error.code === 'ECONNREFUSED') {
        const isDockerUrl = mineruUrl.includes('mineru:') || mineruUrl.includes('localhost');
        const troubleshooting = isDockerUrl
          ? '如果使用 Docker，请运行: docker-compose up -d mineru，然后检查容器状态: docker ps | grep mineru'
          : '请检查 MinerU 服务是否已启动，或检查 MINERU_URL 环境变量配置是否正确';
        errorMsg = `无法连接到 MinerU 服务（${mineruUrl}）。${troubleshooting}`;
      } else if (error.response) {
        errorMsg = `MinerU Docker API 错误: ${error.response.status} - ${error.response.statusText}`;
        if (error.response.data) {
          const errorData = typeof error.response.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response.data);
          errorMsg += ` - ${errorData}`;
        }
      } else {
        errorMsg = `网络错误: ${error.message}`;
      }
    }

    logger.error('[Document Parser] Docker MinerU 转换失败', {
      originalPath: filePathOrUrl,
      filePath,
      fileName,
      mineruUrl,
      processingTime,
      error: errorMsg,
      errorDetails: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });

    const normalizedLang = options.language ? normalizeLanguage(options.language) : undefined;

    return {
      success: false,
      content: '',
      error: errorMsg,
      metadata: {
        processingTime,
        language: normalizedLang,
      },
    };
  } finally {
    // 清理临时文件
    if (tempFilePath && await fs.pathExists(tempFilePath)) {
      try {
        await fs.remove(tempFilePath);
        logger.info('[Document Parser] 已清理临时文件', { tempFilePath });
      } catch (cleanupError) {
        logger.warn('[Document Parser] 清理临时文件失败', {
          tempFilePath,
          error: cleanupError instanceof Error ? cleanupError.message : '未知错误',
        });
      }
    }
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
  const normalizedLanguage = normalizeLanguage(options.language);
  const mineruLanguage = mapToMineruLanguage(options.language);

  try {
    logger.info('[Document Parser] 使用 MinerU Cloud', {
      fileUrl,
      language: normalizedLanguage,
      mineruLanguage,
    });

    const result = await processDocumentWithMinerU(fileUrl, {
      fileName: options.fileName,
      maintainFormat: options.maintainFormat,
      prompt: options.prompt,
      language: options.language,
    });

    if (!result.success) {
      return {
        success: false,
        content: '',
        error: result.error,
        metadata: {
          ...result.metadata,
          language: normalizedLanguage,
        },
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
      metadata: {
        ...result.metadata,
        language: normalizedLanguage,
      },
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
        language: normalizedLanguage,
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
  // 从用户上下文获取解析器类型，如果没有则使用默认值
  const { getDocumentParser, hasUserDocumentContext } = require('./user-context');

  const parserType: ParserType =
    options.parserType ||
    (hasUserDocumentContext() ? getDocumentParser() : 'markitdown-docker');

  logger.info('[Document Parser] 开始解析文档', {
    filePathOrUrl,
    parserType,
  });

  try {
    // 根据解析器类型选择不同的实现
    switch (parserType) {
      case 'markitdown-docker':
        // Docker MarkItDown（通过 HTTP API）
        return await convertWithDockerMarkItDown(filePathOrUrl, options);

      case 'mineru-docker':
        // Docker MinerU（通过 HTTP API，支持本地文件）
        return await convertWithDockerMinerU(filePathOrUrl, options);

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
  const { getDocumentParser, hasUserDocumentContext } = require('./user-context');
  return hasUserDocumentContext() ? getDocumentParser() : 'markitdown-docker';
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
        const url = process.env.MINERU_URL || 'http://localhost:8000';
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


