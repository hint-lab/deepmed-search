/**
 * LLM Provider 使用示例
 * 
 * 本文件包含了各种使用场景的示例代码
 */

import {
  ProviderFactory,
  ProviderType,
  getDefaultProvider,
  ChatOptions,
  Tool,
} from './index';

/**
 * 示例 1: 基本聊天
 */
export async function example1_basicChat() {
  const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
  
  const response = await provider.chat({
    dialogId: 'user-123',
    input: '你好，请介绍一下你自己',
  });
  
  console.log('回复:', response.content);
  console.log('模型:', response.metadata.model);
  console.log('Token 使用:', response.metadata.usage);
}

/**
 * 示例 2: 流式响应
 */
export async function example2_streamChat() {
  const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
  
  const response = await provider.chatStream({
    dialogId: 'user-123',
    input: '写一首关于春天的诗',
    onChunk: (chunk) => {
      process.stdout.write(chunk as string);
    },
  });
  
  console.log('\n完整回复:', response.content);
}

/**
 * 示例 3: DeepSeek 思考模式
 */
export async function example3_reasonMode() {
  const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
  
  const response = await provider.chat({
    dialogId: 'user-123',
    input: '解释量子纠缠的原理',
    isReason: true,
  });
  
  console.log('推理过程:', response.metadata.reasoningContent);
  console.log('最终答案:', response.content);
}

/**
 * 示例 4: 使用工具调用
 */
export async function example4_toolCalling() {
  const tools: Tool[] = [
    {
      name: 'get_weather',
      description: '获取指定城市的天气信息',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称',
          },
        },
        required: ['city'],
      },
      handler: async ({ city }) => {
        // 模拟获取天气
        return {
          city,
          temperature: 25,
          condition: '晴朗',
          humidity: 60,
        };
      },
    },
    {
      name: 'search_papers',
      description: '搜索医学文献',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '搜索关键词',
          },
          limit: {
            type: 'number',
            description: '返回结果数量',
            default: 10,
          },
        },
        required: ['query'],
      },
      handler: async ({ query, limit = 10 }) => {
        // 模拟搜索
        return {
          query,
          results: [
            { title: '论文1', abstract: '摘要1' },
            { title: '论文2', abstract: '摘要2' },
          ].slice(0, limit),
        };
      },
    },
  ];
  
  const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
  
  const response = await provider.chatWithTools({
    dialogId: 'user-123',
    input: '北京今天天气怎么样？',
    tools,
  });
  
  console.log('回复:', response.content);
  console.log('工具调用:', response.metadata.toolCalls);
}

/**
 * 示例 5: 流式工具调用
 */
export async function example5_streamToolCalling() {
  const tools: Tool[] = [
    {
      name: 'calculate',
      description: '执行数学计算',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: '数学表达式',
          },
        },
        required: ['expression'],
      },
      handler: async ({ expression }) => {
        try {
          // 注意: 实际应用中应使用安全的数学解析器
          const result = eval(expression);
          return { expression, result };
        } catch (error) {
          return { error: '计算错误' };
        }
      },
    },
  ];
  
  const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
  
  const response = await provider.chatWithToolsStream({
    dialogId: 'user-123',
    input: '计算 (123 + 456) * 789',
    tools,
    onChunk: (chunk) => {
      if (typeof chunk === 'string') {
        process.stdout.write(chunk);
      } else {
        console.log('\n工具调用:', chunk);
      }
    },
  });
  
  console.log('\n完整回复:', response.content);
}

/**
 * 示例 6: 自动选择提供商
 */
export async function example6_autoProvider() {
  // 根据模型名称自动选择提供商
  const gptProvider = ProviderFactory.getProviderByModel('gpt-4o');
  const geminiProvider = ProviderFactory.getProviderByModel('gemini-2.0-flash-exp');
  const deepseekProvider = ProviderFactory.getProviderByModel('deepseek-chat');
  
  console.log('GPT Provider:', gptProvider.type);
  console.log('Gemini Provider:', geminiProvider.type);
  console.log('DeepSeek Provider:', deepseekProvider.type);
}

/**
 * 示例 7: 使用默认提供商
 */
export async function example7_defaultProvider() {
  // 自动根据环境变量选择可用的提供商
  const provider = getDefaultProvider();
  
  const response = await provider.chat({
    dialogId: 'user-123',
    input: '你好',
  });
  
  console.log('使用提供商:', response.metadata.provider);
  console.log('回复:', response.content);
}

/**
 * 示例 8: 管理对话历史
 */
export async function example8_historyManagement() {
  const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
  const dialogId = 'user-123';
  
  // 设置系统提示词
  provider.setSystemPrompt(dialogId, '你是一个友善的医学助手');
  
  // 多轮对话
  await provider.chat({
    dialogId,
    input: '什么是高血压？',
  });
  
  await provider.chat({
    dialogId,
    input: '如何预防？',
  });
  
  // 获取历史记录
  const history = provider.getHistory(dialogId);
  console.log('对话历史:', history);
  
  // 清除历史记录
  provider.clearHistory(dialogId);
}

/**
 * 示例 9: 自定义配置
 */
export async function example9_customConfig() {
  const provider = ProviderFactory.createDeepSeek({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: 'deepseek-chat',
    temperature: 0.8,
    maxTokens: 4000,
    systemPrompt: '你是一个专业的医学AI助手，精通各种医学知识',
  });
  
  const response = await provider.chat({
    dialogId: 'user-123',
    input: '介绍一下糖尿病的类型',
  });
  
  console.log(response.content);
}

/**
 * 示例 10: 错误处理
 */
export async function example10_errorHandling() {
  const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
  
  try {
    const response = await provider.chat({
      dialogId: 'user-123',
      input: '你好',
    });
    console.log('成功:', response.content);
  } catch (error) {
    if (error instanceof Error) {
      console.error('错误:', error.message);
    }
  }
}

/**
 * 示例 11: 比较不同提供商
 */
export async function example11_compareProviders() {
  const question = '解释一下机器学习和深度学习的区别';
  
  // 使用不同的提供商回答同一个问题
  const providers = [
    ProviderFactory.getProvider(ProviderType.DeepSeek),
    ProviderFactory.getProvider(ProviderType.OpenAI),
    ProviderFactory.getProvider(ProviderType.Google),
  ];
  
  for (const provider of providers) {
    console.log(`\n=== ${provider.type} ===`);
    try {
      const response = await provider.chat({
        dialogId: `compare-${provider.type}`,
        input: question,
      });
      console.log('回复:', response.content.substring(0, 200) + '...');
      console.log('Token 使用:', response.metadata.usage);
    } catch (error) {
      console.error(`${provider.type} 错误:`, error);
    }
  }
}

// 如果直接运行此文件，执行所有示例
if (require.main === module) {
  (async () => {
    console.log('=== 示例 1: 基本聊天 ===');
    await example1_basicChat();
    
    console.log('\n=== 示例 2: 流式响应 ===');
    await example2_streamChat();
    
    // 运行其他示例...
  })();
}

