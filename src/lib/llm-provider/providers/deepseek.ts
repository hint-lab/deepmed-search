import { createDeepSeek } from '@ai-sdk/deepseek';
import { generateText, streamText } from 'ai';
import {
  ProviderType,
  DeepSeekConfig,
  ChatOptions,
  ChatResponse,
  Provider,
  Message,
  MessageRole,
} from '../types';
import { MessageHistory } from '../history';
import {
  convertToCoreMessages,
  filterReasonMessages,
  filterNonReasonMessages,
  convertToolsToAISDK,
} from '../utils';
import logger from '@/utils/logger';

/**
 * DeepSeek 提供商实现
 */
export class DeepSeekProvider implements Provider {
  readonly type = ProviderType.DeepSeek;
  readonly model: string;
  readonly reasonModel: string;
  
  private config: DeepSeekConfig;
  private provider: ReturnType<typeof createDeepSeek>;
  private historyMap: Map<string, MessageHistory>;

  constructor(config: DeepSeekConfig) {
    this.config = config;
    this.model = config.model || 'deepseek-chat';
    this.reasonModel = config.reasonModel || 'deepseek-reasoner';
    
    this.provider = createDeepSeek({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    
    this.historyMap = new Map();
    
    logger.info('[DeepSeek] Provider initialized', {
      model: this.model,
      reasonModel: this.reasonModel,
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
    const { dialogId, input, isReason = false } = options;
    const history = this.getHistoryManager(dialogId);

    // 添加用户消息
    history.addMessage({
      role: isReason ? MessageRole.Reason : MessageRole.User,
      content: input,
    });

    try {
      const messages = isReason
        ? filterReasonMessages(history.getMessages())
        : filterNonReasonMessages(history.getMessages());

      const model = isReason ? this.reasonModel : this.model;
      const { text, usage } = await generateText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      const response: ChatResponse = {
        content: text,
        metadata: {
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
          usage: usage ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: text,
      });

      return response;
    } catch (error) {
      logger.error('[DeepSeek] Chat error:', error);
      throw error;
    }
  }

  async chatStream(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, isReason = false, onChunk } = options;
    const history = this.getHistoryManager(dialogId);

    if (!onChunk) {
      throw new Error('onChunk handler is required for streaming');
    }

    history.addMessage({
      role: isReason ? MessageRole.Reason : MessageRole.User,
      content: input,
    });

    try {
      const messages = isReason
        ? filterReasonMessages(history.getMessages())
        : filterNonReasonMessages(history.getMessages());

      const model = isReason ? this.reasonModel : this.model;
      const { textStream, text, usage } = await streamText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      let fullContent = '';
      for await (const chunk of textStream) {
        fullContent += chunk;
        onChunk(chunk);
      }

      const response: ChatResponse = {
        content: await text,
        metadata: {
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
          usage: (await usage) ? {
            promptTokens: (await usage).promptTokens,
            completionTokens: (await usage).completionTokens,
            totalTokens: (await usage).totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: response.content,
      });

      return response;
    } catch (error) {
      logger.error('[DeepSeek] Chat stream error:', error);
      throw error;
    }
  }

  async chatWithTools(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, isReason = false, tools = [] } = options;
    const history = this.getHistoryManager(dialogId);

    history.addMessage({
      role: isReason ? MessageRole.Reason : MessageRole.User,
      content: input,
    });

    try {
      const messages = isReason
        ? filterReasonMessages(history.getMessages())
        : filterNonReasonMessages(history.getMessages());

      const model = isReason ? this.reasonModel : this.model;
      const aiTools = convertToolsToAISDK(tools);

      const { text, toolCalls, usage } = await generateText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxSteps: 5,
      });

      const response: ChatResponse = {
        content: text,
        metadata: {
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
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
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: text,
      });

      return response;
    } catch (error) {
      logger.error('[DeepSeek] Chat with tools error:', error);
      throw error;
    }
  }

  async chatWithToolsStream(options: ChatOptions): Promise<ChatResponse> {
    const { dialogId, input, isReason = false, tools = [], onChunk } = options;
    const history = this.getHistoryManager(dialogId);

    if (!onChunk) {
      throw new Error('onChunk handler is required for streaming');
    }

    history.addMessage({
      role: isReason ? MessageRole.Reason : MessageRole.User,
      content: input,
    });

    try {
      const messages = isReason
        ? filterReasonMessages(history.getMessages())
        : filterNonReasonMessages(history.getMessages());

      const model = isReason ? this.reasonModel : this.model;
      const aiTools = convertToolsToAISDK(tools);

      const { textStream, text, toolCalls, usage } = await streamText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: isReason ? undefined : this.config.temperature,
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
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
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
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: finalText,
      });

      return response;
    } catch (error) {
      logger.error('[DeepSeek] Chat with tools stream error:', error);
      throw error;
    }
  }
}

