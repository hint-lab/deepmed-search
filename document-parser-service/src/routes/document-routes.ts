import Router from 'koa-router';
import * as documentController from '../controllers/document-controller';
import { AppContext } from '../types';

const router = new Router<{}, AppContext>({ prefix: '/api/documents' });

// 上传文档并开始处理
router.post('/upload', documentController.uploadDocument);

// 获取文档处理状态
router.get('/:documentId/status', documentController.getDocumentStatus);

// 获取处理后的文档内容
router.get('/:documentId/content', documentController.getDocumentContent);

// 获取文档分块
router.get('/:documentId/chunks', documentController.getDocumentChunks);

// 转换文档格式
router.get('/:documentId/convert', documentController.convertDocument);

export default router; 