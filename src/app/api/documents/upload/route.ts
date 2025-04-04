import { writeFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import { mkdir } from 'fs/promises';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const kbId = formData.get('kbId') as string;

        if (!file) {
            return NextResponse.json(
                { error: '没有找到文件' },
                { status: 400 }
            );
        }

        if (!kbId) {
            return NextResponse.json(
                { error: '没有找到知识库ID' },
                { status: 400 }
            );
        }

        // 创建上传目录
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', kbId);
        await mkdir(uploadDir, { recursive: true });

        // 生成安全的文件名
        const timestamp = Date.now();
        const safeName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const filePath = path.join(uploadDir, safeName);

        // 保存文件
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // 返回成功响应
        return NextResponse.json({
            success: true,
            data: {
                name: file.name,
                size: file.size,
                path: `/uploads/${kbId}/${safeName}`,
                kbId: kbId
            }
        });

    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: '文件上传失败' },
            { status: 500 }
        );
    }
} 