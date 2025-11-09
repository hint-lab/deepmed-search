'use client';

import { useTranslate } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { FileText, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button'

interface SidebarProps {
    className?: string;
    onSelect?: (type: any) => void;
    currentView?: any;
}

export default function Sidebar({ className, onSelect, currentView = 'table' }: SidebarProps) {
    const { t } = useTranslate('knowledgeBase');

    const handleClick = (type: any) => {
        onSelect?.(type);
    };

    return (
        <div className={cn('fixed top-14 bottom-0 w-64 py-4 bg-card', className)}>
            <div className="space-y-1 px-1">
                <Button
                    variant="ghost"
                    className={cn(
                        'flex justify-start items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer w-full',
                        currentView === 'table'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => handleClick('table')}
                >
                    <FileText className="mr-3 h-4 w-4" />
                    {t('documentTable')}
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        'flex justify-start items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer w-full',
                        currentView === 'snippets'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => handleClick('snippets')}
                >
                    <Search className="mr-3 h-4 w-4" />
                    {t('snippetSearch.title')}
                </Button>
                <Button
                    variant="ghost"
                    className={cn(
                        'flex justify-start items-center px-4 py-2 text-sm font-medium rounded-md cursor-pointer w-full',
                        currentView === 'settings'
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted'
                    )}
                    onClick={() => handleClick('settings')}
                >
                    <Settings className="mr-3 h-4 w-4" />
                    {t('settings.title')}
                </Button>
            </div>
        </div>
    );
} 