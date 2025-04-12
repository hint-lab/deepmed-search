import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { config } from 'dotenv';
import { createQueue, createWorker, processTask } from './queue';

// 加载环境变量
config();

const app = new Koa();
const router = new Router();

// 中间件
app.use(cors({
    origin: '*',  // 允许所有来源
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
    maxAge: 5  // 预检请求结果缓存5秒
}));

app.use(bodyParser());

// 创建队列实例
const taskQueue = createQueue('tasks');

// 创建Worker实例
const worker = createWorker('tasks', processTask);

// 路由
router.post('/tasks', async (ctx: Koa.Context) => {
    try {
        const task = ctx.request.body;
        const job = await taskQueue.add('task', task);

        ctx.body = {
            success: true,
            jobId: job.id
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
});

router.get('/tasks/:jobId', async (ctx: Koa.Context) => {
    try {
        const job = await taskQueue.getJob(ctx.params.jobId);
        if (!job) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: '任务不存在'
            };
            return;
        }

        const state = await job.getState();
        const result = job.returnvalue;

        ctx.body = {
            success: true,
            jobId: job.id,
            state,
            result
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
});

// 健康检查端点
router.get('/health', async (ctx: Koa.Context) => {
    try {
        // 获取队列状态
        const jobCounts = await taskQueue.getJobCounts('waiting', 'active', 'completed', 'failed');

        // 返回健康状态
        ctx.body = {
            status: 'healthy',
            queues: {
                'pdf-processing': { status: 'healthy', details: jobCounts },
                'document-convert': { status: 'healthy', details: jobCounts },
                'document-index': { status: 'healthy', details: jobCounts },
                'system-task': { status: 'healthy', details: jobCounts }
            },
            redis: {
                status: 'connected',
                details: `Redis连接: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            status: 'error',
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
});

// 注册路由
app.use(router.routes()).use(router.allowedMethods());

// 错误处理
app.on('error', (err: Error, ctx: Koa.Context) => {
    console.error('服务器错误:', err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`队列服务已启动，监听端口 ${port}`);
}); 