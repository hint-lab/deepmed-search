"use client"
import ProtectedRoute from "@/components/protected-route";
import ChatSidebar from "./components/chat-sidebar";
import { useParams } from "next/navigation";
import { ChatInputArea } from "./components/chat-input-area";
import { DialogProvider } from '@/contexts/dialog-context';
import { KnowledgeBaseProvider } from '@/contexts/knowledgebase-context';

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const currentDialogId = params.id as string | undefined;

    return (
        <ProtectedRoute>
            <div className="fixed flex flex-col h-full w-full overflow-hidden">
                <div className="flex flex-1 pt-14 overflow-hidden">
                    <DialogProvider>
                        <KnowledgeBaseProvider>
                            <ChatSidebar />
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {children}
                                <ChatInputArea dialogId={currentDialogId} />
                            </div>
                        </KnowledgeBaseProvider>
                    </DialogProvider>
                </div>

            </div>
        </ProtectedRoute>
    )
}
