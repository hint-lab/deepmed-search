"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDocument = uploadDocument;
exports.getDocumentStatus = getDocumentStatus;
exports.getDocumentContent = getDocumentContent;
exports.getDocumentChunks = getDocumentChunks;
const uuid_1 = require("uuid");
const documentProcessor = __importStar(require("../services/document-processor"));
const logger_1 = __importDefault(require("../utils/logger"));
const promises_1 = __importDefault(require("fs/promises"));
/**
 * Upload and process document
 */
async function uploadDocument(ctx) {
    try {
        const { documentId = (0, uuid_1.v4)() } = ctx.request.body;
        const file = ctx.request.file;
        if (!file) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'No file provided'
            };
            return;
        }
        // Save uploaded file
        const filePath = await documentProcessor.saveUploadedFile({
            name: file.originalname,
            data: await promises_1.default.readFile(file.path),
            size: file.size,
            type: file.mimetype
        }, documentId);
        // Process document
        const result = await documentProcessor.processDocumentToMarkdown(filePath);
        if (result.success && result.content) {
            // Save processed document
            await documentProcessor.saveProcessedDocument(documentId, result.content);
            // Chunk processing
            const chunks = documentProcessor.chunkDocument(result.content);
            await documentProcessor.saveDocumentChunks(documentId, chunks);
            ctx.body = {
                success: true,
                documentId,
                metadata: result.metadata,
                chunkCount: chunks.length
            };
        }
        else {
            ctx.status = 500;
            ctx.body = {
                success: false,
                documentId,
                error: result.error || 'Document processing failed'
            };
        }
    }
    catch (error) {
        logger_1.default.error('Document upload processing failed', { error });
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Document upload processing failed'
        };
    }
}
/**
 * Get document processing status
 */
async function getDocumentStatus(ctx) {
    try {
        const { documentId } = ctx.params;
        // Check if original file exists
        const originalFiles = await documentProcessor.findOriginalFiles(documentId);
        // Check if processed file exists
        const processedFile = await documentProcessor.findProcessedFile(documentId);
        // Check if chunk files exist
        const chunks = await documentProcessor.findDocumentChunks(documentId);
        ctx.body = {
            success: true,
            documentId,
            status: {
                originalFile: originalFiles.length > 0,
                processedFile: !!processedFile,
                chunks: chunks.length > 0,
                chunkCount: chunks.length
            }
        };
    }
    catch (error) {
        logger_1.default.error('Failed to get document status', { error, documentId: ctx.params.documentId });
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get document status'
        };
    }
}
/**
 * Get processed document content
 */
async function getDocumentContent(ctx) {
    try {
        const { documentId } = ctx.params;
        // Get processed document content
        const content = await documentProcessor.getProcessedDocumentContent(documentId);
        if (content) {
            ctx.body = {
                success: true,
                documentId,
                content
            };
        }
        else {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'Document does not exist or processing is not complete'
            };
        }
    }
    catch (error) {
        logger_1.default.error('Failed to get document content', { error, documentId: ctx.params.documentId });
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get document content'
        };
    }
}
/**
 * Get document chunks
 */
async function getDocumentChunks(ctx) {
    try {
        const { documentId } = ctx.params;
        // Get document chunks
        const chunks = await documentProcessor.findDocumentChunks(documentId);
        if (chunks.length > 0) {
            ctx.body = {
                success: true,
                documentId,
                chunks: chunks.map(chunk => ({
                    id: chunk.id,
                    content: chunk.content,
                    index: chunk.index
                }))
            };
        }
        else {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'Document chunks do not exist or processing is not complete'
            };
        }
    }
    catch (error) {
        logger_1.default.error('Failed to get document chunks', { error, documentId: ctx.params.documentId });
        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get document chunks'
        };
    }
}
