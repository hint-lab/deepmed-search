import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import config from '../config';
import logger from '../utils/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Document types
export type DocumentType = 'pdf' | 'docx' | 'doc' | 'txt' | 'md' | 'html' | 'epub';

// Output format types
export type OutputFormat = 'pdf' | 'docx' | 'txt' | 'md' | 'html' | 'epub';

// PDF parse result type
interface PdfParseResult {
    text: string;
    numpages: number;
    metadata: {
        processingTime?: number;
    };
}

// Document processing result
export interface ProcessResult {
    success: boolean;
    documentId: string;
    content?: string;
    error?: string;
    metadata: {
        pageCount?: number;
        wordCount?: number;
        processingTime?: number;
        originalFormat?: DocumentType;
        outputFormat?: OutputFormat;
    };
}

// Document chunk
export interface DocumentChunk {
    id: string;
    content: string;
    index: number;
}

// Uploaded file type
export interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    type: string;
}

/**
 * Get file type
 */
export function getFileType(filePath: string): DocumentType {
    const ext = path.extname(filePath).toLowerCase();

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
        case '.html':
            return 'html';
        case '.epub':
            return 'epub';
        default:
            throw new Error(`Unsupported file type: ${ext}`);
    }
}

/**
 * Save uploaded file
 */
export async function saveUploadedFile(file: UploadedFile, documentId: string): Promise<string> {
    const ext = path.extname(file.name);
    const fileName = `${documentId}${ext}`;
    const filePath = path.join(config.storage.path, fileName);

    await fs.writeFile(filePath, file.data);
    logger.info(`File saved: ${filePath}`);

    return filePath;
}

/**
 * Process PDF file
 */
