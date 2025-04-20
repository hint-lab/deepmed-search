import IORedis, { Redis, RedisOptions } from 'ioredis';
import logger from '@/utils/logger';
// 从环境变量或默认值获取 Redis 连接信息
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD;

logger.info(`初始化 Redis 客户端，连接至: ${redisHost}:${redisPort}`);

// 定义 Redis 连接选项
const connectionOptions: RedisOptions = {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null, // 推荐用于 BullMQ 兼容性
    enableReadyCheck: true,     // 启用就绪检查
    // 如果需要 TLS，请添加 TLS 选项，例如:
    // tls: process.env.REDIS_TLS_ENABLED === 'true' ? {} : undefined,
};

// 单例 Redis 客户端实例 (用于常规操作)
let redisClient: Redis | null = null;

/**
 * 获取共享的 Redis 客户端单例。
 * 如果实例不存在，则创建它。
 * @returns Redis 客户端实例
 * @throws 如果无法初始化 Redis 客户端，则抛出错误
 */
export function getRedisClient(): Redis {
    if (!redisClient) {
        try {
            redisClient = new IORedis(connectionOptions);

            redisClient.on('connect', () => logger.info('Redis 客户端已连接。'));
            redisClient.on('ready', () => logger.info('Redis 客户端已准备就绪。'));
            redisClient.on('error', (err: any) => logger.error('Redis 客户端错误:', err));
            redisClient.on('close', () => logger.info('Redis 客户端连接已关闭。'));
            redisClient.on('reconnecting', () => logger.info('Redis 客户端正在重新连接...'));
            redisClient.on('end', () => logger.info('Redis 客户端连接已结束。'));

        } catch (error) {
            logger.error("创建 Redis 客户端失败:", error);
            // 根据错误处理策略，您可能希望在此处退出或抛出更具体的错误
            throw new Error("无法初始化 Redis 客户端。");
        }
    }
    return redisClient;
}

/**
 * 创建一个新的独立的 Redis 客户端实例。
 * 主要用于需要专用连接的场景，例如 Pub/Sub 订阅者。
 * @returns 新的 Redis 客户端实例
 * @throws 如果无法创建新的 Redis 客户端实例，则抛出错误
 */
export function createNewRedisClient(): Redis {
    try {
        logger.info(`[createNewRedisClient] Attempting connection with options:`, connectionOptions); // Log options
        const client = new IORedis(connectionOptions);
        // 添加更多日志
        client.on('connect', () => logger.info('[createNewRedisClient] New client connected.'));
        client.on('ready', () => logger.info('[createNewRedisClient] New client ready.'));
        client.on('error', (err: any) => logger.error('[createNewRedisClient] New client error:', err));
        client.on('close', () => logger.info('[createNewRedisClient] New client closed.'));
        client.on('reconnecting', () => logger.info('[createNewRedisClient] New client reconnecting...'));
        return client;
    } catch (error) {
        logger.error("创建新的 Redis 客户端实例失败:", error);
        throw new Error("无法创建新的 Redis 客户端实例。");
    }
}

// 可选：优雅关机处理示例
// process.on('SIGTERM', () => {
//     logger.info('收到 SIGTERM 信号：正在关闭 Redis 客户端连接。');
//     redisClient?.quit();
// });
// process.on('SIGINT', () => {
//     logger.info('收到 SIGINT 信号：正在关闭 Redis 客户端连接。');
//     redisClient?.quit();
// }); 