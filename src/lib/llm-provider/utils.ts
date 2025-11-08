import { CoreMessage } from 'ai';
import { Message, MessageRole } from './types';

/**
 * 将自定义消息类型转换为标准角色
 */
export function convertToStandardRole(role: string): 'system' | 'user' | 'assistant' | 'tool' {
  switch (role) {
    case MessageRole.Reason:
    case 'reason':
      return 'user';
    case MessageRole.ReasonReply:
    case 'reasonReply':
      return 'assistant';
    case MessageRole.User:
    case 'user':
      return 'user';
    case MessageRole.Assistant:
    case 'assistant':
      return 'assistant';
    case MessageRole.System:
    case 'system':
      return 'system';
    case MessageRole.Tool:
    case 'tool':
      return 'tool';
    default:
      return 'user';
  }
}

/**
 * 将消息列表转换为 CoreMessage 格式
 */
export function convertToCoreMessages(messages: Message[]): CoreMessage[] {
  return messages.map(msg => ({
    role: convertToStandardRole(msg.role),
    content: msg.content,
  })) as CoreMessage[];
}

/**
 * 过滤思考相关消息
 */
export function filterReasonMessages(messages: Message[]): Message[] {
  const filteredMessages = messages.filter(
    msg =>
      msg.role === 'system' ||
      msg.role === MessageRole.Reason ||
      msg.role === 'reason'
  );

  const result: Message[] = [];
  let lastRole: string | null = null;

  for (const msg of filteredMessages) {
    const currentRole = convertToStandardRole(msg.role);

    if (currentRole === 'system') {
      result.push(msg);
      continue;
    }

    if (currentRole === 'user' && lastRole !== 'user') {
      result.push(msg);
      lastRole = 'user';
      continue;
    }

    if (currentRole === 'assistant' && lastRole === 'user') {
      result.push(msg);
      lastRole = 'assistant';
      continue;
    }
  }

  if (result.length > 0 && convertToStandardRole(result[result.length - 1].role) !== 'user') {
    result.pop();
  }

  return result;
}

/**
 * 过滤非思考消息（移除推理内容）
 */
export function filterNonReasonMessages(messages: Message[]): Message[] {
  return messages
    .filter(
      msg =>
        msg.role !== MessageRole.Reason &&
        msg.role !== MessageRole.ReasonReply &&
        msg.role !== 'reason' &&
        msg.role !== 'reasonReply'
    )
    .map(msg => {
      if (msg.metadata?.reasoningContent) {
        const { metadata, ...rest } = msg;
        const { reasoningContent, ...restMetadata } = metadata;
        return {
          ...rest,
          metadata: Object.keys(restMetadata).length > 0 ? restMetadata : undefined,
        };
      }
      return msg;
    });
}

/**
 * 将工具定义转换为 AI SDK 格式
 */
export function convertToolsToAISDK(tools: any[]) {
  return tools.reduce((acc, tool) => {
    acc[tool.name] = {
      description: tool.description,
      parameters: tool.parameters,
      execute: tool.handler,
    };
    return acc;
  }, {} as Record<string, any>);
}