export async function processPdfFile(filePath: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer) as PdfParseResult;

        const result: ProcessResult = {
            success: true,
            documentId,
            content: data.text,
            metadata: {
                pageCount: data.numpages,
                wordCount: data.text.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };

        logger.info(`PDF processing completed: ${documentId}`, {
            pageCount: data.numpages,
            processingTime: result.metadata.processingTime
        });

        return result;
    } catch (error) {
        logger.error(`PDF processing failed: ${filePath}`, { error });

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
export async function processWordFile(filePath: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;

        const processResult: ProcessResult = {
            success: true,
            documentId,
            content: text,
            metadata: {
                wordCount: text.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };

        logger.info(`Word document processing completed: ${documentId}`, {
            wordCount: processResult.metadata.wordCount,
            processingTime: processResult.metadata.processingTime
        });

        return processResult;
    } catch (error) {
        logger.error(`Word document processing failed: ${filePath}`, { error });

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
export async function processTextFile(filePath: string): Promise<ProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();

    try {
        const content = await fs.readFile(filePath, 'utf8');

        const result: ProcessResult = {
            success: true,
            documentId,
            content,
            metadata: {
                wordCount: content.split(/\s+/).length,
                processingTime: Date.now() - startTime
            }
        };

        logger.info(`Text file processing completed: ${documentId}`, {
            wordCount: result.metadata.wordCount,
            processingTime: result.metadata.processingTime
        });

        return result;
    } catch (error) {
        logger.error(`Text file processing failed: ${filePath}`, { error });

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
export async function processDocumentToMarkdown(filePath: string): Promise<ProcessResult> {
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
export function chunkDocument(content: string, maxChunkSize: number = 1000): string[] {
    const chunks: string[] = [];
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
export async function saveProcessedDocument(documentId: string, content: string): Promise<string> {
    const filePath = path.join(config.storage.path, `${documentId}.md`);
    await fs.writeFile(filePath, content);
    logger.info(`Processed document saved: ${filePath}`);
    return filePath;
}

/**
 * Save document chunks
 */
export async function saveDocumentChunks(documentId: string, chunks: string[]): Promise<void> {
    const chunksDir = path.join(config.storage.path, documentId, 'chunks');
    await fs.ensureDir(chunksDir);

    for (let i = 0; i < chunks.length; i++) {
        const chunk: DocumentChunk = {
            id: uuidv4(),
            content: chunks[i],
            index: i
        };

        const filePath = path.join(chunksDir, `${chunk.id}.json`);
        await fs.writeJson(filePath, chunk);
    }

    logger.info(`Document chunks saved: ${documentId}`, { chunkCount: chunks.length });
}

/**
 * Find original files
 */
export async function findOriginalFiles(documentId: string): Promise<string[]> {
    const files = await fs.readdir(config.storage.path);
    return files.filter(file => file.startsWith(documentId) && !file.endsWith('.md'));
}

/**
 * Find processed file
 */
export async function findProcessedFile(documentId: string): Promise<string | null> {
    const filePath = path.join(config.storage.path, `${documentId}.md`);
    return await fs.pathExists(filePath) ? filePath : null;
}

/**
 * Get processed document content
 */
export async function getProcessedDocumentContent(documentId: string): Promise<string | null> {
    const filePath = await findProcessedFile(documentId);
    if (!filePath) return null;
    return await fs.readFile(filePath, 'utf8');
}

/**
 * Find document chunks
 */
export async function findDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    const chunksDir = path.join(config.storage.path, documentId, 'chunks');
    if (!await fs.pathExists(chunksDir)) return [];

    const files = await fs.readdir(chunksDir);
    const chunks: DocumentChunk[] = [];

    for (const file of files) {
        if (file.endsWith('.json')) {
            const chunk = await fs.readJson(path.join(chunksDir, file));
            chunks.push(chunk);
        }
    }

    return chunks.sort((a, b) => a.index - b.index);
}

/**
 * Convert document to different format
 */
export async function convertDocument(filePath: string, outputFormat: OutputFormat): Promise<ProcessResult> {
    const startTime = Date.now();
    const documentId = uuidv4();
    const fileType = getFileType(filePath);
    const outputDir = path.join(config.storage.path, 'converted');

    // Ensure output directory exists
    await fs.ensureDir(outputDir);

    const outputFileName = `${documentId}.${outputFormat}`;
    const outputPath = path.join(outputDir, outputFileName);

    try {
        // Check if conversion is supported
        if (!isConversionSupported(fileType, outputFormat)) {
            throw new Error(`Conversion from ${fileType} to ${outputFormat} is not supported`);
        }

        // Perform conversion based on file type and output format
        if (fileType === 'pdf') {
            if (outputFormat === 'txt') {
                // PDF to TXT
                const dataBuffer = await fs.readFile(filePath);
                const data = await pdfParse(dataBuffer);
                await fs.writeFile(outputPath, data.text);
            } else if (outputFormat === 'html') {
                // PDF to HTML using pdf2htmlEX if available
                try {
                    await execAsync(`pdf2htmlEX ${filePath} ${outputPath}`);
                } catch (error) {
                    logger.warn('pdf2htmlEX not available, falling back to basic conversion', { error });
                    // Fallback to basic conversion
                    const dataBuffer = await fs.readFile(filePath);
                    const data = await pdfParse(dataBuffer);
                    const htmlContent = `<html><body><pre>${data.text}</pre></body></html>`;
                    await fs.writeFile(outputPath, htmlContent);
                }
            } else {
                throw new Error(`Conversion from PDF to ${outputFormat} is not supported`);
            }
        } else if (fileType === 'docx' || fileType === 'doc') {
            if (outputFormat === 'pdf') {
                // DOCX/DOC to PDF using LibreOffice if available
                try {
                    await execAsync(`soffice --headless --convert-to pdf --outdir ${outputDir} ${filePath}`);
                    // LibreOffice creates a file with the same name but .pdf extension
                    const convertedFileName = `${path.basename(filePath, path.extname(filePath))}.pdf`;
                    const convertedPath = path.join(outputDir, convertedFileName);
                    await fs.rename(convertedPath, outputPath);
                } catch (error) {
                    logger.warn('LibreOffice not available, conversion failed', { error });
                    throw new Error('LibreOffice is required for DOCX/DOC to PDF conversion');
                }
            } else if (outputFormat === 'txt') {
                // DOCX/DOC to TXT
                const result = await mammoth.extractRawText({ path: filePath });
                await fs.writeFile(outputPath, result.value);
            } else if (outputFormat === 'html') {
                // DOCX/DOC to HTML
                const result = await mammoth.convertToHtml({ path: filePath });
                await fs.writeFile(outputPath, result.value);
            } else {
                throw new Error(`Conversion from ${fileType} to ${outputFormat} is not supported`);
            }
        } else if (fileType === 'txt') {
            if (outputFormat === 'pdf') {
                // TXT to PDF using LibreOffice if available
                try {
                    await execAsync(`soffice --headless --convert-to pdf --outdir ${outputDir} ${filePath}`);
                    // LibreOffice creates a file with the same name but .pdf extension
                    const convertedFileName = `${path.basename(filePath, path.extname(filePath))}.pdf`;
                    const convertedPath = path.join(outputDir, convertedFileName);
                    await fs.rename(convertedPath, outputPath);
                } catch (error) {
                    logger.warn('LibreOffice not available, conversion failed', { error });
                    throw new Error('LibreOffice is required for TXT to PDF conversion');
                }
            } else if (outputFormat === 'html') {
                // TXT to HTML
                const content = await fs.readFile(filePath, 'utf8');
                const htmlContent = `<html><body><pre>${content}</pre></body></html>`;
                await fs.writeFile(outputPath, htmlContent);
            } else if (outputFormat === 'md') {
                // TXT to MD (simple conversion)
                const content = await fs.readFile(filePath, 'utf8');
                await fs.writeFile(outputPath, content);
            } else {
                throw new Error(`Conversion from TXT to ${outputFormat} is not supported`);
            }
        } else if (fileType === 'md') {
            if (outputFormat === 'html') {
                // MD to HTML using marked if available
                try {
                    const { marked } = await import('marked');
                    const content = await fs.readFile(filePath, 'utf8');
                    const htmlContent = await marked(content);
                    await fs.writeFile(outputPath, htmlContent);
                } catch (error) {
                    logger.warn('marked not available, falling back to basic conversion', { error });
                    // Fallback to basic conversion
                    const content = await fs.readFile(filePath, 'utf8');
                    const htmlContent = `<html><body><pre>${content}</pre></body></html>`;
                    await fs.writeFile(outputPath, htmlContent);
                }
            } else if (outputFormat === 'pdf') {
                // MD to PDF using pandoc if available
                try {
                    await execAsync(`pandoc ${filePath} -o ${outputPath}`);
                } catch (error) {
                    logger.warn('pandoc not available, conversion failed', { error });
                    throw new Error('pandoc is required for MD to PDF conversion');
                }
            } else {
                throw new Error(`Conversion from MD to ${outputFormat} is not supported`);
            }
        } else {
            throw new Error(`Conversion from ${fileType} to ${outputFormat} is not supported`);
        }

        const processingTime = Date.now() - startTime;

        return {
            success: true,
            documentId,
            content: `Document converted to ${outputFormat}`,
            metadata: {
                processingTime,
                originalFormat: fileType,
                outputFormat
            }
        };
    } catch (error) {
        logger.error('Document conversion failed', { error, filePath, outputFormat });

        return {
            success: false,
            documentId,
            error: error instanceof Error ? error.message : 'Document conversion failed',
            metadata: {
                processingTime: Date.now() - startTime,
                originalFormat: fileType,
                outputFormat
            }
        };
    }
}

/**
 * Check if conversion is supported
 */
export function isConversionSupported(sourceFormat: DocumentType, targetFormat: OutputFormat): boolean {
    // Define supported conversions
    const supportedConversions: Record<DocumentType, OutputFormat[]> = {
        'pdf': ['txt', 'html'],
        'docx': ['pdf', 'txt', 'html'],
        'doc': ['pdf', 'txt', 'html'],
        'txt': ['pdf', 'html', 'md'],
        'md': ['html', 'pdf'],
        'html': [],
        'epub': []
    };

    return supportedConversions[sourceFormat]?.includes(targetFormat) || false;
}

/**
 * Get converted document path
 */
export async function getConvertedDocumentPath(documentId: string, format: OutputFormat): Promise<string | null> {
    const outputDir = path.join(config.storage.path, 'converted');
    const outputPath = path.join(outputDir, `${documentId}.${format}`);

    try {
        const exists = await fs.pathExists(outputPath);
        return exists ? outputPath : null;
    } catch (error) {
        logger.error('Error checking converted document path', { error, documentId, format });
        return null;
    }
} 