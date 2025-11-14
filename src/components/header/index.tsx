'use client';

import { useSession, signOut } from "next-auth/react";
import { useTranslate } from "@/contexts/language-context";
import { Database, MessageCircle, Search, Microscope, FolderOpen, Menu, ChevronDown, Beaker, ListTodo, Upload, Brain, ServerCrash, File } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { SettingsMenu } from "./settings-menu";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type NavItem = {
    name: string;
    href: string;
    icon: React.ReactElement;
    dropdown?: {
        name: string;
        href: string;
        icon: React.ReactElement;
    }[];
};

export default function Header() {
    const { t } = useTranslate('nav');
    const session = useSession();
    const pathname = usePathname();
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // 避免 hydration 不匹配
    useEffect(() => {
        setMounted(true);
    }, []);

    // 根据主题选择 logo
    const currentTheme = mounted ? resolvedTheme : 'light';
    const logoSrc = currentTheme === 'dark' 
        ? '/assets/svg/logo-with-text-white.svg' 
        : '/assets/logo-with-text.svg';

    const navItems: NavItem[] = [
        {
            name: t('knowledgeBase'),
            href: "/knowledgebase",
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
            name: t('research'),
            href: "/research",
            icon: <Microscope className="h-5 w-5" />
        },
        // {
        //     name: "开发工具",
        //     icon: <Beaker className="h-5 w-5" />,
        //     dropdown: [
        //         {
        //             name: "数据库测试",
        //             href: "/dev-tools/database-test",
        //             icon: <File className="h-4 w-4" />
        //         },
        //         {
        //             name: "队列测试",
        //             href: "/dev-tools/queue-test",
        //             icon: <ListTodo className="h-4 w-4" />
        //         },
        //         {
        //             name: "上传测试",
        //             href: "/dev-tools/upload-test",
        //             icon: <Upload className="h-4 w-4" />
        //         },
        //         {
        //             name: "大模型测试",
        //             href: "/dev-tools/model-test",
        //             icon: <Cpu className="h-4 w-4" />
        //         },
        //         {
        //             name: "MCP测试",
        //             href: "/dev-tools/mcp-test",
        //             icon: <ServerCrash className="h-4 w-4" />
        //         },
        //         {
        //             name: "文档测试",
        //             href: "/dev-tools/document-test",
        //             icon: <File className="h-4 w-4" />
        //         }
        //     ]
        // },
    ];

    return (
        <header className="fixed top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center w-full px-4 flex-nowrap overflow-hidden">
                {/* 移动端菜单按钮 */}
                <Sheet>
                    <SheetTrigger asChild className="lg:hidden">
                        <Button variant="ghost" size="icon" className="mr-2">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent
                        side="left"
                        className="w-60 sm:w-72"
                        aria-label="导航菜单"
                        role="navigation"
                    >
                        <SheetHeader>
                            <SheetTitle className="flex items-center space-x-2">
                                <Image
                                    src={logoSrc}
                                    alt="DeepMed Search"
                                    width={105}
                                    height={6}
                                    className="h-7 w-auto"
                                    style={{ height: 'auto', width: 'auto' }}
                                />
                            </SheetTitle>
                            {/* <SheetDescription>网站导航菜单</SheetDescription> */}
                        </SheetHeader>
                        <div className="mb-4 py-4">
                            {/* Logo or other content */}
                        </div>
                        <div className="flex flex-col space-y-4">
                            <nav className="flex flex-col space-y-2 mt-6">
                                {navItems.map((item, index) => (
                                    item.dropdown ? (
                                        <DropdownMenu key={`mobile-dropdown-${index}`}>
                                            <DropdownMenuTrigger asChild>
                                                <div className={cn(
                                                    "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                                    pathname === item.href ? "bg-accent text-accent-foreground" : ""
                                                )}>
                                                    {item.icon}
                                                    <span className="ml-2">{item.name}</span>
                                                    <ChevronDown className="ml-2 h-4 w-4" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {item.dropdown.map((subItem: { name: string; href: string; icon: React.ReactElement }, i: number) => (
                                                    <DropdownMenuItem key={`mobile-dropdown-item-${index}-${i}`} asChild>
                                                        <Link
                                                            href={subItem.href}
                                                            className={cn(
                                                                "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
                                                                pathname === subItem.href ? "bg-accent text-accent-foreground" : ""
                                                            )}
                                                        >
                                                            {subItem.icon}
                                                            <span className="ml-2">{subItem.name}</span>
                                                        </Link>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : (
                                        <Link
                                            key={`mobile-link-${index}`}
                                            href={item.href}
                                            className={cn(
                                                "flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
                                                pathname === item.href ? "bg-accent text-accent-foreground" : ""
                                            )}
                                        >
                                            {item.icon}
                                            <span className="ml-2">{item.name}</span>
                                        </Link>
                                    )
                                ))}
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Logo */}
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                        <Image
                            src={logoSrc}
                            alt="DeepMed Search"
                            width="220"
                            height="12"
                            priority
                            style={{ height: 'auto' }}
                        />
                    </Link>
                </div>

                {/* 桌面端导航 */}
                <nav className="hidden lg:flex items-center ml-6 space-x-4 flex-nowrap overflow-hidden">
                    {navItems.map((item, index) => (
                        item.dropdown ? (
                            <DropdownMenu key={`dropdown-${index}`}>
                                <DropdownMenuTrigger asChild>
                                    <div className={cn(
                                        "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer whitespace-nowrap shrink-0",
                                        pathname === item.href ? "bg-accent text-accent-foreground" : ""
                                    )}>
                                        {item.icon}
                                        <span className="ml-3">{item.name}</span>
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {item.dropdown.map((subItem: { name: string; href: string; icon: React.ReactElement }, i: number) => (
                                        <DropdownMenuItem key={`dropdown-item-${index}-${i}`} asChild>
                                            <Link
                                                href={subItem.href}
                                                className={cn(
                                                    "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
                                                    pathname === subItem.href ? "bg-accent text-accent-foreground" : ""
                                                )}
                                            >
                                                {subItem.icon}
                                                <span className="ml-2">{subItem.name}</span>
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground whitespace-nowrap shrink-0",
                                    pathname === item.href ? "bg-accent text-accent-foreground" : ""
                                )}
                            >
                                {item.icon}
                                <span className="ml-3">{item.name}</span>
                            </Link>
                        )
                    ))}
                </nav>

                {/* 右侧设置区域 */}
                <div className="flex flex-1 items-center justify-end space-x-2">
                    <SettingsMenu />
                    {session?.status === "authenticated" ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={session?.data?.user?.image || "/assets/avatar/2.svg"} />
                                        <AvatarFallback>{session?.data?.user?.name?.[0] || "U"}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{session?.data?.user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {session?.data?.user?.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                >
                                    {t("signOut", "Logout")}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={() => window.location.href = '/login'}
                        >
                            {t("login", "登录")}
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}