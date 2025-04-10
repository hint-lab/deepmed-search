"use server"

import { Client } from 'minio';
import { Readable } from 'stream';

// 创建 MinIO 客户端实例
function createMinioClient() {
    return new Client({
        endPoint: 'localhost',
        port: parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: false,
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });
}

// 确保存储桶存在
export async function ensureBucketExists(bucketName: string) {
    const minioClient = createMinioClient();
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName);
            // 设置存储桶策略为只读
            await minioClient.setBucketPolicy(bucketName, JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Sid: 'PublicRead',
                        Effect: 'Allow',
                        Principal: '*',
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }
                ]
            }));
            console.log(`存储桶 ${bucketName} 创建成功并设置为只读`);
        }
    } catch (error) {
        console.error('检查或创建存储桶失败:', error);
        throw error;
    }
}

// 初始化默认存储桶
export async function initMinio() {
    try {
        const bucketName = process.env.MINIO_BUCKET_NAME || 'documents';
        await ensureBucketExists(bucketName);
        console.log('MinIO 初始化完成');
    } catch (error) {
        console.error('MinIO 初始化失败:', error);
        throw error;
    }
}

// 上传文件流
export async function uploadFileStream(
    bucketName: string,
    objectName: string,
    stream: Readable,
    size: number,
    metaData?: Record<string, string>
): Promise<void> {
    const minioClient = createMinioClient();
    try {
        // 清理元数据中的无效字符
        const sanitizedMetaData: Record<string, string> = {};
        if (metaData) {
            for (const [key, value] of Object.entries(metaData)) {
                // 只保留可打印的 ASCII 字符
                sanitizedMetaData[key] = value.replace(/[^\x20-\x7E]/g, '');
            }
        }

        await minioClient.putObject(
            bucketName,
            objectName,
            stream,
            size,
            sanitizedMetaData
        );
    } catch (error) {
        console.error(`上传文件流失败: ${objectName}`, error);
        throw error;
    }
}

// 获取文件元数据
export async function getFileMetadata(bucketName: string, objectName: string): Promise<Record<string, string>> {
    const minioClient = createMinioClient();
    try {
        const stat = await minioClient.statObject(bucketName, objectName);
        return stat.metaData || {};
    } catch (error) {
        console.error(`获取文件元数据失败: ${objectName}`, error);
        throw error;
    }
}

// 删除文件
export async function deleteFile(bucketName: string, objectName: string): Promise<void> {
    const minioClient = createMinioClient();
    try {
        await minioClient.removeObject(bucketName, objectName);
    } catch (error) {
        console.error(`删除文件失败: ${objectName}`, error);
        throw error;
    }
}

// 获取文件流
export async function getFileStream(bucketName: string, objectName: string): Promise<Readable> {
    const minioClient = createMinioClient();
    try {
        console.log('正在从 MinIO 获取文件:', {
            bucketName,
            objectName
        });

        // 首先检查文件是否存在
        const exists = await fileExists(bucketName, objectName);
        if (!exists) {
            throw new Error(`文件不存在: ${bucketName}/${objectName}`);
        }

        return await minioClient.getObject(bucketName, objectName);
    } catch (error) {
        console.error(`获取文件流失败:`, {
            bucketName,
            objectName,
            error: error instanceof Error ? error.message : error
        });
        throw error;
    }
}

// 检查文件是否存在
export async function fileExists(bucketName: string, objectName: string): Promise<boolean> {
    const minioClient = createMinioClient();
    try {
        console.log('检查文件是否存在:', {
            bucketName,
            objectName
        });
        await minioClient.statObject(bucketName, objectName);
        return true;
    } catch (error) {
        if ((error as any).code === 'NotFound') {
            return false;
        }
        throw error;
    }
} 