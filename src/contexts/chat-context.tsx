"use client";
import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
    initialMessage: string | null;
    setInitialMessage: (message: string | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
    const [initialMessage, setInitialMessage] = useState<string | null>(null);

    return (
        <ChatContext.Provider value={{ initialMessage, setInitialMessage }}>
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
} 