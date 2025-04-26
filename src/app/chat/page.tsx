'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Zap, AlertTriangle, Bot } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
import { useChatContext } from '@/contexts/chat-context';
import { toast } from 'sonner';
import { useDialogContext } from '@/contexts/dialog-context';
import { useSession } from 'next-auth/react';
import { useChatInput } from '@/hooks/use-chat-input';

// Define a type for the initial prompt examples
interface PromptExample {
  titleKey: string;
  promptKey: string;
  icon: React.ElementType;
}

export default function ChatPage() {

  const { t } = useTranslate('chat');
  const router = useRouter();
  const { createDialog, isCreating } = useDialogContext();
  const { data: session } = useSession();
  const { } = useChatContext();
  const { handleSendMessage } = useChatInput();
  // Renamed createAndNavigate back to original name, it handles example clicks
  const handleExampleClick = async (promptKey: string) => {
    const messageContent = t(promptKey);
    if (!messageContent.trim() || isCreating) return; // Use isCreatingDialog for loading state

    try {
      if (!session?.user?.id) {
        throw new Error("用户未登录");
      }
      const defaultName = messageContent.split(' ').slice(0, 5).join(' ') || t('newChat');
      const newDialog = await createDialog({ name: defaultName, userId: session?.user?.id });

      if (!newDialog?.id) {
        throw new Error("Failed to create dialog");
      }
      handleSendMessage(messageContent);
      router.push(`/chat/${newDialog.id}`);
    } catch (error) {
      console.error("Failed to create dialog or navigate:", error);
      toast.error(t('createChatError', 'Failed to start chat. Please try again.'));
    }
  };

  // Definitions for examples, capabilities, limitations remain the same
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
    <div className="flex flex-col flex-1 bg-muted/30 overflow-hidden">
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
    </div>
  );
}
