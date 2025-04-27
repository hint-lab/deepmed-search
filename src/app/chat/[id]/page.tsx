'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useChatContext } from '@/contexts/chat-context';
import ChatMessages from './components/chat-messages';

export default function ChatPage() {
    const params = useParams();
    const dialogId = params.id as string;
    const [error, setError] = useState<string | null>(null);

    const {
        loadChatHistory,
        isLoadingMessages,
        messages,
        initialMessage,
    } = useChatContext();

    // 使用ref保存loadChatHistory
    const loadChatHistoryRef = useRef(loadChatHistory);

    // 更新ref
    useEffect(() => {
        console.log("[ChatPage] 更新loadChatHistoryRef");
        loadChatHistoryRef.current = loadChatHistory;
    }, [loadChatHistory]);

    // 只在 dialogId 变化时加载历史
    useEffect(() => {
        console.log("[ChatPage] dialogId变化，开始加载历史. dialogId:", dialogId, "initialMessage:", initialMessage);

        if (!dialogId) {
            console.log("[ChatPage] 无效的对话ID，跳过加载");
            setError("无效的对话ID");
            return;
        }
        setError(null);

        console.log("[ChatPage] 开始调用loadChatHistory");
        // 使用ref中的函数
        loadChatHistoryRef.current(dialogId)
            .then(() => {
                console.log("[ChatPage] 历史加载成功，messages.length:", messages.length);
            })
            .catch((err) => {
                console.error("[ChatPage] 加载历史失败:", err);
                setError("加载聊天历史失败");
            });
    }, [dialogId]); // 只依赖dialogId

    useEffect(() => {
        console.log("[ChatPage] 消息状态更新，当前消息数量:", messages.length);
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto p-4">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                    <strong className="font-bold">错误：</strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            {isLoadingMessages && messages.length === 0 && (
                <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            )}
            <ChatMessages />

        </div>
    );
}
