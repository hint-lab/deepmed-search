import { ChatProvider } from '@/contexts/chat-context';
import ChatMessages from './components/chat-messages';
import { ChatInputArea } from '@/app/chat/components/chat-input';

interface ChatPageProps {
    params: {
        id: string;
    };
}

export default async function ChatPage({ params }: ChatPageProps) {
    const { id } = await params;
    return (
        <ChatProvider chatDialogId={params.id}>
            <div className="flex flex-col h-full">
                <ChatMessages dialogId={params.id} />
                <ChatInputArea dialogId={params.id} />
            </div>
        </ChatProvider>
    );
}
