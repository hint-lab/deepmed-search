// 服务器端初始化文件
// 这个文件用于初始化所有服务器端服务

import { initMinio } from './minio';
import  logger  from '@/utils/logger';
// 状态变量，确保只初始化一次
let serverInitialized = false;

/**
 * 初始化服务器端服务
 * 这个函数会在服务器启动时自动调用，只会执行一次
 */
export async function initializeServer() {
    // 确保只在服务器端执行
    if (typeof window !== 'undefined' || serverInitialized) {
        return;
    }

    try {
        logger.info('🚀 初始化服务器端服务...');


        // 初始化MinIO客户端
        await initMinio();


        // 标记初始化完成
        serverInitialized = true;
        logger.info('✅ 服务器初始化完成');
    } catch (error) {
        logger.error('❌ 服务器初始化失败:', error);
        // 不抛出错误，让应用继续运行
    }
} 