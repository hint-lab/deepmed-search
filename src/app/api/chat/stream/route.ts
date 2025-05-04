// File: app/api/chat/stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChatMessageStream } from '@/actions/chat';

export async function GET(req: NextRequest) {
    return new Response('Method not allowed', { status: 405 });
}

export async function POST(req: NextRequest) {
    try {
        const { dialogId, content, userId, knowledgeBaseId, isReason = false } = await req.json();

        if (!dialogId || !content || !userId) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const stream = await getChatMessageStream(dialogId, content, userId, knowledgeBaseId, isReason);

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            },
        });

    } catch (error) {
        console.error('API Route POST handler error:', error);
        return NextResponse.json(
            { error: '服务器内部错误: ' + (error instanceof Error ? error.message : String(error)) },
            { status: 500 }
        );
    }
}