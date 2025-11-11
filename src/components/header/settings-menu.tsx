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
import { Settings, Sun, Moon, Monitor, Globe, LogOut } from 'lucide-react';
import { useLanguageContext } from '@/contexts/language-context';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function SettingsMenu() {
    const { setTheme, theme } = useTheme();
    const { currentLanguage, changeLanguage } = useLanguageContext();
    const [mounted, setMounted] = React.useState(false);
    const router = useRouter();

    // 在组件挂载后再渲染，避免hydration错误
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleSignOut = async () => {
        await signOut({ redirect: false });
        router.push('/auth/login');
    };

    return (
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-9 lg:w-fit lg:px-2">
                        <Globe className="h-4 w-4" />
                        <span className="ml-2 hidden lg:inline">
                            {currentLanguage === 'zh' && '语言'}
                            {currentLanguage === 'en' && 'Language'}
                            {currentLanguage === 'ja' && '言語'}
                            {currentLanguage === 'ar' && 'اللغة'}
                            {currentLanguage === 'ko' && '언어'}
                            {currentLanguage === 'fr' && 'Langue'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] lg:w-[200px]">
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
                    <DropdownMenuItem onClick={() => changeLanguage('ar')}>
                        🇸🇦
                        <span className="ml-2">العربية</span>
                        {currentLanguage === 'ar' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('ko')}>
                        🇰🇷
                        <span className="ml-2">한국어</span>
                        {currentLanguage === 'ko' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => changeLanguage('fr')}>
                        🇫🇷
                        <span className="ml-2">Français</span>
                        {currentLanguage === 'fr' && <span className="ml-auto">✓</span>}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 lg:h-9 lg:w-fit lg:px-2">
                        <Settings className="h-4 w-4" />
                        <span className="ml-2 hidden lg:inline">
                            {currentLanguage === 'zh' && '设置'}
                            {currentLanguage === 'en' && 'Settings'}
                            {currentLanguage === 'ja' && '設定'}
                        </span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px] lg:w-[200px]">
                    <DropdownMenuItem onClick={() => router.push('/settings/llm')}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>
                            {currentLanguage === 'zh' && 'API 配置'}
                            {currentLanguage === 'en' && 'API Config'}
                            {currentLanguage === 'ja' && 'API 設定'}
                        </span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>
                            {currentLanguage === 'zh' && '退出登录'}
                            {currentLanguage === 'en' && 'Sign Out'}
                            {currentLanguage === 'ja' && 'ログアウト'}
                        </span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 lg:h-9"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="切换主题"
            >
                {mounted ? (
                    theme === 'light' ? (
                        <Sun className="h-4 w-4" />
                    ) : (
                        <Moon className="h-4 w-4" />
                    )
                ) : (
                    // 默认图标，防止hydration错误
                    <div className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
} 