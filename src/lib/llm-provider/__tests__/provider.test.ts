/**
 * LLM Provider 单元测试
 * 
 * 注意：这些测试需要真实的 API 密钥才能运行
 * 在 CI/CD 环境中，可以使用 Mock 来避免真实调用
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  ProviderFactory,
  ProviderType,
  getDefaultProvider,
} from '../index';

describe('LLM Provider', () => {
  describe('ProviderFactory', () => {
    it('should create DeepSeek provider', () => {
      const provider = ProviderFactory.createDeepSeek({
        apiKey: 'test-key',
        model: 'deepseek-chat',
      });
      
      expect(provider).toBeDefined();
      expect(provider.type).toBe(ProviderType.DeepSeek);
      expect(provider.model).toBe('deepseek-chat');
    });

    it('should create OpenAI provider', () => {
      const provider = ProviderFactory.createOpenAI({
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });
      
      expect(provider).toBeDefined();
      expect(provider.type).toBe(ProviderType.OpenAI);
      expect(provider.model).toBe('gpt-4o-mini');
    });

    it('should create Google provider', () => {
      const provider = ProviderFactory.createGoogle({
        apiKey: 'test-key',
        model: 'gemini-2.0-flash-exp',
      });
      
      expect(provider).toBeDefined();
      expect(provider.type).toBe(ProviderType.Google);
      expect(provider.model).toBe('gemini-2.0-flash-exp');
    });

    it('should return singleton instance', () => {
      const provider1 = ProviderFactory.getProvider(ProviderType.DeepSeek);
      const provider2 = ProviderFactory.getProvider(ProviderType.DeepSeek);
      
      expect(provider1).toBe(provider2);
    });

    it('should get provider by model name', () => {
      const deepseekProvider = ProviderFactory.getProviderByModel('deepseek-chat');
      expect(deepseekProvider.type).toBe(ProviderType.DeepSeek);

      const openaiProvider = ProviderFactory.getProviderByModel('gpt-4o');
      expect(openaiProvider.type).toBe(ProviderType.OpenAI);

      const googleProvider = ProviderFactory.getProviderByModel('gemini-2.0-flash-exp');
      expect(googleProvider.type).toBe(ProviderType.Google);
    });

    it('should throw error for unsupported model', () => {
      expect(() => {
        ProviderFactory.getProviderByModel('unknown-model');
      }).toThrow();
    });
  });

  describe('Provider History', () => {
    it('should manage conversation history', () => {
      const provider = ProviderFactory.createDeepSeek({
        apiKey: 'test-key',
      });
      
      const dialogId = 'test-dialog';
      
      // Initially empty (except system prompt)
      let history = provider.getHistory(dialogId);
      expect(history.length).toBeGreaterThan(0);
      
      // Clear history
      provider.clearHistory(dialogId);
      
      // Set custom system prompt
      provider.setSystemPrompt(dialogId, 'You are a test assistant');
      history = provider.getHistory(dialogId);
      expect(history.length).toBe(1);
      expect(history[0].role).toBe('system');
    });
  });
});

// 集成测试（需要真实 API 密钥）
describe('LLM Provider Integration Tests', () => {
  // 跳过集成测试，除非在环境中设置了 RUN_INTEGRATION_TESTS
  const shouldRunIntegrationTests = process.env.RUN_INTEGRATION_TESTS === 'true';
  
  if (!shouldRunIntegrationTests) {
    it.skip('Integration tests are skipped', () => {});
    return;
  }

  it('should perform basic chat with DeepSeek', async () => {
    const provider = ProviderFactory.getProvider(ProviderType.DeepSeek);
    
    const response = await provider.chat({
      dialogId: 'integration-test',
      input: 'Say hello in one word',
    });
    
    expect(response.content).toBeDefined();
    expect(response.content.length).toBeGreaterThan(0);
    expect(response.metadata.model).toBeDefined();
    expect(response.metadata.provider).toBe(ProviderType.DeepSeek);
  });

  it('should perform streaming chat', async () => {
    const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
    
    let chunks: string[] = [];
    const response = await provider.chatStream({
      dialogId: 'integration-test-stream',
      input: 'Count from 1 to 5',
      onChunk: (chunk) => {
        chunks.push(chunk as string);
      },
    });
    
    expect(chunks.length).toBeGreaterThan(0);
    expect(response.content).toBeDefined();
  });

  it('should perform tool calling', async () => {
    const provider = ProviderFactory.getProvider(ProviderType.OpenAI);
    
    const tools = [
      {
        name: 'get_current_time',
        description: 'Get the current time',
        parameters: {
          type: 'object',
          properties: {},
        },
        handler: async () => {
          return { time: new Date().toISOString() };
        },
      },
    ];
    
    const response = await provider.chatWithTools({
      dialogId: 'integration-test-tools',
      input: 'What is the current time?',
      tools,
    });
    
    expect(response.content).toBeDefined();
    // Tool might or might not be called depending on the model
  });
});

