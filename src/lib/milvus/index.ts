export * from './types';
export * from './config';
export * from './operations';

// 初始化函数
export async function initMilvus() {
    try {
        console.log('  🔍 初始化Milvus向量数据库...');

        // 检查连接
        const { checkMilvusConnection } = await import('./operations');
        const isConnected = await checkMilvusConnection();

        if (!isConnected) {
            throw new Error('无法连接到Milvus服务器');
        }

        // 创建默认集合
        const defaultCollection = 'documents';
        const { ensureCollection } = await import('./operations');
        await ensureCollection(defaultCollection);

        console.log('  ✅ Milvus 初始化完成');
    } catch (error) {
        console.error('  ❌ Milvus 初始化失败:', error);
        throw error;
    }
} 