import { Message, ChatHistory } from './types';

/**
 * 消息历史管理类
 */
export class MessageHistory implements ChatHistory {
  private messages: Message[] = [];

  constructor(systemPrompt?: string) {
    if (systemPrompt) {
      this.addMessage({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  getMessages(): Message[] {
    return this.messages;
  }

  clear(): void {
    this.messages = [];
  }

  /**
   * 获取最后 N 条消息
   */
  getLastMessages(count: number): Message[] {
    return this.messages.slice(-count);
  }

  /**
   * 获取消息数量
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * 根据角色过滤消息
   */
  filterByRole(role: string): Message[] {
    return this.messages.filter(msg => msg.role === role);
  }
}

