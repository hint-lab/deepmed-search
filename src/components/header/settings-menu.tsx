'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Moon, Monitor, Globe, Languages } from 'lucide-react';

export function SettingsMenu() {
    const { setTheme, theme } = useTheme();
    const [language, setLanguage] = React.useState('zh');
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
                        <span className="mr-2">语言</span>
                        <Languages className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-50">
                    <DropdownMenuItem onClick={() => setLanguage('zh')}>
                        🇨🇳
                        <span>简体中文</span>
                        {language === 'zh' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('en')}>
                        🇺🇸
                        <span>English</span>
                        {language === 'en' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLanguage('ja')}>
                        🇯🇵
                        <span>日本語</span>
                        {language === 'ja' && <span className="ml-auto">✓</span>}
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
                        <span className="mr-2">设置</span>
                        <Settings className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-50">
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                        <Sun className="mr-2 h-4 w-4" />
                        <span>浅色主题</span>
                        {mounted && theme === 'light' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                        <Moon className="mr-2 h-4 w-4" />
                        <span>深色主题</span>
                        {mounted && theme === 'dark' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                        <Monitor className="mr-2 h-4 w-4" />
                        <span>跟随系统</span>
                        {mounted && theme === 'system' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
} 