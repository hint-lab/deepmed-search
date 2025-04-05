'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogList, useConversation, useSendMessage, useCreateDialog } from '@/hooks/use-chat';
import ChatSidebar from './components/chat-sidebar';
import ChatMessages from './components/chat-messages';
import { useTranslate } from '@/hooks/use-language';
import { Message } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Zap, AlertTriangle, Bot } from 'lucide-react';

// Define a type for local message state, allowing partial data for optimistic updates
type LocalMessage = Partial<Message> & { id: string; content: string; role: string; createdAt: Date };

// Define a type for the initial prompt examples
interface PromptExample {
  titleKey: string;
  promptKey: string;
  icon: React.ElementType;
}

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const dialogId = params.id as string | undefined;
  const { t } = useTranslate('chat');

  // Hooks
  const { data: dialogs, isLoading: isLoadingDialogs } = useDialogList();
  const { data: messages, isLoading: isLoadingMessages } = useConversation(dialogId || '');
  const { sendMessage, isPending: isSendingMessage } = useSendMessage();
  const { createDialog, isPending: isCreatingDialog } = useCreateDialog();

  // State
  const [inputValue, setInputValue] = useState('');
  const [currentMessages, setCurrentMessages] = useState<LocalMessage[]>([]);
  const [isProcessingFirstMessage, setIsProcessingFirstMessage] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Effect to update local messages when fetched data changes
  useEffect(() => {
    if (messages) {
      setCurrentMessages(messages as LocalMessage[]);
    } else if (!dialogId) {
      // Clear messages when navigating to the base chat page
      setCurrentMessages([]);
    }
  }, [messages, dialogId]);

  // Effect to scroll down when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [currentMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue;
    const tempUserMessageId = `temp-${Date.now()}`;

    const optimisticUserMessage: LocalMessage = {
      id: tempUserMessageId,
      content: messageToSend,
      role: 'user',
      createdAt: new Date(),
    };

    setCurrentMessages(prev => [...prev, optimisticUserMessage]);
    setInputValue('');

    let currentDialogId = dialogId;

    try {
      if (!currentDialogId) {
        setIsProcessingFirstMessage(true);
        const defaultName = messageToSend.split(' ').slice(0, 5).join(' ') || t('newChat');
        const newDialog = await createDialog({ name: defaultName });

        if (!newDialog?.id) {
          throw new Error("Failed to create dialog");
        }
        currentDialogId = newDialog.id;
        router.push(`/chat/${currentDialogId}`, { scroll: false });
        setCurrentMessages(prev => prev.map(msg =>
          msg.id === tempUserMessageId ? { ...msg, dialogId: currentDialogId } : msg
        ));
      }

      const aiResponse = await sendMessage(currentDialogId!, messageToSend);
      setCurrentMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId));
      router.refresh();

    } catch (error) {
      console.error("Failed to send message or create dialog:", error);
      setCurrentMessages(prev => prev.filter(msg => msg.id !== tempUserMessageId));
      setInputValue(messageToSend);
    } finally {
      setIsProcessingFirstMessage(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Function to handle clicking on an example prompt
  const handleExampleClick = (promptKey: string) => {
    const promptText = t(promptKey);
    setInputValue(promptText);
    // Optionally, trigger send immediately?
    // handleSendMessage(); // Uncomment to send immediately
  };

  const isLoading = isLoadingMessages || isLoadingDialogs;
  const isSending = isSendingMessage || isProcessingFirstMessage;

  // Define example prompts/capabilities
  const examples: PromptExample[] = [
    { titleKey: 'examples.title1', promptKey: 'examples.prompt1', icon: Lightbulb },
    { titleKey: 'examples.title2', promptKey: 'examples.prompt2', icon: Lightbulb },
  ];
  const capabilities = [
    { titleKey: 'capabilities.title1', promptKey: 'capabilities.desc1', icon: Zap },
    { titleKey: 'capabilities.title2', promptKey: 'capabilities.desc2', icon: Bot },
  ];
  const limitations = [
    { titleKey: 'limitations.title1', promptKey: 'limitations.desc1', icon: AlertTriangle },
    { titleKey: 'limitations.title2', promptKey: 'limitations.desc2', icon: AlertTriangle },
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar dialogs={dialogs} isLoading={isLoadingDialogs} currentDialogId={dialogId} />
      <div className="flex flex-col flex-1 bg-muted/30">
        {/* Main chat area or initial screen */}
        {dialogId ? (
          // Existing Chat View
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4 pb-4">
              {isLoading && !currentMessages.length ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="h-16 w-3/4 self-end bg-primary/10" />
                  <Skeleton className="h-16 w-1/2" />
                </div>
              ) : (
                <ChatMessages messages={currentMessages} />
              )}
            </div>
          </ScrollArea>
        ) : (
          // Initial Screen when no dialog is selected
          <div className="flex flex-col items-center justify-center flex-1 p-8 overflow-auto">
            <div className="max-w-4xl w-full">
              <h1 className="text-2xl lg:text-3xl font-semibold text-center mb-10">
                {t('welcomeTitle', 'How can I help you today?')}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Examples */}
                <div className="space-y-4">
                  <h2 className="text-center font-medium text-lg">{t('examples.heading', 'Examples')}</h2>
                  {examples.map((ex, i) => {
                    const Icon = ex.icon;
                    return (
                      <Card key={`ex-${i}`} className="min-h-32 p-4 bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium mb-1">{t(ex.titleKey)}</p>
                            <p className="text-xs text-muted-foreground">{t(ex.promptKey)}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                {/* Capabilities */}
                <div className="space-y-4">
                  <h2 className="text-center font-medium text-lg">{t('capabilities.heading', 'Capabilities')}</h2>
                  {capabilities.map((cap, i) => {
                    const Icon = cap.icon;
                    return (
                      <Card key={`cap-${i}`} className="min-h-32 p-4 bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium mb-1">{t(cap.titleKey)}</p>
                            <p className="text-xs text-muted-foreground">{t(cap.promptKey)}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                {/* Limitations */}
                <div className="space-y-4">
                  <h2 className="text-center font-medium text-lg">{t('limitations.heading', 'Limitations')}</h2>
                  {limitations.map((lim, i) => {
                    const Icon = lim.icon;
                    return (
                      <Card key={`lim-${i}`} className="min-h-32 p-4 bg-background/50 hover:bg-background/80 transition-colors">
                        <div className="flex items-start gap-3">
                          <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium mb-1">{t(lim.titleKey)}</p>
                            <p className="text-xs text-muted-foreground">{t(lim.promptKey)}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Always visible */}
        <div className="border-t p-4 bg-background shadow-inner mt-auto"> {/* Ensure input is at bottom */}
          <div className="flex items-center space-x-2 max-w-4xl mx-auto"> {/* Center input area */}
            <Input
              placeholder={t('messagePlaceholder')}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="flex-1 resize-none"
            />
            <Button onClick={handleSendMessage} disabled={isSending || !inputValue.trim()} aria-label={t('send')}>
              {isSending ? (
                <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></span>
              ) : t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
