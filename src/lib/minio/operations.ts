"use server"

import { Readable } from 'stream';
import { executeWithRetry, limit } from './client';
import { PUBLIC_CONFIG } from './config';
import { MIME_TYPES, FileUploadParams, PresignedUrlParams, MinioServerStatus } from './types';

/**
 * 获取 MinIO 服务器状态
 */
export async function getMinioServerStatus(): Promise<MinioServerStatus> {
    return executeWithRetry(async (client) => {
        try {
            // 获取所有存储桶
            const buckets = await client.listBuckets();

            // 获取每个存储桶的信息
            const bucketInfos = await Promise.all(
                buckets.map(async (bucket) => {
                    const exists = await client.bucketExists(bucket.name);
                    if (!exists) {
                        return {
                            name: bucket.name,
                            size: 0,
                            objects: 0,
                            lastModified: bucket.creationDate.toISOString(),
                            folders: []
                        };
                    }

                    // 计算存储桶中的对象数量和大小
                    let objects = 0;
                    let size = 0;
                    const folders = new Set<string>();
                    const folderSizes = new Map<string, number>();
                    const subfolderSets = new Map<string, Set<string>>();
                    const folderFileCounts = new Map<string, number>();

                    try {
                        // 列出存储桶中的所有对象
                        const objectsList = client.listObjects(bucket.name, '', true);
                        for await (const obj of objectsList) {
                            objects++;
                            const objSize = obj.size || 0;
                            size += objSize;

                            // 提取文件夹路径
                            const path = obj.name;
                            const pathParts = path.split('/');

                            // 更新文件夹大小和子文件夹数量
                            if (pathParts.length > 1) {
                                let currentPath = '';
                                for (let i = 0; i < pathParts.length - 1; i++) {
                                    currentPath += pathParts[i] + '/';
                                    folders.add(currentPath);
                                    folderSizes.set(currentPath, (folderSizes.get(currentPath) || 0) + objSize);

                                    // 计算子文件夹数量
                                    if (i < pathParts.length - 2) {
                                        const parentPath = currentPath;
                                        const childPath = pathParts.slice(0, i + 2).join('/') + '/';
                                        if (!subfolderSets.has(parentPath)) {
                                            subfolderSets.set(parentPath, new Set());
                                        }
                                        subfolderSets.get(parentPath)?.add(childPath);
                                    }

                                    // 计算文件数量
                                    if (i === pathParts.length - 2) {
                                        folderFileCounts.set(currentPath, (folderFileCounts.get(currentPath) || 0) + 1);
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`计算存储桶 ${bucket.name} 对象数量失败:`, error);
                    }

                    return {
                        name: bucket.name,
                        size,
                        objects,
                        lastModified: bucket.creationDate.toISOString(),
                        folders: Array.from(folders).sort().map(folder => ({
                            path: folder,
                            size: folderSizes.get(folder) || 0,
                            subfolders: subfolderSets.get(folder)?.size || 0,
                            files: folderFileCounts.get(folder) || 0
                        }))
                    };
                })
            );

            // 计算总对象数量和大小
            const totalObjects = bucketInfos.reduce((sum, bucket) => sum + bucket.objects, 0);
            const totalSize = bucketInfos.reduce((sum, bucket) => sum + bucket.size, 0);

            // 构建服务器状态
            const status: MinioServerStatus = {
                status: 'healthy',
                version: 'unknown', // MinIO SDK 不提供版本信息
                uptime: 0, // MinIO SDK 不提供运行时间信息
                buckets: bucketInfos,
                totalSize,
                totalObjects
            };

            return status;
        } catch (error) {
            console.error('获取 MinIO 服务器状态失败:', error);
            throw error;
        }
    });
}

/**
 * 检查 MinIO 连接是否可用
 */
export async function checkMinioConnection(): Promise<boolean> {
    try {
        await executeWithRetry(async (client) => {
            await client.listBuckets();
        });
        return true;
    } catch (error) {
        console.error('MinIO 连接检查失败:', error);
        return false;
    }
}

/**
 * 确保存储桶存在，如果不存在则创建
 */
export async function ensureBucketExists(bucketName: string): Promise<boolean> {
    return executeWithRetry(async (client) => {
        try {
            const exists = await client.bucketExists(bucketName);
            if (!exists) {
                await client.makeBucket(bucketName);
                console.log(`创建存储桶: ${bucketName}`);
            }
            return true;
        } catch (error) {
            console.error(`确保存储桶 ${bucketName} 存在失败:`, error);
            return false;
        }
    });
}

/**
 * 上传文件流
 */
export async function uploadFileStream({
    bucketName,
    objectName,
    stream,
    size,
    metaData = {}
}: FileUploadParams): Promise<void> {
    return limit(() => executeWithRetry(async (client) => {
        try {
            // 清理元数据中的无效字符
            const sanitizedMetaData: Record<string, string> = {};
            for (const [key, value] of Object.entries(metaData)) {
                sanitizedMetaData[key] = value.replace(/[^\x20-\x7E]/g, '');
            }

            // 如果没有提供 content-type，根据文件扩展名推断
            if (!sanitizedMetaData['content-type']) {
                const extension = objectName.split('.').pop()?.toLowerCase();
                sanitizedMetaData['content-type'] = extension && MIME_TYPES[extension] || 'application/octet-stream';
            }

            await client.putObject(bucketName, objectName, stream, size, sanitizedMetaData);
        } catch (error) {
            console.error(`上传文件流失败: ${objectName}`, error);
            throw error;
        }
    }));
}

/**
 * 获取文件元数据
 */
export async function getFileMetadata(bucketName: string, objectName: string): Promise<Record<string, string>> {
    return limit(() => executeWithRetry(async (client) => {
        try {
            const stat = await client.statObject(bucketName, objectName);
            return stat.metaData || {};
        } catch (error) {
            console.error(`获取文件元数据失败: ${objectName}`, error);
            throw error;
        }
    }));
}

/**
 * 删除文件
 */
export async function deleteFile(bucketName: string, objectName: string): Promise<void> {
    return limit(() => executeWithRetry(async (client) => {
        try {
            await client.removeObject(bucketName, objectName);
        } catch (error) {
            console.error(`删除文件失败: ${objectName}`, error);
            throw error;
        }
    }));
}

/**
 * 获取文件流
 */
export async function getFileStream(bucketName: string, objectName: string): Promise<Readable> {
    return limit(() => executeWithRetry(async (client) => {
        try {
            console.log('正在从 MinIO 获取文件:', { bucketName, objectName });

            // 首先检查文件是否存在
            const exists = await fileExists(bucketName, objectName);
            if (!exists) {
                throw new Error(`文件不存在: ${bucketName}/${objectName}`);
            }

            return await client.getObject(bucketName, objectName);
        } catch (error) {
            console.error(`获取文件流失败:`, {
                bucketName,
                objectName,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }));
}

/**
 * 检查文件是否存在
 */
export async function fileExists(bucketName: string, objectName: string): Promise<boolean> {
    return limit(() => executeWithRetry(async (client) => {
        try {
            await client.statObject(bucketName, objectName);
            return true;
        } catch (error) {
            if ((error as any).code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }));
}

/**
 * 获取文件访问 URL
 */
export async function getFileUrl(bucketName: string, objectName: string): Promise<string> {
    return `http://${PUBLIC_CONFIG.endpoint}:${PUBLIC_CONFIG.port}/${bucketName}/${objectName}`;
}

/**
 * 获取文件的预签名URL
 */
export async function getPresignedUrl({
    bucketName,
    objectName,
    expirySeconds = 3600,
    download = false
}: PresignedUrlParams): Promise<string> {
    return executeWithRetry(async (client) => {
        try {
            // 获取文件元数据以确定正确的 Content-Type
            const stat = await client.statObject(bucketName, objectName);

            // 获取文件扩展名
            const extension = objectName.split('.').pop()?.toLowerCase();

            // 为不同类型的文件设置正确的 Content-Type
            let contentType = stat.metaData?.['content-type'] || 'application/octet-stream';
            if (extension === 'md' || extension === 'markdown') {
                contentType = 'text/markdown; charset=utf-8';
            } else if (extension === 'txt') {
                contentType = 'text/plain; charset=utf-8';
            } else if (extension === 'xlsx') {
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (extension === 'docx') {
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            } else if (extension === 'pdf') {
                contentType = 'application/pdf';
            }

            // 设置响应头
            const reqParams: Record<string, string> = {
                'response-content-type': contentType,
                'response-content-disposition': `inline; filename="${encodeURIComponent(objectName.split('/').pop() || '')}"`
            };

            // 生成预签名URL
            const url = await client.presignedGetObject(bucketName, objectName, expirySeconds, reqParams);
            console.log('生成的预签名URL:', url);
            return url;
        } catch (error) {
            console.error('获取预签名URL失败:', error);
            throw error;
        }
    });
}

/**
 * 生成可读的 MinIO URL
 * @param bucketName 存储桶名称
 * @param objectName 对象名称
 * @param expiresInSeconds URL 有效期（秒），默认 7 天
 * @returns 可读的 URL
 */
export async function getReadableUrl(
    bucketName: string,
    objectName: string,
    expiresInSeconds: number = 7 * 24 * 60 * 60 // 默认 7 天
): Promise<string> {
    try {
        // 检查文件是否存在
        const exists = await fileExists(bucketName, objectName);
        if (!exists) {
            throw new Error(`文件不存在: ${bucketName}/${objectName}`);
        }

        // 生成预签名 URL
        const url = await executeWithRetry(async (client) => {
            return client.presignedGetObject(
                bucketName,
                objectName,
                expiresInSeconds
            );
        });

        return url;
    } catch (error) {
        console.error('生成可读 URL 失败', {
            bucketName,
            objectName,
            error: error instanceof Error ? error.message : '未知错误'
        });
        throw error;
    }
} 