'use client';

import { SettingsMenu } from "./settings-menu";
import { Database, MessageCircle, Search, Cpu, FolderOpen, Menu } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/use-language";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Header() {
    const { t } = useTranslate('nav');

    const navItems = [
        {
            name: t('knowledgeBase'),
            href: "/knowledge-base",
            icon: <Database className="h-5 w-5" />
        },
        {
            name: t('chat'),
            href: "/chat",
            icon: <MessageCircle className="h-5 w-5" />
        },
        {
            name: t('search'),
            href: "/search",
            icon: <Search className="h-5 w-5" />
        },
        {
            name: t('agent'),
            href: "/agent",
            icon: <Cpu className="h-5 w-5" />
        },
        {
            name: t('fileManagement'),
            href: "/files",
            icon: <FolderOpen className="h-5 w-5" />
        }
    ];

    return (
        <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center w-full px-4">
                {/* 移动端菜单按钮 */}
                <Sheet>
                    <SheetTrigger asChild className="lg:hidden">
                        <Button variant="ghost" size="icon" className="mr-2">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64">
                        <nav className="flex flex-col space-y-2 mt-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "transition-colors"
                                    )}
                                >
                                    {item.icon}
                                    <span className="ml-2">{item.name}</span>
                                </Link>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>

                {/* Logo */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center">
                        <span className="text-lg lg:text-xl font-bold">DeepMed Search</span>
                    </Link>
                </div>

                {/* 桌面端导航 */}
                <nav className="hidden lg:flex items-center ml-6 space-x-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                                "hover:bg-accent hover:text-accent-foreground",
                                "transition-colors"
                            )}
                        >
                            {item.icon}
                            <span className="ml-2">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                {/* 右侧设置区域 */}
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <SettingsMenu />
                    <Avatar className="h-8 w-8">
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        </header>
    );
}