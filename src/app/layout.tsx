import { Inter } from 'next/font/google';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { SessionProvider } from '@/providers/session-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import '@/styles/globals.css';
import { Toaster } from "@/components/ui/sonner"
import Header from '@/components/header';
import { UserProvider } from '@/contexts/user-context';
import { initializeServer } from '@/lib/init-server';
import { ChatProvider } from '@/contexts/chat-context';

// 初始化服务器端服务
// 这只会在服务器端执行一次
initializeServer();

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
});


export const metadata = {
    title: 'DeepMed Search',
    description: 'DeepMed Search - Your AI Document Assistant',
};

// 根布局组件
export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // const session = await auth();
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased h-screen overflow-hidden`}>
                <SessionProvider>
                    <I18nProvider>
                        <NextThemeProvider attribute="class" defaultTheme="system" enableSystem>
                            <TooltipProvider>
                                <UserProvider>
                                    <ChatProvider>
                                        <div className="flex flex-col h-screen overflow-hidden">
                                            <Header />
                                            <main className="flex-1 overflow-auto  h-full">
                                                {children}
                                            </main>
                                        </div>
                                    </ChatProvider>
                                </UserProvider>
                            </TooltipProvider>
                        </NextThemeProvider>
                    </I18nProvider>
                </SessionProvider>
                <Toaster />
            </body>
        </html >
    );
} 