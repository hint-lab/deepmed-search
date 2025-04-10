#!/usr/bin/env ts-node

/**
 * 修复 zerox 库中硬编码的 OpenAI API URL
 * 用法: npx ts-node scripts/fix-zerox-url.ts
 * 
 * 这个脚本会将 zerox 库中硬编码的 API URL 替换为 .env 文件中定义的 OPENAI_BASE_URL
 */

import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

// ANSI 颜色代码
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// 日志函数
const log = {
    info: (message: string): void => console.log(message),
    success: (message: string): void => console.log(`${GREEN}${message}${RESET}`),
    warn: (message: string): void => console.log(`${YELLOW}${message}${RESET}`),
    error: (message: string): void => console.log(`${RED}${message}${RESET}`),
};

// 要替换的 URL 配置
interface UrlReplacement {
    original: string;
    count: number;
}

// 结果统计
interface ReplaceStats {
    filesModified: number;
    totalReplacements: number;
    replacements: UrlReplacement[];
}

/**
 * 加载环境变量并获取 OpenAI API 基础 URL
 */
function getCustomBaseUrl(): string {
    // 加载 .env 文件
    dotenv.config();

    // 获取自定义 API 基础 URL
    const customBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

    // 移除末尾的 '/v1' 以保持一致性
    return customBaseUrl.endsWith('/v1')
        ? customBaseUrl.slice(0, -3)
        : customBaseUrl;
}

/**
 * 替换文件中的 URL
 */
function replaceUrlsInFile(filePath: string, baseUrl: string, hardcodedUrls: string[]): ReplaceStats {
    const stats: ReplaceStats = {
        filesModified: 0,
        totalReplacements: 0,
        replacements: [],
    };

    try {
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            log.error(`文件不存在: ${filePath}`);
            return stats;
        }

        // 创建备份
        const backupPath = `${filePath}.bak`;
        fs.copyFileSync(filePath, backupPath);
        log.info(`已创建备份: ${backupPath}`);

        // 读取文件内容
        let content = fs.readFileSync(filePath, 'utf8');
        let fileModified = false;

        // 对每个硬编码的 URL 进行替换
        for (const url of hardcodedUrls) {
            const regex = new RegExp(url, 'g');
            const originalContent = content;
            content = content.replace(regex, baseUrl);

            // 计算替换次数
            const matches = originalContent.match(regex);
            const count = matches ? matches.length : 0;

            if (count > 0) {
                stats.totalReplacements += count;
                fileModified = true;
                stats.replacements.push({ original: url, count });
                log.info(`在 ${filePath} 中将 ${url} 替换为 ${baseUrl} (${count} 次)`);
            }
        }

        // 如果文件有修改，则写回
        if (fileModified) {
            fs.writeFileSync(filePath, content, 'utf8');
            stats.filesModified = 1;
        } else {
            log.warn(`文件中没有找到硬编码的 URL: ${filePath}`);
            // 删除备份，因为没有修改
            fs.unlinkSync(backupPath);
            log.info(`已删除备份文件`);
        }
    } catch (error) {
        log.error(`处理文件 ${filePath} 时出错: ${error instanceof Error ? error.message : String(error)}`);
    }

    return stats;
}

/**
 * 主函数
 */
function main(): void {
    log.success(`\n==== 开始修复 zerox 库中的硬编码 API URL ====`);

    // 获取基础 URL
    const baseUrl = getCustomBaseUrl();
    log.info(`使用的自定义 API 基础 URL: ${GREEN}${baseUrl}${RESET}`);

    // 需要替换 URL 的文件路径
    const filePath = path.resolve(process.cwd(), 'node_modules/zerox/node-zerox/dist/models/openAI.js');
    log.info(`\n检查文件: ${filePath}`);

    // 要替换的硬编码 URL
    const hardcodedUrls = [
        'https://api.openai.com',
    ];

    // 执行替换
    const stats = replaceUrlsInFile(filePath, baseUrl, hardcodedUrls);

    // 打印总结
    log.success(`\n==== 完成 ====`);

    if (stats.filesModified > 0) {
        log.success(`修复成功! 替换了 ${stats.totalReplacements} 个 URL。`);

        // 打印详细的替换信息
        stats.replacements.forEach(replacement => {
            log.info(`  ${replacement.original} -> ${baseUrl} (${replacement.count} 次)`);
        });

        log.info(`\nzerox 库现在将使用 ${baseUrl} 作为 API 基础 URL。`);
    } else {
        log.warn(`没有进行任何替换，可能是 URL 格式已更改或 zerox 库版本已更新。`);
        log.info(`如需手动检查，请编辑文件: ${filePath}`);
    }

    log.info(`\n如果你在运行应用程序时仍然遇到问题，请考虑使用环境变量指定完整的 URL:`);
    log.info(`  ${YELLOW}OPENAI_BASE_URL=${baseUrl}/v1${RESET}`);
}

// 执行主函数
main(); 