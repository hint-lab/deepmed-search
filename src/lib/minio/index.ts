import { getMinioClient } from './client';
import logger from '@/utils/logger';
export * from './types';
export * from './config';
export * from './operations';
export * from './client';

// 使用 globalThis 存储 MinIO 初始化状态
declare global {
    var __deepmed_minio_initialized: Set<string> | undefined;
}

/**
 * 初始化 MinIO 存储
 * 这个函数会检查存储桶是否存在，如果不存在则创建，并设置存储桶策略
 * 使用 globalThis 缓存已初始化的存储桶，避免重复操作
 */
export async function initMinio() {
    try {
        // 在构建时跳过 MinIO 初始化
        // 检测方法：
        // 1. NEXT_PHASE 为 phase-production-build 时是构建阶段
        // 2. 或者没有配置 MINIO_ENDPOINT/MINIO_ACCESS_KEY 时（构建时通常没有这些变量）
        const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';
        const hasMinioConfig = process.env.MINIO_ENDPOINT || process.env.MINIO_ACCESS_KEY;

        if (isBuilding || !hasMinioConfig) {
            logger.info('⏭️  构建阶段或无 MinIO 配置，跳过初始化');
            return { success: true };
        }

        const client = await getMinioClient();
        const bucketName = process.env.MINIO_BUCKET_NAME || 'deepmed';

        // 初始化全局缓存集合
        if (!globalThis.__deepmed_minio_initialized) {
            globalThis.__deepmed_minio_initialized = new Set();
        }

        // 如果已经初始化过这个存储桶，直接返回
        if (globalThis.__deepmed_minio_initialized.has(bucketName)) {
            return { success: true };
        }

        // 检查存储桶是否存在
        const exists = await client.bucketExists(bucketName);
        if (!exists) {
            // 创建存储桶
            await client.makeBucket(bucketName);
            logger.info(`创建存储桶: ${bucketName}`);
        }

        // 检查并设置存储桶策略为公共读取
        // 先尝试获取当前策略，如果已存在且正确，则跳过设置
        let needSetPolicy = true;
        try {
            const currentPolicy = await client.getBucketPolicy(bucketName);
            if (currentPolicy) {
                // 简单检查策略是否包含我们需要的权限
                const policyObj = JSON.parse(currentPolicy);
                const hasPublicRead = policyObj.Statement?.some((stmt: any) =>
                    stmt.Effect === 'Allow' &&
                    stmt.Principal?.AWS?.includes('*') &&
                    stmt.Action?.some((action: string) => action.includes('GetObject'))
                );
                if (hasPublicRead) {
                    needSetPolicy = false;
                }
            }
        } catch (error) {
            // 如果获取策略失败（可能是策略不存在），继续设置策略
            needSetPolicy = true;
        }

        if (needSetPolicy) {
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
            logger.info('✅ 设置存储桶策略成功');
        }

        // 标记存储桶已初始化
        globalThis.__deepmed_minio_initialized.add(bucketName);

        return { success: true };
    } catch (error) {
        logger.error('初始化 MinIO 失败:', error);
        return { success: false, error: (error as Error).message };
    }
} 