"use client"
import ProtectedRoute from "@/components/protected-route";
import ChatSidebar from "./components/sidebar";
import { ChatInputArea } from "./components/chat-input";
import { DialogProvider } from '@/contexts/dialog-context';
import { KnowledgeBaseProvider } from '@/contexts/knowledgebase-context';

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            <div className="fixed flex flex-col h-full w-full overflow-hidden">
                <div className="flex flex-1 pt-14 overflow-hidden">
                    <DialogProvider>
                        <KnowledgeBaseProvider>
                            <ChatSidebar />
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {children}
                                <ChatInputArea />
                            </div>
                        </KnowledgeBaseProvider>
                    </DialogProvider>
                </div>

            </div>
        </ProtectedRoute>
    )
}
