/**
 * CDP API Proxy
 * 代理 CDP API 请求，解决混合内容问题
 */

import { NextRequest, NextResponse } from 'next/server';

const CDP_API_BASE = process.env.CDP_API_URL || 'http://localhost:7777';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, ...params } = body;

    let url = `${CDP_API_BASE}`;

    if (endpoint === 'retrieve/context') {
      url += '/retrieve/context';
    } else if (endpoint === 'debate/validate') {
      url += '/debate/validate';
    } else {
      return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('CDP Proxy Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to CDP Service' },
      { status: 500 }
    );
  }
}

