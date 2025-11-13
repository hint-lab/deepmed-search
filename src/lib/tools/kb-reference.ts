import { z } from 'zod';
import { Tool } from '@/lib/llm-provider';

/**
 * 知识库引用工具
 * 用于在对话中引用知识库片段
 */
export const kbReferenceTool: Tool = {
  name: 'kb_reference',
  description: '引用知识库片段，必须在引用知识库内容时调用此工具',
  parameters: z.object({
    doc_id: z.string().describe('引用文档的ID'),
    doc_name: z.string().describe('引用文档的名称'),
    chunk_id: z.string().optional().describe('引用的文本片段ID'),
    content: z.string().describe('引用的片段内容'),
    reference_id: z.number().describe('引用编号，从1开始递增'),
  }),
  handler: async (params) => {
    // 返回引用对象，将在流中被处理
    return JSON.stringify({
      type: 'reference',
      ...params,
    });
  },
};

