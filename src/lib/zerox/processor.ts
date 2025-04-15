import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { zerox } from 'zerox';
import { zeroxConfig } from './config';
import { ZeroxOptions, ProcessResult } from './types';
import logger from '@/utils/logger';
import axios from 'axios';
import { EventEmitter } from 'events';

// 增加最大监听器数量
EventEmitter.defaultMaxListeners = 50;

// 确保目录存在
const ensureDirectories = () => {
    const baseDir = path.join(os.tmpdir(), 'deepmed-search');
    const tempDir = path.join(baseDir, 'temp');
    const processedDir = path.join(baseDir, 'processed');

    [baseDir, tempDir, processedDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    return {
        baseDir,
        tempDir,
        processedDir
    };
};

// 从 URL 下载文件
async function downloadFileFromUrl(url: string, outputPath: string): Promise<void> {
    const writer = fs.createWriteStream(outputPath);

    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                writer.end();
                resolve();
            });
            writer.on('error', (err) => {
                writer.end();
                reject(err);
            });
            response.data.pipe(writer);
        });
    } catch (error) {
        writer.end();
        logger.error('从 URL 下载文件失败', {
            url,
            outputPath,
            error: error instanceof Error ? error.message : '未知错误'
        });
        throw error;
    } finally {
        if (!writer.destroyed) {
            writer.end();
        }
    }
}

export async function processDocumentWithZerox(
    filePathOrUrl: string,
    options: ZeroxOptions = {}
): Promise<ProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        // 确保目录存在
        const { baseDir, tempDir, processedDir } = ensureDirectories();

        // 检查输入是 URL 还是本地文件路径
        const isUrl = filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://');
        let absoluteFilePath: string;

        if (isUrl) {
            // 如果是 URL，下载到临时文件
            const fileName = path.basename(filePathOrUrl).split('?')[0]; // 移除 URL 参数
            absoluteFilePath = path.join(tempDir, `${documentId}-${fileName}`);
            await downloadFileFromUrl(filePathOrUrl, absoluteFilePath);
            logger.info('从 URL 下载文件', {
                url: filePathOrUrl,
                localPath: absoluteFilePath
            });
        } else {
            // 如果是本地文件路径，直接使用
            absoluteFilePath = path.resolve(filePathOrUrl);
            if (!fs.existsSync(absoluteFilePath)) {
                throw new Error(`源文件不存在: ${absoluteFilePath}`);
            }
        }

        logger.info('源文件信息', {
            originalPath: filePathOrUrl,
            absolutePath: absoluteFilePath,
            exists: fs.existsSync(absoluteFilePath),
            stats: fs.statSync(absoluteFilePath)
        });

        // 确定 API 密钥
        const apiKey = options.apiKey || process.env.OPENAI_API_KEY || zeroxConfig.apiKey;
        if (!apiKey) {
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
            filePath: absoluteFilePath,
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
        const result = await zerox({
            filePath: absoluteFilePath,
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

        // 清理临时文件
        if (isUrl) {
            try {
                fs.unlinkSync(absoluteFilePath);
                logger.info('清理临时文件', { path: absoluteFilePath });
            } catch (error) {
                logger.warn('清理临时文件失败', {
                    path: absoluteFilePath,
                    error: error instanceof Error ? error.message : '未知错误'
                });
            }
        }

        const processingTime = Date.now() - startTime;
        logger.info('文档处理完成', {
            documentId,
            processingTime,
            result
        });

        return {
            success: true,
            data: result,
            metadata: {
                processingTime,
                documentId
            }
        };
    } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.error('文档处理失败', {
            documentId,
            processingTime,
            error: error instanceof Error ? error.message : '未知错误',
            stack: error instanceof Error ? error.stack : undefined
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
            metadata: {
                processingTime,
                documentId
            }
        };
    }
} 