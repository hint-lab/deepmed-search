import { createOpenAI, OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
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
  filterReasonMessages,
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

    // 处理 baseURL：如果配置中有值，使用它；否则使用默认值
    // 注意：不能传递 undefined，因为 @ai-sdk/openai 可能会忽略它
    const baseURL = (config.baseUrl && typeof config.baseUrl === 'string' && config.baseUrl.trim())
      ? config.baseUrl.trim()
      : 'https://api.openai.com/v1'; // 明确使用默认值，而不是 undefined

    logger.info('[OpenAI] Provider initialized', {
      model: this.model,
      baseURL: baseURL,
      hasCustomBaseURL: config.baseUrl && config.baseUrl.trim() && config.baseUrl.trim() !== 'https://api.openai.com/v1',
      configBaseUrl: config.baseUrl || '(not provided)',
    });

    // 构建 createOpenAI 的配置对象
    const openAIConfig: Parameters<typeof createOpenAI>[0] = {
      apiKey: config.apiKey,
      baseURL: baseURL, // 总是传递一个有效的 URL
    };

    // 只有当 organization 存在时才添加
    if (config.organization) {
      openAIConfig.organization = config.organization;
    }

    // 支持 project 配置
    if (config.project) {
      openAIConfig.project = config.project;
    }

    this.provider = createOpenAI(openAIConfig);

    this.historyMap = new Map();
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

      logger.info('[OpenAI] ChatStream model selection', {
        isReason,
        selectedModel: this.model,
        dialogId
      });

      // 构建 providerOptions，根据官方文档使用 OpenAIResponsesProviderOptions
      const providerOptions: { openai?: OpenAIResponsesProviderOptions } = {};

      // 如果是推理模式，设置 reasoning 相关选项
      if (isReason) {
        providerOptions.openai = {
          // reasoningEffort 可以根据需要配置，默认为 'medium'
          // 注意：reasoningSummary 选项可能在不同版本的 SDK 中有所不同
        };
      }

      // 使用 fullStream 来获取 reasoning 事件（根据官方文档）
      const { fullStream, text, usage, reasoning } = await streamText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        providerOptions,
      });

      let accumulatedContent = '';
      let reasoningContent = '';
      let resolvedReasoning: string | undefined;
      let isProcessingReasoning = false;

      // 处理流式输出，根据官方文档，reasoning 事件会出现在 fullStream 中
      for await (const part of fullStream) {
        if (typeof part === 'string') {
          // 字符串类型的 chunk，直接作为文本内容
          const stringPart: string = part;
          accumulatedContent += stringPart;
          onChunk(stringPart);
          continue;
        }

        // 处理不同类型的流事件（根据 AI SDK 实际类型）
        switch (part.type) {
          case 'reasoning': {
            // reasoning 事件：推理内容（可能包含 textDelta 属性）
            isProcessingReasoning = true;
            if ('textDelta' in part && part.textDelta && typeof part.textDelta === 'string') {
              const textDelta: string = part.textDelta;
              reasoningContent += textDelta;
              onChunk('[REASONING]' + textDelta);
            }
            break;
          }
          case 'redacted-reasoning': {
            // redacted-reasoning 事件：隐藏的推理内容
            isProcessingReasoning = true;
            if ('textDelta' in part && part.textDelta && typeof part.textDelta === 'string') {
              const textDelta: string = part.textDelta;
              reasoningContent += textDelta;
              onChunk('[REASONING]' + textDelta);
            }
            break;
          }
          case 'text-delta': {
            // text-delta 事件：文本内容的增量
            // 如果之前在处理 reasoning，现在切换到文本内容，发送转换标记
            if (isProcessingReasoning) {
              isProcessingReasoning = false;
              onChunk('[END_REASONING][CONTENT]');
            }
            if ('textDelta' in part && part.textDelta && typeof part.textDelta === 'string') {
              const textDelta: string = part.textDelta;
              accumulatedContent += textDelta;
              onChunk(textDelta);
            }
            break;
          }
          case 'step-finish': {
            // step-finish 事件：步骤完成，可能表示推理结束
            if (isProcessingReasoning) {
              isProcessingReasoning = false;
              onChunk('[END_REASONING][CONTENT]');
            }
            break;
          }
          case 'finish': {
            // finish 事件：流结束
            if (isProcessingReasoning) {
              isProcessingReasoning = false;
              onChunk('[END_REASONING][CONTENT]');
            }
            break;
          }
          default: {
            // 忽略其他类型的事件
            logger.debug('[OpenAI] Ignored fullStream part', {
              type: part.type,
            });
          }
        }
      }

      const finalText = accumulatedContent || await text;
      const finalUsage = await usage;

      // 尝试从 reasoning Promise 中获取推理内容
      if (isReason && reasoning) {
        try {
          resolvedReasoning = await reasoning;
        } catch (reasonError) {
          logger.warn('[OpenAI] Failed to resolve reasoning promise', {
            error: reasonError instanceof Error ? reasonError.message : String(reasonError),
          });
        }
      }

      // 确定最终的推理内容和实际内容
      let finalReasoningContent = reasoningContent || resolvedReasoning || '';
      let finalActualContent = finalText;

      // 如果流式处理中没有获取到推理内容，尝试从最终文本中提取
      if (isReason && !finalReasoningContent && finalText) {
        // OpenAI o1 模型可能使用 <think> 标签
        const reasoningPatterns = [
          /<think>([\s\S]*?)<\/redacted_reasoning>/,
          /<reasoning>([\s\S]*?)<\/reasoning>/,
        ];

        for (const pattern of reasoningPatterns) {
          const match = finalText.match(pattern);
          if (match && match[1]) {
            finalReasoningContent = match[1];
            finalActualContent = finalText.replace(pattern, '').trim();
            logger.info('[OpenAI] Extracted reasoning from final text', {
              reasoningLength: finalReasoningContent.length,
              actualContentLength: finalActualContent.length,
            });
            break;
          }
        }
      }

      if (isReason && !finalReasoningContent) {
        logger.warn('[OpenAI] No reasoning found after processing fullStream', {
          finalTextLength: finalText.length,
          hasReasoningPromise: !!reasoning,
        });
      }

      if (isReason && finalReasoningContent) {
        finalReasoningContent = finalReasoningContent.trim();
      }

      const response: ChatResponse = {
        content: finalActualContent,
        metadata: {
          model: this.model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
          reasoningContent: isReason && finalReasoningContent ? finalReasoningContent : undefined,
          usage: finalUsage ? {
            promptTokens: finalUsage.promptTokens,
            completionTokens: finalUsage.completionTokens,
            totalTokens: finalUsage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: response.content,
        metadata: isReason && response.metadata.reasoningContent ? {
          reasoningContent: response.metadata.reasoningContent,
        } : undefined,
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

      // 根据官方文档，可以使用 providerOptions 配置工具调用选项
      const providerOptions: { openai?: OpenAIResponsesProviderOptions } = {
        openai: {
          parallelToolCalls: true, // 默认启用并行工具调用
        },
      };

      const { text, toolCalls, usage } = await generateText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxSteps: 5,
        providerOptions,
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

      // 根据官方文档，可以使用 providerOptions 配置工具调用选项
      const providerOptions: { openai?: OpenAIResponsesProviderOptions } = {
        openai: {
          parallelToolCalls: true, // 默认启用并行工具调用
        },
      };

      const { textStream, text, toolCalls, usage } = await streamText({
        model: this.provider(this.model),
        messages: convertToCoreMessages(messages),
        tools: aiTools,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        maxSteps: 5,
        providerOptions,
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

