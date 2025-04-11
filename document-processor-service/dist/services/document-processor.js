"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileType = getFileType;
exports.saveUploadedFile = saveUploadedFile;
exports.processPdfFile = processPdfFile;
exports.processWordFile = processWordFile;
exports.processTextFile = processTextFile;
exports.processDocumentToMarkdown = processDocumentToMarkdown;
exports.chunkDocument = chunkDocument;
exports.saveProcessedDocument = saveProcessedDocument;
exports.saveDocumentChunks = saveDocumentChunks;
exports.findOriginalFiles = findOriginalFiles;
exports.findProcessedFile = findProcessedFile;
exports.getProcessedDocumentContent = getProcessedDocumentContent;
exports.findDocumentChunks = findDocumentChunks;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Get file type
 */
function getFileType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    switch (ext) {
        case '.pdf':
            return 'pdf';
        case '.docx':
            return 'docx';
        case '.doc':
            return 'doc';
        case '.txt':
            return 'txt';
        case '.md':
            return 'md';
        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }
}
/**
 * Save uploaded file
 */
async function saveUploadedFile(file, documentId) {
    const ext = path_1.default.extname(file.name);
    const fileName = `${documentId}${ext}`;
    const filePath = path_1.default.join(config_1.default.storage.path, fileName);
    await fs_extra_1.default.writeFile(filePath, file.data);
    logger_1.default.info(`File saved: ${filePath}`);
    return filePath;
}
/**
 * Process PDF file
 */
async function processPdfFile(filePath) {
    const startTime = Date.now();
    const documentId = (0, uuid_1.v4)();
    try {
        const dataBuffer = await fs_extra_1.default.readFile(filePath);
        const data = await (0, pdf_parse_1.default)(dataBuffer);
        const result = {
            success: true,
            documentId,
            content: data.text,
            metadata: {
                pageCount: data.numpages,
                wordCount: data.text.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };
        logger_1.default.info(`PDF processing completed: ${documentId}`, {
            pageCount: data.numpages,
            processingTime: result.metadata.processingTime
        });
        return result;
    }
    catch (error) {
        logger_1.default.error(`PDF processing failed: ${filePath}`, { error });
        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'PDF processing failed',
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
}
/**
 * Process Word file
 */
async function processWordFile(filePath) {
    const startTime = Date.now();
    const documentId = (0, uuid_1.v4)();
    try {
        const result = await mammoth_1.default.extractRawText({ path: filePath });
        const text = result.value;
        const processResult = {
            success: true,
            documentId,
            content: text,
            metadata: {
                wordCount: text.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };
        logger_1.default.info(`Word document processing completed: ${documentId}`, {
            wordCount: processResult.metadata.wordCount,
            processingTime: processResult.metadata.processingTime
        });
        return processResult;
    }
    catch (error) {
        logger_1.default.error(`Word document processing failed: ${filePath}`, { error });
        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'Word document processing failed',
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
}
/**
 * Process text file
 */
async function processTextFile(filePath) {
    const startTime = Date.now();
    const documentId = (0, uuid_1.v4)();
    try {
        const content = await fs_extra_1.default.readFile(filePath, 'utf8');
        const result = {
            success: true,
            documentId,
            content,
            metadata: {
                wordCount: content.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };
        logger_1.default.info(`Text file processing completed: ${documentId}`, {
            wordCount: result.metadata.wordCount,
            processingTime: result.metadata.processingTime
        });
        return result;
    }
    catch (error) {
        logger_1.default.error(`Text file processing failed: ${filePath}`, { error });
        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'Text file processing failed',
            metadata: {
                processingTime: Date.now() - startTime
            }
        };
    }
}
/**
 * Process document and convert to Markdown
 */
async function processDocumentToMarkdown(filePath) {
    const fileType = getFileType(filePath);
    switch (fileType) {
        case 'pdf':
            return processPdfFile(filePath);
        case 'docx':
        case 'doc':
            return processWordFile(filePath);
        case 'txt':
        case 'md':
            return processTextFile(filePath);
        default:
            throw new Error(`Unsupported file type: ${fileType}`);
    }
}
/**
 * Split document into chunks
 */
function chunkDocument(content, maxChunkSize = 1000) {
    const chunks = [];
    const sentences = content.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let currentSize = 0;
    for (const sentence of sentences) {
        const sentenceSize = sentence.length;
        if (currentSize + sentenceSize > maxChunkSize && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
            currentSize = 0;
        }
        currentChunk += sentence + ' ';
        currentSize += sentenceSize + 1;
    }
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}
/**
 * Save processed document
 */
async function saveProcessedDocument(documentId, content) {
    const filePath = path_1.default.join(config_1.default.storage.path, `${documentId}.md`);
    await fs_extra_1.default.writeFile(filePath, content);
    logger_1.default.info(`Processed document saved: ${filePath}`);
    return filePath;
}
/**
 * Save document chunks
 */
async function saveDocumentChunks(documentId, chunks) {
    const chunksDir = path_1.default.join(config_1.default.storage.path, documentId, 'chunks');
    await fs_extra_1.default.ensureDir(chunksDir);
    for (let i = 0; i < chunks.length; i++) {
        const chunk = {
            id: (0, uuid_1.v4)(),
            content: chunks[i],
            index: i
        };
        const filePath = path_1.default.join(chunksDir, `${chunk.id}.json`);
        await fs_extra_1.default.writeJson(filePath, chunk);
    }
    logger_1.default.info(`Document chunks saved: ${documentId}`, { chunkCount: chunks.length });
}
/**
 * Find original files
 */
async function findOriginalFiles(documentId) {
    const files = await fs_extra_1.default.readdir(config_1.default.storage.path);
    return files.filter(file => file.startsWith(documentId) && !file.endsWith('.md'));
}
/**
 * Find processed file
 */
async function findProcessedFile(documentId) {
    const filePath = path_1.default.join(config_1.default.storage.path, `${documentId}.md`);
    return await fs_extra_1.default.pathExists(filePath) ? filePath : null;
}
/**
 * Get processed document content
 */
async function getProcessedDocumentContent(documentId) {
    const filePath = await findProcessedFile(documentId);
    if (!filePath)
        return null;
    return await fs_extra_1.default.readFile(filePath, 'utf8');
}
/**
 * Find document chunks
 */
async function findDocumentChunks(documentId) {
    const chunksDir = path_1.default.join(config_1.default.storage.path, documentId, 'chunks');
    if (!await fs_extra_1.default.pathExists(chunksDir))
        return [];
    const files = await fs_extra_1.default.readdir(chunksDir);
    const chunks = [];
    for (const file of files) {
        if (file.endsWith('.json')) {
            const chunk = await fs_extra_1.default.readJson(path_1.default.join(chunksDir, file));
            chunks.push(chunk);
        }
    }
    return chunks.sort((a, b) => a.index - b.index);
}
