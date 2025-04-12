export * from './types';
export * from './config';
export * from './operations';
export * from './client';

// 初始化函数
export async function initDocumentParser() {
    try {
        console.log('  📄 初始化文档处理系统...');

        // 首先检查文档处理服务是否可用
        const { isDocumentProcessorAvailable } = await import('./operations');
        const serviceAvailable = await isDocumentProcessorAvailable();

        if (!serviceAvailable) {
            console.warn('  ⚠️ 文档处理服务不可用，跳过初始化');
            return true; // 返回 true 以允许应用继续启动
        }

        console.log('  ✅ 文档处理系统初始化成功');
        return true;
    } catch (error) {
        console.error('  ❌ 文档处理系统初始化失败:', error);
        // 不抛出错误，允许应用继续启动
        return true;
    }
}

// 导出 createDocumentParser 函数，使用 client.ts 中的实现
export { createDocumentParserInstance as createDocumentParser } from './client';
