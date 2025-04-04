'use client';

import { SettingsMenu } from "./settings-menu";
import { Database, MessageCircle, Search, Cpu, FolderOpen } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/hooks/use-language";

export default function Header() {
    const { t } = useTranslate('nav');

    const navItems = [
        {
            name: t('knowledgeBase'),
            href: "/knowledge-base",
            icon: <Database className="mr-2 h-5 w-5" />
        },
        {
            name: t('chat'),
            href: "/chat",
            icon: <MessageCircle className="mr-2 h-5 w-5" />
        },
        {
            name: t('search'),
            href: "/search",
            icon: <Search className="mr-2 h-5 w-5" />
        },
        {
            name: t('agent'),
            href: "/agent",
            icon: <Cpu className="mr-2 h-5 w-5" />
        },
        {
            name: t('fileManagement'),
            href: "/files",
            icon: <FolderOpen className="mr-2 h-5 w-5" />
        }
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-4 flex">
                    {/* Logo */}
                    <a className="m-6 flex items-center space-x-2" href="/">
                        <span className="text-xl font-bold sm:inline-block">
                            DeepMed Search
                        </span>
                    </a>
                </div>

                {/* 导航入口 */}
                <nav className="flex items-center space-x-1 md:space-x-2">
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
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="flex flex-1 items-center justify-end space-x-2">
                    <SettingsMenu />
                </div>
            </div>
        </header>
    );
}