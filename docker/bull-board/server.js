const express = require('express');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const { Queue } = require('bullmq');

const app = express();

// Redis 连接配置
function getRedisConnection() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null
    };
  }
  
  return {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null
  };
}

const connection = getRedisConnection();

// 创建队列实例（与项目中的队列名称保持一致）
const queues = [
  new Queue('document-to-markdown', { connection }),
  new Queue('chunk-vector-index', { connection }),
  new Queue('deep-research', { connection }),
];

// 创建 Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: queues.map(queue => new BullMQAdapter(queue)),
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 根路径重定向到 Bull Board
app.get('/', (req, res) => {
  res.redirect('/admin/queues');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BullMQ Board running on http://0.0.0.0:${PORT}/admin/queues`);
  console.log(`Redis connection: ${connection.host}:${connection.port}`);
});

