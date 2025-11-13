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

      const { textStream, text, usage } = await streamText({
        model: this.provider(model),
        messages: convertToCoreMessages(messages),
        temperature: isReason ? undefined : this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      let fullContent = '';
      let reasoningContent = '';
      let inThinkTag = false;
      let buffer = '';

      for await (const chunk of textStream) {
        fullContent += chunk;

        // 如果是推理模式，需要解析 <think> 标签
        if (isReason) {
          buffer += chunk;

          // 检查是否进入 <think> 标签
          if (buffer.includes('<think>')) {
            const parts = buffer.split('<think>');
            if (parts[0]) {
              // <think> 之前的内容作为普通内容
              onChunk(parts[0]);
            }
            inThinkTag = true;
            buffer = parts.slice(1).join('<think>');
            continue;
          }

          // 检查是否退出 </think> 标签
          if (buffer.includes('</think>')) {
            const parts = buffer.split('</think>');
            if (inThinkTag && parts[0]) {
              // </think> 之前的内容作为推理内容
              reasoningContent += parts[0];
              onChunk('[REASONING]' + parts[0]);
            }
            inThinkTag = false;
            // 发送转换标记
            onChunk('[END_REASONING][CONTENT]');
            // 标签后的内容作为实际回复
            const contentAfterTag = parts.slice(1).join('</think>');
            buffer = contentAfterTag;

            // 处理标签后的普通内容（实际回复）
            if (buffer && buffer.trim()) {
              logger.info('[DeepSeek] Sending content after reasoning tag', {
                contentLength: buffer.length,
                contentPreview: buffer.substring(0, 100)
              });
              onChunk(buffer);
              buffer = '';
            } else {
              // 如果标签后没有内容，清空buffer，等待后续chunk
              logger.info('[DeepSeek] No content immediately after reasoning tag, waiting for more chunks');
              buffer = '';
            }
            // 注意：这里不continue，让后续chunk继续处理
          }

          // 如果在 <think> 标签内
          if (inThinkTag) {
            // 检查缓冲区是否足够大，可以确定不会再匹配到 </think>
            if (buffer.length > 10) {
              const safeContent = buffer.slice(0, -10);
              if (safeContent) {
                reasoningContent += safeContent;
                onChunk('[REASONING]' + safeContent);
              }
              buffer = buffer.slice(-10);
            }
          } else {
            // 不在标签内，检查缓冲区是否足够大
            if (buffer.length > 10) {
              const safeContent = buffer.slice(0, -10);
              if (safeContent) {
                onChunk(safeContent);
              }
              buffer = buffer.slice(-10);
            }
          }
        } else {
          // 非推理模式，直接发送
          onChunk(chunk);
        }
      }

      // 处理剩余的缓冲区内容
      if (isReason && buffer) {
        if (inThinkTag) {
          reasoningContent += buffer;
          onChunk('[REASONING]' + buffer);
        } else {
          onChunk(buffer);
        }
      }

      const finalText = await text;

      // 从最终文本中提取推理内容和实际内容
      let finalReasoningContent = '';
      let finalActualContent = finalText;

      if (isReason && finalText.includes('<think>') && finalText.includes('</think>')) {
        const thinkMatch = finalText.match(/<think>([\s\S]*?)<\/redacted_reasoning>/);
        if (thinkMatch) {
          finalReasoningContent = thinkMatch[1];
          // 移除整个标签（包括开始和结束标签）及其内容
          finalActualContent = finalText.replace(/<think>[\s\S]*?<\/redacted_reasoning>/, '').trim();
        }
        logger.info('[DeepSeek] Extracted reasoning content', {
          reasoningLength: finalReasoningContent.length,
          actualContentLength: finalActualContent.length,
          finalTextLength: finalText.length,
          hasActualContent: finalActualContent.length > 0
        });
      } else if (isReason) {
        // 如果没有找到标签，记录警告
        logger.warn('[DeepSeek] No reasoning tags found in response', {
          finalTextLength: finalText.length,
          finalTextPreview: finalText.substring(0, 200)
        });
      }

      const response: ChatResponse = {
        content: finalActualContent,
        metadata: {
          model,
          provider: this.type,
          timestamp: new Date().toISOString(),
          isReason,
          reasoningContent: finalReasoningContent || undefined,
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

