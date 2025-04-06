import { NextRequest, NextResponse } from 'next/server';
import { searchSimilarDocuments } from '@/lib/milvus';
import { withAuth } from '@/lib/auth-utils';

// 假设有一个嵌入服务来转换查询为向量
async function getEmbedding(text: string): Promise<number[]> {
    // 此处应调用实际的嵌入服务，如 OpenAI API
    // 为简化示例，这里返回一个随机向量
    const dummyVector = Array.from({ length: 1536 }, () => Math.random());

    try {
        // 实际实现应该像这样：
        /*
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-3-small'
          }),
        });
        
        const data = await response.json();
        return data.data[0].embedding;
        */

        return dummyVector;
    } catch (error) {
        console.error('获取嵌入向量失败:', error);
        return dummyVector; // 失败时返回随机向量
    }
}

export async function POST(req: NextRequest) {
    try {
        // 获取请求体
        const { query, limit = 5, collection = 'medical_documents', userId } = await req.json();

        if (!query || typeof query !== 'string' || !userId) {
            return NextResponse.json({ error: '查询参数无效或未提供用户ID' }, { status: 400 });
        }

        // 获取查询的嵌入向量
        const queryVector = await getEmbedding(query);

        // 搜索相似文档
        const searchResult = await searchSimilarDocuments(collection, queryVector, limit);

        // 处理搜索结果
        const results = searchResult.results.map(result => {
            // 解析元数据 JSON 字符串
            let metadata = {};
            try {
                metadata = JSON.parse(result.metadata);
            } catch (e) {
                console.error('解析元数据失败:', e);
            }

            return {
                id: result.doc_id,
                content: result.content,
                score: result.score,
                metadata
            };
        });

        // 返回结果
        return NextResponse.json({ results });
    } catch (error) {
        console.error('向量搜索 API 错误:', error);
        return NextResponse.json(
            { error: '处理搜索请求时出错' },
            { status: 500 }
        );
    }
} 