'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Zap, AlertTriangle, Bot } from 'lucide-react';
import { useTranslate } from '@/hooks/use-language';
import ChatSidebar from './components/chat-sidebar';
import { useChatDialogList, useCreateChatDialog } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/contexts/user-context';
// Define a type for the initial prompt examples
interface PromptExample {
  titleKey: string;
  promptKey: string;
  icon: React.ElementType;
}

export default function ChatPage() {

  const { t } = useTranslate('chat');
  const { data: dialogs, isLoading: isLoadingDialogs } = useChatDialogList();
  const router = useRouter();
  const { createChatDialog, loading: isCreatingDialog } = useCreateChatDialog();
  const { userInfo } = useUser();
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue;
    setInputValue('');
    setIsProcessing(true);

    try {
      if (!userInfo?.id) {
        throw new Error("用户未登录");
      }
      const defaultName = messageToSend.split(' ').slice(0, 5).join(' ') || t('newChat');
      const newDialog = await createChatDialog({ name: defaultName, userId: userInfo.id });

      if (!newDialog?.id) {
        throw new Error("Failed to create dialog");
      }
      router.push(`/chat/${newDialog.id}`);
    } catch (error) {
      console.error("Failed to create dialog:", error);
      setInputValue(messageToSend);
    } finally {
      setIsProcessing(false);
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
    // 在输入框中自动聚焦，以便用户可以直接按 Enter 发送
    setTimeout(() => {
      const inputElement = document.querySelector('input[placeholder="' + t('messagePlaceholder') + '"]');
      if (inputElement instanceof HTMLInputElement) {
        inputElement.focus();
      }
    }, 100);
  };

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
    <div className="flex h-screen">
      <ChatSidebar dialogs={dialogs} isLoading={isLoadingDialogs} currentDialogId={undefined} />
      <div className="flex flex-col flex-1 bg-muted/30">
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
                    <Card key={`ex-${i}`} className="min-h-32 p-4 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer" onClick={() => handleExampleClick(ex.promptKey)}>
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
        <div className="border-t p-4 bg-background shadow-inner">
          <div className="flex items-center space-x-2 max-w-4xl mx-auto">
            <Input
              placeholder={t('messagePlaceholder')}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              className="flex-1 resize-none"
            />
            <Button onClick={handleSendMessage} disabled={isProcessing || !inputValue.trim()} aria-label={t('send')}>
              {isProcessing ? (
                <span className="animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-white rounded-full" role="status" aria-label="loading"></span>
              ) : t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
