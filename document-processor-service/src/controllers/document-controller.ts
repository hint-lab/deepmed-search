import { v4 as uuidv4 } from 'uuid';
import * as documentProcessor from '../services/document-processor';
import logger from '../utils/logger';
import fs from 'fs/promises';
import { AppContext, UploadRequestBody, UploadedFile } from '../types';
import path from 'path';
import config from '../config';

/**
 * Upload and process document
 */
export async function uploadDocument(ctx: AppContext) {
    try {
        const { documentId = uuidv4() } = ctx.request.body as UploadRequestBody;
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
            data: await fs.readFile(file.path),
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
        } else {
            ctx.status = 500;
            ctx.body = {
                success: false,
                documentId,
                error: result.error || 'Document processing failed'
            };
        }
    } catch (error) {
        logger.error('Document upload processing failed', { error });

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
export async function getDocumentStatus(ctx: AppContext) {
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
    } catch (error) {
        logger.error('Failed to get document status', { error, documentId: ctx.params.documentId });

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
export async function getDocumentContent(ctx: AppContext) {
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
        } else {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'Document does not exist or processing is not complete'
            };
        }
    } catch (error) {
        logger.error('Failed to get document content', { error, documentId: ctx.params.documentId });

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
export async function getDocumentChunks(ctx: AppContext) {
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
        } else {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: 'Document chunks do not exist or processing is not complete'
            };
        }
    } catch (error) {
        logger.error('Failed to get document chunks', { error, documentId: ctx.params.documentId });

        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get document chunks'
        };
    }
}

/**
 * Convert document to different format
 */
export async function convertDocument(ctx: AppContext) {
    try {
        const { documentId } = ctx.params;
        const { format } = ctx.request.query;

        if (!format || typeof format !== 'string') {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: 'Output format is required'
            };
            return;
        }

        // Validate format
        const outputFormat = format.toLowerCase() as documentProcessor.OutputFormat;
        if (!['pdf', 'docx', 'txt', 'md', 'html', 'epub'].includes(outputFormat)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: `Unsupported output format: ${format}`
            };
            return;
        }

        // Find original file
        const originalFiles = await documentProcessor.findOriginalFiles(documentId);
        if (originalFiles.length === 0) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                error: `Document not found: ${documentId}`
            };
            return;
        }

        const originalFilePath = originalFiles[0];
        const fileType = documentProcessor.getFileType(originalFilePath);

        // Check if conversion is supported
        if (!documentProcessor.isConversionSupported(fileType, outputFormat)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                error: `Conversion from ${fileType} to ${outputFormat} is not supported`
            };
            return;
        }

        // Check if already converted
        const convertedPath = await documentProcessor.getConvertedDocumentPath(documentId, outputFormat);
        if (convertedPath) {
            // Return existing converted file
            ctx.set('Content-Type', getContentType(outputFormat));
            ctx.set('Content-Disposition', `attachment; filename=${documentId}.${outputFormat}`);
            ctx.body = await fs.readFile(convertedPath);
            return;
        }

        // Convert document
        const result = await documentProcessor.convertDocument(originalFilePath, outputFormat);

        if (result.success) {
            // Return converted file
            const outputPath = path.join(config.storage.path, 'converted', `${documentId}.${outputFormat}`);
            ctx.set('Content-Type', getContentType(outputFormat));
            ctx.set('Content-Disposition', `attachment; filename=${documentId}.${outputFormat}`);
            ctx.body = await fs.readFile(outputPath);
        } else {
            ctx.status = 500;
            ctx.body = {
                success: false,
                error: result.error || 'Document conversion failed'
            };
        }
    } catch (error) {
        logger.error('Document conversion failed', { error, documentId: ctx.params.documentId });

        ctx.status = 500;
        ctx.body = {
            success: false,
            error: error instanceof Error ? error.message : 'Document conversion failed'
        };
    }
}

/**
 * Get content type for file format
 */
function getContentType(format: string): string {
    switch (format) {
        case 'pdf':
            return 'application/pdf';
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'txt':
            return 'text/plain';
        case 'md':
            return 'text/markdown';
        case 'html':
            return 'text/html';
        case 'epub':
            return 'application/epub+zip';
        default:
            return 'application/octet-stream';
    }
}