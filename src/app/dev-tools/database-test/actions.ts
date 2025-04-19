'use server';

import { PrismaClient } from '@prisma/client';

// 创建一个Prisma客户端实例
const prisma = new PrismaClient();

/**
 * 检查数据库连接状态
 * 返回数据库是否在线
 */
export async function checkDatabaseStatus() {
    try {
        // 尝试执行一个简单的查询来测试连接
        const result = await prisma.$queryRaw`SELECT 1 as connected`;

        // 检查结果是否符合预期
        const isConnected = result && Array.isArray(result) && result.length > 0 && result[0].connected === 1;

        return {
            success: true,
            isOnline: isConnected,
            message: isConnected ? '数据库连接正常' : '数据库连接异常',
            data: result,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('数据库连接错误:', error);
        return {
            success: false,
            isOnline: false,
            message: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 测试数据库连接
 * 使用Prisma客户端尝试连接数据库
 */
export async function testDatabaseConnection() {
    try {
        // 尝试执行一个简单的查询来测试连接
        // 这里我们使用$queryRaw来执行一个简单的SQL查询
        const result = await prisma.$queryRaw`SELECT 1 as connected`;

        return {
            success: true,
            message: '数据库连接成功',
            data: result,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('数据库连接错误:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 测试Prisma操作
 * 执行一些基本的Prisma操作来测试功能
 */
export async function testPrismaOperations() {
    try {
        // 获取数据库版本信息
        const versionResult = await prisma.$queryRaw`SELECT version() as version`;

        // 获取数据库中的表信息
        const tablesResult = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

        return {
            success: true,
            message: 'Prisma操作成功',
            data: {
                version: versionResult,
                tables: tablesResult
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Prisma操作错误:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 执行自定义SQL查询
 * 允许执行自定义SQL查询来测试数据库
 */
export async function executeCustomQuery(query: string) {
    try {
        // 注意：在生产环境中应该限制可执行的查询类型
        // 这里仅用于测试目的
        const result = await prisma.$queryRawUnsafe(query);

        return {
            success: true,
            message: '查询执行成功',
            data: result,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('查询执行错误:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : '未知错误',
            timestamp: new Date().toISOString()
        };
    }
} 