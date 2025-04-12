'use server';

import { getMinioServerStatus, MinioServerStatus, getPresignedUrl, getMinioClient } from '@/lib/minio';
import { ServerActionResponse } from '@/types/actions';

/**
 * 获取 MinIO 服务器状态
 * @returns Promise<ServerActionResponse<MinioServerStatus>> 服务器状态
 */
export async function getMinioStatusAction(): Promise<ServerActionResponse<MinioServerStatus>> {
    try {
        const status = await getMinioServerStatus();
        return {
            success: true,
            data: status
        };
    } catch (error) {
        console.error('获取 MinIO 状态失败:', error);
        return {
            success: false,
            error: '获取 MinIO 状态失败',
            details: (error as Error).message
        };
    }
}

/**
 * 删除存储桶
 * @param bucketName 存储桶名称
 * @returns Promise<ServerActionResponse<void>>
 */
export async function removeBucketAction(bucketName: string): Promise<ServerActionResponse<void>> {
    try {
        const client = await getMinioClient();

        // 先删除存储桶中的所有对象
        const objectsList = await client.listObjects(bucketName);
        for await (const obj of objectsList) {
            await client.removeObject(bucketName, obj.name);
        }

        // 删除存储桶
        await client.removeBucket(bucketName);

        return {
            success: true
        };
    } catch (error) {
        console.error(`删除存储桶 ${bucketName} 失败:`, error);
        return {
            success: false,
            error: `删除存储桶 ${bucketName} 失败`,
            details: (error as Error).message
        };
    }
}

/**
 * 获取文件访问URL的Server Action
 */
export async function getFileUrlAction(bucketName: string, objectName: string): Promise<ServerActionResponse<string>> {
    try {
        const url = await getPresignedUrl({
            bucketName,
            objectName,
            download: true
        });
        return { success: true, data: url };
    } catch (error) {
        console.error('获取文件URL失败:', error);
        return { success: false, error: '获取文件URL失败' };
    }
} 