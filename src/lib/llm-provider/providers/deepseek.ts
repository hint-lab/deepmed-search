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

      logger.info('[DeepSeek] Chat model selection', {
        isReason,
        selectedModel: model,
        reasonModel: this.reasonModel,
        normalModel: this.model,
        dialogId
      });

      const { text, usage } = await generateText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // 从文本中提取推理内容和实际内容
      let reasoningContent = '';
      let actualContent = text;

      if (isReason && text.includes('<think>') && text.includes('</think>')) {
        const thinkMatch = text.match(/<think>([\s\S]*?)<\/redacted_reasoning>/);
        if (thinkMatch) {
          reasoningContent = thinkMatch[1];
          actualContent = text.replace(/<think>[\s\S]*?<\/redacted_reasoning>/, '').trim();
        }
      }

      const response: ChatResponse = {
        content: actualContent,
        metadata: {
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
          reasoningContent: reasoningContent || undefined,
          usage: usage ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          } : undefined,
        },
      };

      history.addMessage({
        role: isReason ? MessageRole.ReasonReply : MessageRole.Assistant,
        content: actualContent,
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

      logger.info('[DeepSeek] ChatStream model selection', {
        isReason,
        selectedModel: model,
        reasonModel: this.reasonModel,
        normalModel: this.model,
        dialogId
      });

      const { fullStream, text, usage, reasoning } = await streamText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
      let accumulatedContent = '';
      let reasoningContent = '';
      let resolvedReasoning: string | undefined;
      let hasReasoningStarted = false;
      let hasTransitionedToContent = false;

      for await (const part of fullStream) {
        switch (part.type) {
          case 'reasoning': {
            const delta = part.textDelta ?? '';
            if (delta) {
              hasReasoningStarted = true;
              reasoningContent += delta;
              onChunk('[REASONING]' + delta);
            }
            break;
          }
          case 'reasoning-signature':
          case 'redacted-reasoning': {
            // ignore metadata-only reasoning parts
            break;
          }
          case 'text-delta': {
            const delta = part.textDelta ?? '';
            if (delta) {
              // 只在第一次从 reasoning 转换到 text 时发送转换消息
              if (isReason && hasReasoningStarted && !hasTransitionedToContent) {
                logger.info('[DeepSeek] Sending transition from reasoning to content');
                onChunk('[END_REASONING][CONTENT]');
                hasTransitionedToContent = true;
              }
              accumulatedContent += delta;
              onChunk(delta);
            }
            break;
          }
          case 'tool-call-streaming-start':
          case 'tool-call':
          case 'tool-call-delta':
          case 'source':
          case 'file':
          case 'step-start':
          case 'step-finish':
          case 'finish':
          case 'error': {
            logger.debug('[DeepSeek] Ignored fullStream part', {
              type: part.type,
            });
            break;
          }
          default: {
            logger.debug('[DeepSeek] Unhandled fullStream part', {
              type: (part as any)?.type,
            });
            break;
          }
        }
      }

      const finalText = accumulatedContent || await text;
      const finalUsage = await usage;

      // 如果流结束时还有 reasoning 但没有转换到 content，发送转换消息
      if (isReason && hasReasoningStarted && !hasTransitionedToContent && accumulatedContent.length === 0) {
        onChunk('[END_REASONING][CONTENT]');
      }

      if (isReason && reasoning) {
        try {
          resolvedReasoning = await reasoning;
        } catch (reasonError) {
          logger.warn('[DeepSeek] Failed to resolve reasoning promise', {
            error: reasonError instanceof Error ? reasonError.message : String(reasonError),
          });
        }
      }

      let finalReasoningContent = reasoningContent || resolvedReasoning || '';
      let finalActualContent = finalText;

      if (isReason && !finalReasoningContent) {
        const trimmed = finalText ?? '';
        const thinkPattern = /<think>([\s\S]*?)<\/think>/;
        const match = trimmed.match(thinkPattern);
        if (match && match[1]) {
          finalReasoningContent = match[1];
          finalActualContent = trimmed.replace(thinkPattern, '').trim();
        }
      }

      if (isReason && !finalReasoningContent) {
        logger.warn('[DeepSeek] No reasoning found after processing fullStream', {
          finalTextLength: finalText.length,
        });
      }

      if (isReason && finalReasoningContent) {
        finalReasoningContent = finalReasoningContent.trim();
      }

      const response: ChatResponse = {
        content: finalActualContent,
        metadata: {
          model,
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

