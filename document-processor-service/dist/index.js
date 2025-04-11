"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const koa_bodyparser_1 = __importDefault(require("koa-bodyparser"));
const multer_1 = __importDefault(require("@koa/multer"));
const document_routes_1 = __importDefault(require("./routes/document-routes"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./utils/logger"));
// Create Koa application
const app = new koa_1.default();
// Configure file upload
const upload = (0, multer_1.default)({
    dest: config_1.default.storage.path,
    limits: {
        fileSize: 10 * 1024 * 1024 // Limit file size to 10MB
    }
});
// Middleware
app.use((0, koa_bodyparser_1.default)());
app.use(upload.single('file'));
// Error handling middleware
app.use(async (ctx, next) => {
    try {
        await next();
    }
    catch (err) {
        const error = err;
        logger_1.default.error('Server error', { error });
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            error: error.message || 'Internal server error'
        };
        ctx.app.emit('error', error, ctx);
    }
});
// Routes
app.use(document_routes_1.default.routes());
app.use(document_routes_1.default.allowedMethods());
// Start server
const port = config_1.default.port;
app.listen(port, () => {
    logger_1.default.info(`Document processing service started, listening on port: ${port}`);
});
exports.default = app;
