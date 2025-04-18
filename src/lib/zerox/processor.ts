import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { zerox } from 'zerox';
import { zeroxConfig } from './config';
import { ZeroxOptions, ZeroxProcessResult, ZeroxOutput } from './types';
import logger from '@/utils/logger';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

// 增加最大监听器数量
EventEmitter.defaultMaxListeners = 50;

// 确保目录存在并返回目录路径
async function ensureDirectory(dirPath: string): Promise<string> {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
        return dirPath;
    } catch (error) {
        logger.error('创建目录失败', {
            dirPath,
            error: error instanceof Error ? error.message : '未知错误'
        });
        throw new Error(`创建目录失败: ${dirPath}`);
    }
}

// 安全地移动文件
async function safeMoveFile(source: string, target: string): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
        try {
            // 确保目标目录存在
            await ensureDirectory(path.dirname(target));

            // 如果目标文件已存在，先删除
            if (await fs.promises.access(target).then(() => true).catch(() => false)) {
                await fs.promises.unlink(target);
            }

            // 移动文件
            await fs.promises.rename(source, target);
            return;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('移动文件失败');
            logger.warn(`移动文件失败 (尝试 ${i + 1}/${maxRetries})`, {
                source,
                target,
                error: lastError.message
            });

            // 等待一段时间后重试
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    throw lastError;
}

