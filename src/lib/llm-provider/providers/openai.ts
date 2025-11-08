import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';
import {
  ProviderType,
  OpenAIConfig,
  ChatOptions,
  ChatResponse,
  Provider,
  Message,
  MessageRole,
} from '../types';
import { MessageHistory } from '../history';
import {
  convertToCoreMessages,
  filterNonReasonMessages,
  convertToolsToAISDK,
} from '../utils';
import logger from '@/utils/logger';

/**
 * OpenAI 提供商实现
 */
export class OpenAIProvider implements Provider {
  readonly type = ProviderType.OpenAI;
  readonly model: string;
  readonly reasonModel?: string;
  
  private config: OpenAIConfig;
  private provider: ReturnType<typeof createOpenAI>;
  private historyMap: Map<string, MessageHistory>;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.model = config.model || 'gpt-4o-mini';
    
    this.provider = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      organization: config.organization,
    });
    
    this.historyMap = new Map();
    
    logger.info('[OpenAI] Provider initialized', {
      model: this.model,
    });
  }

  private getHistoryManager(dialogId: string): MessageHistory {
    if (!this.historyMap.has(dialogId)) {
      this.historyMap.set(
        dialogId,
        new MessageHistory(this.config.systemPrompt)
      );
    }
    return this.historyMap.get(dialogId)!;
  }

  setSystemPrompt(dialogId: string, prompt: string): void {
    const history = this.getHistoryManager(dialogId);
    history.clear();
    history.addMessage({
      role: MessageRole.System,
      content: prompt,
    });
  }

  clearHistory(dialogId: string): void {
    const history = this.getHistoryManager(dialogId);
    history.clear();
    if (this.config.systemPrompt) {
      history.addMessage({
        role: MessageRole.System,
        content: this.config.systemPrompt,
      });
    }
  }

  getHistory(dialogId: string): Message[] {
    return this.getHistoryManager(dialogId).getMessages();
  }

  async chat(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input } = options;
    const history = this.getHistoryManager(dialogId);

    history.addMessage({
      role: MessageRole.User,
      content: input,
    });

    try {
      const messages = filterNonReasonMessages(history.getMessages());

      const { text, usage } = await generateText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      const response: ChatResponse = {
        content: text,
        metadata: {
          model: this.model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          usage: usage ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: MessageRole.Assistant,
        content: text,
      });

      return response;
    } catch (error) {
      logger.error('[OpenAI] Chat error:', error);
      throw error;
    }
  }

  async chatStream(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, onChunk } = options;
    const history = this.getHistoryManager(dialogId);

    if (!onChunk) {
      throw new Error('onChunk handler is required for streaming');
    }

    history.addMessage({
      role: MessageRole.User,
      content: input,
    });

    try {
      const messages = filterNonReasonMessages(history.getMessages());

      const { textStream, text, usage } = await streamText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      for await (const chunk of textStream) {
        onChunk(chunk);
      }

      const finalText = await text;
      const finalUsage = await usage;

      const response: ChatResponse = {
        content: finalText,
        metadata: {
          model: this.model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          usage: finalUsage ? {
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
            totalTokens: finalUsage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: MessageRole.Assistant,
        content: finalText,
      });

      return response;
    } catch (error) {
      logger.error('[OpenAI] Chat stream error:', error);
      throw error;
    }
  }

  async chatWithTools(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, tools = [] } = options;
    const history = this.getHistoryManager(dialogId);

    history.addMessage({
      role: MessageRole.User,
      content: input,
    });

    try {
      const messages = filterNonReasonMessages(history.getMessages());
      const aiTools = convertToolsToAISDK(tools);

      const { text, toolCalls, usage } = await generateText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxSteps: 5,
      });

      const response: ChatResponse = {
        content: text,
        metadata: {
          model: this.model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          toolCalls: toolCalls?.map(tc => ({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: tc.args,
          })),
          usage: usage ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: MessageRole.Assistant,
        content: text,
      });

      return response;
    } catch (error) {
      logger.error('[OpenAI] Chat with tools error:', error);
      throw error;
    }
  }

  async chatWithToolsStream(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, tools = [], onChunk } = options;
    const history = this.getHistoryManager(dialogId);

    if (!onChunk) {
      throw new Error('onChunk handler is required for streaming');
    }

    history.addMessage({
      role: MessageRole.User,
      content: input,
    });

    try {
      const messages = filterNonReasonMessages(history.getMessages());
      const aiTools = convertToolsToAISDK(tools);

      const { textStream, text, toolCalls, usage } = await streamText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxSteps: 5,
      });

      for await (const chunk of textStream) {
        onChunk(chunk);
      }

      const finalText = await text;
      const finalToolCalls = await toolCalls;
      const finalUsage = await usage;

      const response: ChatResponse = {
        content: finalText,
        metadata: {
          model: this.model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          toolCalls: finalToolCalls?.map(tc => ({
            id: tc.toolCallId,
            name: tc.toolName,
            arguments: tc.args,
          })),
          usage: finalUsage ? {
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
            totalTokens: finalUsage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: MessageRole.Assistant,
        content: finalText,
      });

      return response;
    } catch (error) {
      logger.error('[OpenAI] Chat with tools stream error:', error);
      throw error;
    }
  }
}

