"use client";
import ProtectedRoute from "@/components/protected-route";
import ChatSidebar from "./components/sidebar";
import { ChatDialogProvider } from '@/contexts/chat-dialog-context';
import { KnowledgeBaseProvider } from '@/contexts/knowledgebase-context';
import { SidebarProvider, useSidebarContext } from '@/contexts/sidebar-context';
import { ChatProvider } from '@/contexts/chat-context';
import { cn } from "@/lib/utils";

// Inner layout component to access context
function ChatLayoutContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebarContext();

    return (
        <ChatProvider>
            {/* Sidebar is positioned absolutely by itself */}
            <ChatSidebar />
            {/* Content wrapper: Apply margin-left based on sidebar state */}
            <div className={cn(
                "relative flex-1 overflow-hidden transition-all duration-300 ease-in-out",
                isCollapsed ? "ml-12" : "ml-80" // Dynamic margin
            )}>
                {children}
            </div>
        </ChatProvider>
    );
}

export default function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ProtectedRoute>
            {/* Main container is relative, full height */}
            <main className="relative flex w-full h-screen overflow-hidden">
                {/* Providers wrap the content that needs context */}
                <SidebarProvider>
                    <ChatDialogProvider>
                        <KnowledgeBaseProvider>
                            {/* Render the inner component which handles sidebar/content layout */}
                            <ChatLayoutContent>{children}</ChatLayoutContent>
                        </KnowledgeBaseProvider>
                    </ChatDialogProvider>
                </SidebarProvider>
            </main>
        </ProtectedRoute>
    )
}
