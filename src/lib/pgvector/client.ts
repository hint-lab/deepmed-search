"use server"

import { prisma } from '../prisma';
import { Prisma } from '@prisma/client';

// pgvector 配置
export const VECTOR_DIMENSIONS = {
    'text-embedding-ada-002': 1536,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'openai-text-embedding': 1536, // 默认
} as const;

/**
 * 检查 PostgreSQL 连接是否可用
 */
export async function checkPostgresConnection(): Promise<boolean> {
    try {
        // 执行一个简单的查询来检查连接
        await prisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.error('PostgreSQL 连接检查失败:', error);
        return false;
    }
}

/**
 * 确保 pgvector 扩展已安装
 */
export async function ensurePgVectorExtension(): Promise<boolean> {
    try {
        // 检查 pgvector 扩展是否已安装
        const result = await prisma.$queryRaw<[{ exists: boolean }]>`
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) as exists;
        `;

        const extensionExists = result[0].exists;

        if (!extensionExists) {
            // 安装 pgvector 扩展
            await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector;`;
            console.log('pgvector 扩展已安装');
        } else {
            console.log('pgvector 扩展已存在');
        }

        return true;
    } catch (error) {
        console.error('安装 pgvector 扩展失败:', error);
        return false;
    }
}

/**
 * 关闭 PostgreSQL 连接
 */
export async function closePostgresConnection() {
    try {
        await prisma.$disconnect();
        console.log('PostgreSQL 连接已关闭');
    } catch (error) {
        console.error('关闭 PostgreSQL 连接失败:', error);
        throw error;
    }
} 