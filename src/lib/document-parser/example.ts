import { DocumentParser, DocumentParseOptions, DocumentSummaryOptions } from './index';

// 创建 DocumentParser 实例
const documentParser = new DocumentParser({
    baseUrl: 'http://localhost:3000', // 替换为实际的 Koa 服务器地址
    apiKey: 'your-api-key', // 如果需要认证，替换为实际的 API 密钥
});

// 示例：解析文档
async function parseDocumentExample() {
    try {
        // 假设我们有一个文件对象
        const file = new File(['文件内容'], 'example.pdf', { type: 'application/pdf' });

        // 解析选项
        const options: DocumentParseOptions = {
            model: 'gpt-4o',
            maintainFormat: true,
            cleanup: true,
        };

        // 进度回调函数
        const onProgress = (status: any) => {
            console.log('处理进度:', status);
        };

        // 解析文档
        const result = await documentParser.parseDocument(file, options, onProgress);

        console.log('解析结果:', result);

        // 获取文档分块 - 使用上传时返回的 documentId
        const { documentId } = await documentParser.uploadDocument(file, options);
        const chunks = await documentParser.getDocumentChunks(documentId);
        console.log('文档分块:', chunks);

        // 转换文档格式
        const converted = await documentParser.convertDocument(documentId, 'markdown');
        console.log('转换后的文档:', converted);
    } catch (error) {
        console.error('解析文档失败:', error);
    }
}

// 示例：生成文档摘要
async function summarizeDocumentExample() {
    try {
        // 假设我们有一个文件对象
        const file = new File(['文件内容'], 'example.pdf', { type: 'application/pdf' });

        // 摘要选项
        const options: DocumentSummaryOptions = {
            maxLength: 300,
            format: 'bullet',
        };

        // 进度回调函数
        const onProgress = (status: any) => {
            console.log('摘要生成进度:', status);
        };

        // 生成摘要
        const result = await documentParser.summarizeDocument(file, options, onProgress);

        console.log('摘要结果:', result);
    } catch (error) {
        console.error('生成摘要失败:', error);
    }
}

// 运行示例
// parseDocumentExample();
// summarizeDocumentExample();

export { parseDocumentExample, summarizeDocumentExample }; 