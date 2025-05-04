import { Message, ChatHistory } from '../types'

export class MessageHistory implements ChatHistory {
    private messages: Message[] = []

    constructor(systemPrompt?: string) {
        if (systemPrompt) {
            this.addMessage({
                role: 'system',
                content: systemPrompt,
            })
        }
    }

    addMessage(message: Message): void {
        this.messages.push(message)
    }

    getMessages(): Message[] {
        return this.messages
    }

    clear(): void {
        this.messages = []
    }
} 