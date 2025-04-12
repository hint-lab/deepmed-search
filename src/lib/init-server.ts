// 服务器端初始化文件
// 这个文件用于初始化所有服务器端服务

import { initQueueSystem } from './queue';
import { initMinio } from './minio';

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
        console.log('🚀 初始化服务器端服务...');

        // 初始化队列系统
        await initQueueSystem();

        // 初始化MinIO
        await initMinio();

        // 标记初始化完成
        serverInitialized = true;
        console.log('✅ 服务器初始化完成');
    } catch (error) {
        console.error('❌ 服务器初始化失败:', error);
        // 不抛出错误，让应用继续运行
    }
} 