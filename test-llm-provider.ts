// 测试 LLM Provider 是否正常工作
import { ProviderFactory, ProviderType } from './src/lib/llm-provider';

async function testProvider() {
  try {
    console.log('开始测试 DeepSeek Provider...');
    
    const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
    
    console.log('Provider 创建成功');
    console.log('Model:', provider.model);
    
    // 测试基本对话
    console.log('\n测试基本对话...');
    const response = await provider.chat({
      dialogId: 'test-' + Date.now(),
      input: '你好，请简单回复一下',
    });
    
    console.log('✅ 基本对话成功！');
    console.log('回复内容:', response.content);
    console.log('元数据:', response.metadata);
    
    // 测试流式对话
    console.log('\n测试流式对话...');
    let chunks: string[] = [];
    
    const streamResponse = await provider.chatStream({
      dialogId: 'test-stream-' + Date.now(),
      input: '用一句话介绍人工智能',
      onChunk: (chunk) => {
        chunks.push(chunk);
        process.stdout.write(chunk);
      }
    });
    
    console.log('\n✅ 流式对话成功！');
    console.log('总共收到', chunks.length, '个 chunks');
    console.log('完整内容:', streamResponse.content);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
      console.error('堆栈:', error.stack);
    }
  }
}

testProvider();

