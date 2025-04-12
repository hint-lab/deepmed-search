import { getMinioClient } from './client';

export * from './types';
export * from './config';
export * from './operations';
export * from './client';

/**
 * 初始化 MinIO 存储
 */
export async function initMinio() {
    try {
        const client = await getMinioClient();
        const bucketName = 'uploadfiles';

        // 检查存储桶是否存在
        const exists = await client.bucketExists(bucketName);
        if (!exists) {
            // 创建存储桶
            await client.makeBucket(bucketName);
            console.log('创建存储桶:', bucketName);
        }

        // 设置存储桶策略为公共读取
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: [
                        's3:GetObject',
                        's3:GetObjectVersion',
                        's3:ListBucket'
                    ],
                    Resource: [
                        `arn:aws:s3:::${bucketName}/*`,
                        `arn:aws:s3:::${bucketName}`
                    ]
                }
            ]
        };

        await client.setBucketPolicy(bucketName, JSON.stringify(policy));
        console.log('设置存储桶策略成功');

        return { success: true };
    } catch (error) {
        console.error('初始化 MinIO 失败:', error);
        return { success: false, error: (error as Error).message };
    }
} 