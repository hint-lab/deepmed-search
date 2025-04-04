'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function getknowledgebaseDetail(knowledgeBaseId: string) {
    try {
        const knowledgeBase = await prisma.knowledgeBase.findUnique({
            where: { id: knowledgeBaseId },
            include: {
                documents: true,
                tags: true,
            },
        });
        return { data: knowledgeBase, code: 0 };
    } catch (error) {
        return { data: null, code: 1, message: '获取知识库详情失败' };
    }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = Number(searchParams.get('page')) || 1;
        const pageSize = Number(searchParams.get('pageSize')) || 10;
        const keywords = searchParams.get('keywords');

        const where = keywords ? {
            name: {
                contains: keywords,
            },
        } : {};

        const [list, total] = await Promise.all([
            prisma.knowledgeBase.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: {
                    createdAt: 'desc',
                },
            }),
            prisma.knowledgeBase.count({ where }),
        ]);

        return NextResponse.json({ data: { list, total }, code: 0 });
    } catch (error) {
        return NextResponse.json({ data: null, code: 1, message: '获取知识库列表失败' });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...params } = body;

        switch (action) {
            case 'create':
                const kb = await prisma.knowledgeBase.create({
                    data: {
                        name: params.name,
                    },
                });
                revalidatePath('/knowledge');
                return NextResponse.json({ data: kb, code: 0 });

            case 'update':
                const updatedKb = await prisma.knowledgeBase.update({
                    where: { id: params.id },
                    data: {
                        name: params.name,
                    },
                });
                revalidatePath('/knowledge');
                return NextResponse.json({ data: updatedKb, code: 0 });

            case 'delete':
                await prisma.knowledgeBase.delete({
                    where: { id: params.id },
                });
                revalidatePath('/knowledge');
                return NextResponse.json({ code: 0 });

            default:
                return NextResponse.json({ code: 1, message: '未知的操作类型' });
        }
    } catch (error) {
        return NextResponse.json({ code: 1, message: '操作失败' });
    }
} 