// 从 URL 下载文件
async function downloadFileFromUrl(url: string, outputPath: string): Promise<void> {
    // 确保输出目录存在
    const outputDir = await ensureDirectory(path.dirname(outputPath));

    // 使用临时文件路径，避免中文路径问题
    const tempPath = path.join(
        outputDir,
        `${uuidv4()}.tmp`
    );

    const writer = fs.createWriteStream(tempPath);
    let bytesWritten = 0;
    let error: Error | null = null;

    try {
        logger.info('开始从 URL 下载文件', {
            url,
            outputPath,
            tempPath
        });

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 检查 Content-Length
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            const expectedSize = parseInt(contentLength, 10);
            if (expectedSize === 0) {
                throw new Error('服务器返回的文件大小为 0');
            }
            logger.info('文件大小信息', {
                url,
                expectedSize,
                contentLength
            });
        }

        logger.info('获取到响应，开始写入文件', {
            url,
            outputPath,
            tempPath,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });

        return new Promise(async (resolve, reject) => {
            writer.on('finish', async () => {
                writer.end();
                if (error) {
                    logger.error('文件写入完成但之前发生错误', {
                        url,
                        outputPath,
                        tempPath,
                        error: error.message,
                        stack: error.stack,
                        bytesWritten
                    });
                    reject(error);
                } else {
                    try {
                        // 验证文件大小
                        const stats = await fs.promises.stat(tempPath);
                        if (stats.size === 0) {
                            const err = new Error('下载的文件大小为 0');
                            logger.error('下载的文件为空', {
                                url,
                                outputPath,
                                tempPath,
                                size: stats.size
                            });
                            reject(err);
                        } else {
                            // 将临时文件移动到最终位置
                            await safeMoveFile(tempPath, outputPath);
                            logger.info('文件下载完成', {
                                url,
                                outputPath,
                                size: stats.size,
                                bytesWritten
                            });
                            resolve();
                        }
                    } catch (err) {
                        error = err instanceof Error ? err : new Error('验证或移动文件时发生错误');
                        logger.error('验证或移动文件时发生错误', {
                            url,
                            outputPath,
                            tempPath,
                            error: error.message,
                            stack: error.stack
                        });
                        reject(error);
                    }
                }
            });

            writer.on('error', (err) => {
                error = err;
                writer.end();
                logger.error('写入文件时发生错误', {
                    url,
                    outputPath,
                    tempPath,
                    error: err.message,
                    stack: err.stack,
                    bytesWritten
                });
                reject(err);
            });

            writer.on('data', (chunk) => {
                bytesWritten += chunk.length;
            });

            if (!response.body) {
                const err = new Error('Response body is null');
                logger.error('响应体为空', {
                    url,
                    outputPath,
                    tempPath
                });
                reject(err);
                return;
            }

            try {
                // 将流处理逻辑包装在异步函数中
                await (async () => {
                    const chunks: Uint8Array[] = [];
                    const reader = response.body!.getReader();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        if (!value || value.length === 0) {
                            logger.warn('收到空数据块', {
                                url,
                                outputPath,
                                tempPath
                            });
                            continue;
                        }
                        chunks.push(value);
                    }

                    if (chunks.length === 0) {
                        throw new Error('没有接收到任何数据');
                    }

                    const buffer = Buffer.concat(chunks);
                    if (buffer.length === 0) {
                        throw new Error('合并后的数据为空');
                    }

                    writer.write(buffer);
                    writer.end();
                })();
            } catch (err) {
                error = err instanceof Error ? err : new Error('处理响应流时发生错误');
                logger.error('处理响应流时发生错误', {
                    url,
                    outputPath,
                    tempPath,
                    error: error.message,
                    stack: error.stack
                });
                reject(error);
            }
        });
    } catch (error: any) {
        logger.error('下载文件时发生错误', {
            url,
            outputPath,
            tempPath,
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        if (!writer.destroyed) {
            writer.end();
        }
        // 如果发生错误，清理临时文件
        if (fs.existsSync(tempPath)) {
            try {
                await fs.promises.unlink(tempPath);
                logger.info('清理临时文件', { path: tempPath });
            } catch (err) {
                logger.warn('清理临时文件失败', {
                    path: tempPath,
                    error: err instanceof Error ? err.message : '未知错误'
                });
            }
        }
    }
}

// 检查 PDF 文件是否有效
async function isValidPdf(filePath: string): Promise<boolean> {
    try {
        // 使用 pdfinfo 命令检查 PDF 文件
        await execAsync(`pdfinfo "${filePath}"`);
        return true;
    } catch (error) {
        logger.error('PDF 文件无效', {
            filePath,
            error: error instanceof Error ? error.message : '未知错误'
        });
        return false;
    }
}

// 确保所有必要的目录存在
async function ensureAllDirectories(): Promise<{
    baseDir: string;
    tempDir: string;
    processedDir: string;
}> {
    const baseDir = path.join(os.tmpdir(), 'deepmed-search');
    const tempDir = path.join(baseDir, 'temp');
    const processedDir = path.join(baseDir, 'processed');

    await Promise.all([
        ensureDirectory(baseDir),
        ensureDirectory(tempDir),
        ensureDirectory(processedDir)
    ]);

    return {
        baseDir,
        tempDir,
        processedDir
    };
}

export async function processDocumentWithZerox(
    filePathOrUrl: string,
    options: ZeroxOptions = {}
): Promise<ZeroxProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        logger.info('开始处理文档', {
            documentId,
            filePathOrUrl,
            options: {
                ...options,
                apiKey: undefined
            }
        });

        // 确保目录存在
        const { baseDir, tempDir, processedDir } = await ensureAllDirectories();
        // 检查输入是 URL 还是本地文件路径
        const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');

        logger.info('源文件信息', {
            originalPath: filePathOrUrl,
            // absolutePath: absoluteFilePath,
            // exists: fs.existsSync(absoluteFilePath),
            // stats: fs.statSync(absoluteFilePath)
        });

        // 确定 API 密钥
        const apiKey = options.apiKey || process.env.OPENAI_API_KEY || zeroxConfig.apiKey;
        if (!apiKey) {
            logger.error('API 密钥缺失');
            throw new Error('API key is missing. Provide it via options, OPENAI_API_KEY env var, or config.');
        }
        const credentials = { apiKey };

        // 确定模型提供商和模型
        const modelProvider = options.modelProvider || zeroxConfig.modelProvider;
        const model = options.model || zeroxConfig.defaultModel;

        // 使用临时目录
        const outputDir = options.outputDir || processedDir;
        const tempDirPath = options.tempDir || path.join(tempDir, `zerox-${documentId}`);

        logger.info('开始使用 ZeroX 处理文档', {
            filePath: filePathOrUrl,
            documentId,
            modelProvider,
            model,
            outputDir,
            tempDir: tempDirPath,
            options: {
                ...options,
                apiKey: undefined
            }
        });

        // 调用 zerox 处理文档
        const result: ZeroxOutput = await zerox({
            filePath: filePathOrUrl,
            modelProvider,
            model,
            credentials,
            outputDir,
            maintainFormat: options.maintainFormat ?? false,
            cleanup: options.cleanup ?? zeroxConfig.processing.cleanup,
            concurrency: options.concurrency ?? zeroxConfig.processing.concurrency,
            tempDir: tempDirPath,
            maxImageSize: options.maxImageSize ?? zeroxConfig.processing.maxImageSize,
            imageDensity: options.imageDensity ?? zeroxConfig.processing.imageDensity,
            imageHeight: options.imageHeight ?? zeroxConfig.processing.imageHeight,
            correctOrientation: options.correctOrientation ?? zeroxConfig.processing.correctOrientation,
            trimEdges: options.trimEdges ?? zeroxConfig.processing.trimEdges,
            directImageExtraction: options.directImageExtraction,
            extractionPrompt: options.extractionPrompt,
            extractOnly: options.extractOnly,
            extractPerPage: options.extractPerPage,
            prompt: options.prompt
        });
        const processingTime = Date.now() - startTime;
        logger.info('Zerox文档转换完成', {
            documentId,
            processingTime
        });
        return {
            success: true,
            data: {
                pages: result.pages,
                extracted: result.extracted,
                summary: result.summary
            },
            metadata: {
                processingTime: processingTime,
                documentId: documentId,
                completionTime: result.completionTime,
                fileName: result.fileName,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
            }
        } as ZeroxProcessResult;
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error('文档处理失败', {
            documentId,
            processingTime,
            error: error instanceof Error ? error.message : '未知错误'
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            metadata: {
                documentId,
                processingTime
            }
        };
    }
} 