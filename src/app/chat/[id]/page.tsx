import ChatMessages from './components/chat-messages';
import { ChatInputArea } from '@/app/chat/components/chat-input';
interface ChatPageProps {
    params: {
        id: string;
    };
}

export default async function ChatPage(props: ChatPageProps) {
    const { id } = await props.params;
    return (
        <div className="flex flex-col h-full pt-14">
            <ChatMessages dialogId={id} />
            <ChatInputArea dialogId={id} />
        </div>
    );
}
