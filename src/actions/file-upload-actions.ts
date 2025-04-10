'use server';

import { Readable } from 'stream';
import { uploadFileStream, ensureBucketExists } from '@/lib/minio';
import { nanoid } from 'nanoid';

/**
 * 上传文件到MinIO的Server Action
 */
export async function uploadFileToMinio(formData: FormData) {
    const file = formData.get('file') as File;

    if (!file) {
        return {
            success: false,
            error: '没有找到文件'
        };
    }

    try {
        // 确保存储桶存在
        const bucketName = process.env.MINIO_BUCKET_NAME || 'deepmed';
        await ensureBucketExists(bucketName);

        // 生成唯一文件名
        const fileExtension = file.name.split('.').pop() || '';
        const objectName = `uploads/${nanoid()}.${fileExtension}`;

        // 将File对象转换为Readable流
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        // 准备元数据
        const metaData = {
            'Content-Type': file.type,
            'X-Original-Filename': encodeURIComponent(file.name),
            'X-Upload-Date': new Date().toISOString(),
        };

        // 上传文件
        await uploadFileStream(bucketName, objectName, stream, buffer.length, metaData);

        // 不再调用客户端函数生成URL
        // 而是返回URL构建所需的信息，让客户端自己构建
        const minioEndpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'localhost';
        const minioPort = process.env.NEXT_PUBLIC_MINIO_PORT || '9000';

        return {
            success: true,
            filename: file.name,
            size: file.size,
            type: file.type,
            // 返回构建URL所需的所有信息
            objectName,
            bucketName,
            minioEndpoint,
            minioPort,
            // 同时也返回构建好的URL字符串，但不使用客户端函数
            fileUrl: `http://${minioEndpoint}:${minioPort}/${bucketName}/${objectName}`,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('文件上传失败:', error);
        return {
            success: false,
            error: '文件上传失败',
            details: (error as Error).message
        };
    }
} 