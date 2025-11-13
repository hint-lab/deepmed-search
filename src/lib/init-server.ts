// 服务器端初始化文件
// 这个文件用于初始化所有服务器端服务

import { initMinio } from './minio';
import logger from '@/utils/logger';

// 使用 globalThis 存储初始化状态，避免模块重载时丢失
declare global {
    var __deepmed_server_initialized: boolean | undefined;
}

/**
 * 初始化服务器端服务
 * 这个函数会在服务器启动时自动调用，只会执行一次
 */
export async function initializeServer() {
    // 确保只在服务器端执行
    if (typeof window !== 'undefined') {
        return;
    }

    // 检查是否已经初始化（使用 globalThis 确保跨模块重载时状态保持）
    if (globalThis.__deepmed_server_initialized) {
        return;
    }

    try {
        logger.info('🚀 初始化服务器端服务...');

        // 初始化MinIO客户端
        await initMinio();

        // 标记初始化完成（使用 globalThis）
        globalThis.__deepmed_server_initialized = true;
        logger.info('✅ 服务器初始化完成');
    } catch (error) {
        logger.error('❌ 服务器初始化失败:', error);
        // 不抛出错误，让应用继续运行
    }
} 