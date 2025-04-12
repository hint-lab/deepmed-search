import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        // 从查询参数或环境变量获取队列服务 URL
        const queueServiceUrl = process.env.QUEUE_SERVICE_URL || 'http://localhost:5000';

        // 发送请求到队列服务
        const response = await fetch(`${queueServiceUrl}/health`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `队列服务响应错误: ${response.statusText}` },
                { status: response.status }
            );
        }

        // 获取响应数据
        const data = await response.json();

        // 返回响应
        return NextResponse.json(data);
    } catch (error) {
        console.error('队列健康检查失败:', error);
        return NextResponse.json(
            { error: '队列健康检查失败', details: error instanceof Error ? error.message : '未知错误' },
            { status: 500 }
        );
    }
} 