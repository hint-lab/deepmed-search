/**
 * zerox 测试脚本
 * 使用: npx ts-node scripts/test-zerox.ts [测试文件路径]
 * 
 * 测试不同的 zerox 配置选项，帮助排查文档解析问题
 */

import path from 'path';
import fs from 'fs';
import { zerox } from 'zerox';
import { ModelProvider, ModelOptions } from 'zerox/node-zerox/dist/types';
import 'dotenv/config';

// 获取测试文件路径
const testFilePath = process.argv[2] || path.resolve(process.cwd(), 'test/data/05-versions-space.pdf');

// 确保测试文件存在
if (!fs.existsSync(testFilePath)) {
    console.error(`错误: 测试文件 ${testFilePath} 不存在`);
    process.exit(1);
}

// 记录环境信息
console.log('==== 环境信息 ====');
console.log(`Node.js 版本: ${process.version}`);
console.log(`操作系统: ${process.platform} ${process.arch}`);
console.log(`测试文件: ${testFilePath}`);
console.log(`文件大小: ${(fs.statSync(testFilePath).size / 1024 / 1024).toFixed(2)}MB`);
console.log(`文件格式: ${path.extname(testFilePath)}`);
console.log(`工作目录: ${process.cwd()}`);
console.log(`Tesseract 环境变量:`);
console.log(`  TESS_WORKER_PATH: ${process.env.TESS_WORKER_PATH || '未设置'}`);
console.log(`  TESS_CORE_PATH: ${process.env.TESS_CORE_PATH || '未设置'}`);
console.log(`  TESSDATA_PREFIX: ${process.env.TESSDATA_PREFIX || '未设置'}`);
console.log(`OpenAI 环境变量:`);
console.log(`  OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '已设置' : '未设置'}`);
console.log(`  OPENAI_BASE_URL: ${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}`);
console.log(`  OPENAI_MODEL_NAME: ${process.env.OPENAI_MODEL_NAME || ModelOptions.OPENAI_GPT_4O_MINI}`);

// 创建临时输出目录
const outputDir = path.resolve(process.cwd(), 'test-output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// OpenAI API URL (从环境变量获取)
const openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
// OpenAI Model (从环境变量获取)
const openaiModel = process.env.OPENAI_MODEL_NAME || ModelOptions.OPENAI_GPT_4O_MINI;

/**
 * 运行 zerox 测试
 */
async function runTest(config: string, options: any) {
    console.log(`\n==== 开始测试配置: ${config} ====`);
    console.log('配置选项:', JSON.stringify(options, null, 2));

    const startTime = Date.now();
    try {
        // 记录内存使用情况
        const memBefore = process.memoryUsage();
        console.log(`内存使用 (测试前): ${(memBefore.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // 运行 zerox
        console.log('正在处理文档...');
        const result = await zerox({
            filePath: testFilePath,
            modelProvider: ModelProvider.OPENAI,
            credentials: {
                apiKey: process.env.OPENAI_API_KEY || "",
                baseUrl: openaiBaseUrl, // 使用从环境变量获取的 API URL
            },
            outputDir: path.join(outputDir, config),
            ...options
        });

        // 记录内存使用情况
        const memAfter = process.memoryUsage();
        console.log(`内存使用 (测试后): ${(memAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        // 打印结果摘要
        console.log('处理结果:');
        console.log(`  页数: ${result.pages.length}`);
        console.log(`  输入 tokens: ${result.inputTokens}`);
        console.log(`  输出 tokens: ${result.outputTokens}`);
        console.log(`  完成时间: ${result.completionTime}ms`);

        // 保存结果到文件
        const resultPath = path.join(outputDir, `${config}-result.json`);
        fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
        console.log(`结果已保存到: ${resultPath}`);

        return true;
    } catch (error) {
        console.error(`测试失败:`, error);
        return false;
    } finally {
        const endTime = Date.now();
        console.log(`总执行时间: ${endTime - startTime}ms`);
        console.log(`==== 测试配置完成: ${config} ====\n`);
    }
}

/**
 * 主函数 - 运行多种不同配置的测试
 */
async function main() {
    // 基础参数
    const baseOptions = {
        model: openaiModel, // 使用从环境变量获取的模型名称
        cleanup: true,
        maintainFormat: true,
    };

    // 测试不同的配置
    const testConfigs = [
        {
            name: "默认配置",
            options: { ...baseOptions }
        },
        {
            name: "禁用Tesseract",
            options: {
                ...baseOptions,
                maxTesseractWorkers: 0,
            }
        },
        {
            name: "高DPI",
            options: {
                ...baseOptions,
                imageDensity: 300,
            }
        },
        {
            name: "低DPI",
            options: {
                ...baseOptions,
                imageDensity: 72,
            }
        },
        {
            name: "禁用页面方向修正",
            options: {
                ...baseOptions,
                correctOrientation: false,
            }
        },
        {
            name: "禁用边缘裁剪",
            options: {
                ...baseOptions,
                trimEdges: false,
            }
        },
        {
            name: "高并发",
            options: {
                ...baseOptions,
                concurrency: 20,
            }
        },
        {
            name: "低并发",
            options: {
                ...baseOptions,
                concurrency: 1,
            }
        },
        {
            name: "完整配置",
            options: {
                ...baseOptions,
                maxTesseractWorkers: 2,
                imageDensity: 150,
                imageHeight: 1500,
                correctOrientation: true,
                trimEdges: true,
                concurrency: 5,
                maintainFormat: true,
                maxImageSize: 10, // 10MB
                prompt: "提取文档中的所有文本内容，保持原始格式",
            }
        },
    ];

    console.log(`\n===== zerox 测试脚本 - 测试 ${testConfigs.length} 种配置 =====\n`);

    // 测试网络连接
    try {
        console.log(`测试 OpenAI API 连接 (${openaiBaseUrl})...`);
        const response = await fetch(`${openaiBaseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            }
        });
        if (response.ok) {
            console.log('OpenAI API 连接正常');
        } else {
            console.warn(`OpenAI API 连接异常: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('OpenAI API 连接测试失败:', error);
    }

    // 运行所有测试
    const results = [];

    for (const config of testConfigs) {
        const success = await runTest(config.name, config.options);
        results.push({
            name: config.name,
            success
        });
    }

    // 汇总测试结果
    console.log('\n===== 测试结果汇总 =====');

    let successCount = 0;
    for (const result of results) {
        console.log(`${result.name}: ${result.success ? '✅ 成功' : '❌ 失败'}`);
        if (result.success) successCount++;
    }

    console.log(`\n总计: ${successCount}/${results.length} 个配置测试成功\n`);

    if (successCount > 0) {
        console.log(`推荐配置: ${results.find(r => r.success)?.name}`);
    } else {
        console.log('所有配置测试均失败，请检查是否存在网络问题或 API 密钥问题');
    }
}

// 运行主函数
main().catch(error => {
    console.error('测试脚本执行失败:', error);
    process.exit(1);
}); 