import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { config } from 'dotenv';
import { createQueue, createWorker, processTask } from './queue';

// 加载环境变量
config();

const app = new Koa();
const router = new Router();

// 中间件
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