import ChatMessages from './components/chat-messages';
import { ChatInputArea } from './components/chat-input';
interface ChatPageProps {
    params: {
        id: string;
    };
}

export default async function ChatPage(props: ChatPageProps) {
    const { id } = await props.params;
    return (
        <div className="flex flex-col h-full w-full min-h-0">
            <ChatMessages dialogId={id} />
            <div className="flex-shrink-0 w-full">
                <ChatInputArea dialogId={id} />
            </div>
        </div>
    );
}
