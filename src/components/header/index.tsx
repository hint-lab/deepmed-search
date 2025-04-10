'use client';

import { useSession, signOut } from "next-auth/react";
import { useTranslate } from "@/hooks/use-language";
import { Database, MessageCircle, Search, Cpu, FolderOpen, Menu, ChevronDown, Beaker, ListTodo, Upload, Brain, ServerCrash } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

export default function Header() {
    const { t } = useTranslate('nav');
    const session = useSession();
    const pathname = usePathname();

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
        },
        {
            name: "开发工具",
            icon: <Beaker className="h-5 w-5" />,
            dropdown: [
                {
                    name: "队列测试",
                    href: "/dev-tools/queue-test",
                    icon: <ListTodo className="h-4 w-4" />
                },
                {
                    name: "上传测试",
                    href: "/dev-tools/upload-test",
                    icon: <Upload className="h-4 w-4" />
                },
                {
                    name: "大模型测试",
                    href: "/dev-tools/model-test",
                    icon: <Cpu className="h-4 w-4" />
                },
                {
                    name: "MCP测试",
                    href: "/dev-tools/mcp-test",
                    icon: <ServerCrash className="h-4 w-4" />
                }
            ]
        },
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
                    <SheetContent side="left" className="w-60 sm:w-72">
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
                                                {item.dropdown.map((subItem, i) => (
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
                    <Link href="/" className="flex items-center">
                        <span className="text-lg lg:text-xl font-bold">DeepMed Search</span>
                    </Link>
                </div>

                {/* 桌面端导航 */}
                <nav className="hidden lg:flex items-center ml-6 space-x-4">
                    {navItems.map((item, index) => (
                        item.dropdown ? (
                            <DropdownMenu key={`dropdown-${index}`}>
                                <DropdownMenuTrigger asChild>
                                    <div className={cn(
                                        "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        pathname === item.href ? "bg-accent text-accent-foreground" : ""
                                    )}>
                                        {item.icon}
                                        <span className="ml-3">{item.name}</span>
                                        <ChevronDown className="ml-2 h-4 w-4" />
                                    </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {item.dropdown.map((subItem, i) => (
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
                                    "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
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
                                        <AvatarImage src={session?.data?.user?.image || "https://github.com/shadcn.png"} />
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
                                    {t("signOut", "退出登录")}
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