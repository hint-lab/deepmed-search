"use client"

import { createDocumentParser, initDocumentParser } from './index';

async function testDocumentParser() {
    try {
        console.log('开始测试文档处理系统...');

        // 初始化文档处理系统
        const initialized = await initDocumentParser();
        console.log('初始化结果:', initialized);

        // 创建文档解析器实例
        const parser = createDocumentParser({
            baseUrl: process.env.NEXT_PUBLIC_DOCUMENT_PARSER_URL || 'http://localhost:3000',
            apiKey: process.env.NEXT_PUBLIC_DOCUMENT_PARSER_API_KEY,
        });

        // 创建一个测试文件
        const testFile = new File(['这是一个测试文档的内容'], 'test.txt', { type: 'text/plain' });

        // 测试上传文档
        console.log('测试上传文档...');
        const uploadResult = await parser.uploadDocument(testFile);
        console.log('上传结果:', uploadResult);

        // 测试获取文档状态
        console.log('测试获取文档状态...');
        const status = await parser.getDocumentStatus(uploadResult.documentId);
        console.log('文档状态:', status);

        // 测试解析文档
        console.log('测试解析文档...');
        const parseResult = await parser.parseDocument(testFile, {
            model: 'gpt-4o',
            maintainFormat: true,
        }, (status) => {
            console.log('处理进度:', status);
        });
        console.log('解析结果:', parseResult);

        console.log('测试完成！');
    } catch (error) {
        console.error('测试过程中出现错误:', error);
    }
}

// 导出测试函数
export { testDocumentParser }; 