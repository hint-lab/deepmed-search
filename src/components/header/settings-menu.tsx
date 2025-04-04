'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Monitor, Languages } from 'lucide-react';
import { useLanguageSwitcher } from '@/hooks/use-language';

export function SettingsMenu() {
    const { setTheme, theme } = useTheme();
    const { currentLanguage, changeLanguage } = useLanguageSwitcher();
    const [mounted, setMounted] = React.useState(false);

    // 在组件挂载后再渲染，避免hydration错误
    React.useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-2">
                        <span className="mr-2">
                            {currentLanguage === 'zh' && '语言'}
                            {currentLanguage === 'en' && 'Language'}
                            {currentLanguage === 'ja' && '言語'}
                        </span>
                        <Languages className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-50">
                    <DropdownMenuItem onClick={() => changeLanguage('zh')}>
                        🇨🇳
                        <span className="ml-2">简体中文</span>
                        {currentLanguage === 'zh' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('en')}>
                        🇺🇸
                        <span className="ml-2">English</span>
                        {currentLanguage === 'en' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('ja')}>
                        🇯🇵
                        <span className="ml-2">日本語</span>
                        {currentLanguage === 'ja' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="切换主题"
            >
                {mounted ? (
                    theme === 'light' ? (
                        <Sun className="h-5 w-5" />
                    ) : (
                        <Moon className="h-5 w-5" />
                    )
                ) : (
                    // 默认图标，防止hydration错误
                    <div className="h-5 w-5" />
                )}
            </Button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="px-2">
                        <span className="mr-2">
                            {currentLanguage === 'zh' && '设置'}
                            {currentLanguage === 'en' && 'Settings'}
                            {currentLanguage === 'ja' && '設定'}
                        </span>
                        <Settings className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-50">
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>
                            {currentLanguage === 'zh' && '浅色主题'}
                            {currentLanguage === 'en' && 'Light Theme'}
                            {currentLanguage === 'ja' && 'ライトテーマ'}
                        </span>
                        {mounted && theme === 'light' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>
                            {currentLanguage === 'zh' && '深色主题'}
                            {currentLanguage === 'en' && 'Dark Theme'}
                            {currentLanguage === 'ja' && 'ダークテーマ'}
                        </span>
                        {mounted && theme === 'dark' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>
                            {currentLanguage === 'zh' && '跟随系统'}
                            {currentLanguage === 'en' && 'System'}
                            {currentLanguage === 'ja' && 'システム'}
                        </span>
                        {mounted && theme === 'system' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 