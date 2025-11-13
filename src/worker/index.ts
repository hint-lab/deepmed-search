import 'dotenv/config';

// 初始化所有需要的队列 worker。仅需导入即可触发 createWorker 中的副作用。
import '@/lib/bullmq/document-worker';
import '@/lib/bullmq/research-worker';
import '@/lib/bullmq/chunk-worker';

console.log('[Queue Worker] 所有队列 worker 已启动（Document Worker + Research Worker + Chunk Worker）。');

process.on('SIGTERM', () => {
    console.log('[Queue Worker] 收到 SIGTERM，准备退出。');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Queue Worker] 收到 SIGINT，准备退出。');
    process.exit(0);
});

