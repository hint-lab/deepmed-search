import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import multer from '@koa/multer';
import documentRoutes from './routes/document-routes';
import config from './config';
import logger from './utils/logger';
import { AppContext } from './types';

// Create Koa application
const app = new Koa<{}, AppContext>();

// Configure file upload
const upload = multer({
    dest: config.storage.path,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
    }
});

// Middleware
app.use(bodyParser());
app.use(upload.single('file'));

// Error handling middleware
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const error = err as Error & { status?: number };
        logger.error('Server error', { error });
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message || 'Internal server error'
        };
        ctx.app.emit('error', error, ctx);
    }
});

// Routes
app.use(documentRoutes.routes());
app.use(documentRoutes.allowedMethods());

// Start server
const port = config.port;
app.listen(port, () => {
    logger.info(`Document processing service started, listening on port: ${port}`);
});

export default app;