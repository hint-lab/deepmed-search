/**
 * zerox 库补丁
 * 为 OpenAIModel 类添加自定义 base URL 支持
 */

import path from 'path';
import fs from 'fs';
import logger from '@/utils/logger';
// 获取项目根目录（使用绝对路径）
const projectRoot = process.cwd();

// 补丁文件路径
const openAIModelPath = path.join(projectRoot, 'node_modules/zerox/node-zerox/dist/models/openAI.js');

logger.info(`项目根目录:${projectRoot}`);
logger.info(`尝试应用补丁到文件:${openAIModelPath}`);

// 检查文件是否存在
if (!fs.existsSync(openAIModelPath)) {
    logger.error(`错误：找不到文件 ${openAIModelPath}`);
    logger.error('请确保 zerox 库已正确安装，并且路径正确');
    process.exit(1);
}

// 读取原始文件
let content = fs.readFileSync(openAIModelPath, 'utf8');

// 检查是否已经应用过补丁
if (content.includes('this.baseUrl = credentials.baseUrl')) {
    logger.info('补丁已经应用过，无需重复应用');

}

// 修改构造函数，添加 baseUrl 参数
content = content.replace(
    'function OpenAIModel(credentials, model, llmParams) {',
    `function OpenAIModel(credentials, model, llmParams) {
        this.apiKey = credentials.apiKey;
        this.model = model;
        this.llmParams = llmParams;
        this.baseUrl = credentials.baseUrl || 'https://api.openai.com/v1';`
);

// 修改 handleOCR 方法中的 API 调用
content = content.replace(
    'return [4 /*yield*/, axios_1.default.post("https://api.openai.com/v1/chat/completions",',
    'return [4 /*yield*/, axios_1.default.post(this.baseUrl + "/chat/completions",'
);

// 修改 handleExtraction 方法中的 API 调用
content = content.replace(
    'return [4 /*yield*/, axios_1.default.post("https://api.openai.com/v1/chat/completions",',
    'return [4 /*yield*/, axios_1.default.post(this.baseUrl + "/chat/completions",'
);

// 写入修改后的文件
fs.writeFileSync(openAIModelPath, content, 'utf8');
// 输出成功信息
logger.info('zerox 补丁已成功应用：OpenAIModel 现在支持自定义 base URL'); 