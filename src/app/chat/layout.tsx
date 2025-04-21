"use client"
import ProtectedRoute from "@/components/protected-route";
import ChatSidebar from "./components/chat-sidebar";
import { useChatDialogList } from "@/hooks/use-chat";
import { useParams } from "next/navigation";
import { ChatInputArea } from "./components/chat-input-area";

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    const params = useParams();
    const currentDialogId = params.id as string | undefined;
    const { data: dialogs, isLoading: isLoadingDialogs } = useChatDialogList();

    return (
        <ProtectedRoute>
            <div className="fixed flex flex-col h-full w-full overflow-hidden">
                <div className="flex flex-1 pt-14 overflow-hidden">
                    <ChatSidebar
                        dialogs={dialogs}
                        isLoading={isLoadingDialogs}
                        currentDialogId={currentDialogId}
                    />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {children}
                        <ChatInputArea dialogId={currentDialogId} />
                    </main>
                </div>

            </div>
        </ProtectedRoute>
    )
}
