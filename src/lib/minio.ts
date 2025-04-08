import { Client } from 'minio';
import { Readable } from 'stream';

// 创建 MinIO 客户端
export const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'deepmed-minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// 确保存储桶存在
export async function ensureBucketExists(bucketName: string) {
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

// 获取文件访问 URL
export function getFileUrl(bucketName: string, objectName: string): string {
    return `http://${process.env.MINIO_ENDPOINT || 'deepmed-minio'}:${process.env.MINIO_PORT || '9000'}/${bucketName}/${objectName}`;
}

// 上传文件流
export async function uploadFileStream(
    bucketName: string,
    objectName: string,
    stream: Readable,
    size: number,
    metaData?: Record<string, string>
): Promise<void> {
    try {
        await minioClient.putObject(
            bucketName,
            objectName,
            stream,
            size,
            metaData
        );
    } catch (error) {
        console.error(`上传文件流失败: ${objectName}`, error);
        throw error;
    }
}

// 获取文件元数据
export async function getFileMetadata(bucketName: string, objectName: string): Promise<Record<string, string>> {
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
    try {
        await minioClient.removeObject(bucketName, objectName);
    } catch (error) {
        console.error(`删除文件失败: ${objectName}`, error);
        throw error;
    }
}

// 获取文件流
export async function getFileStream(bucketName: string, objectName: string): Promise<Readable> {
    try {
        return await minioClient.getObject(bucketName, objectName);
    } catch (error) {
        console.error(`获取文件流失败: ${objectName}`, error);
        throw error;
    }
}

// 检查文件是否存在
export async function fileExists(bucketName: string, objectName: string): Promise<boolean> {
    try {
        await minioClient.statObject(bucketName, objectName);
        return true;
    } catch (error) {
        if ((error as any).code === 'NotFound') {
            return false;
        }
        throw error;
    }
} 