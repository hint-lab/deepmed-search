'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Lock, Bot, Settings as SettingsIcon, Search, FileText, Layers, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

const SETTINGS_NAVIGATION = [
  {
    name: 'LLM 配置',
    href: '/settings/llm',
    icon: Bot,
    description: '配置 LLM API Key',
  },
  {
    name: '搜索配置',
    href: '/settings/search',
    icon: Search,
    description: '配置搜索引擎 API',
  },
  {
    name: '嵌入服务',
    href: '/settings/embedding',
    icon: Layers,
    description: '配置向量嵌入服务',
  },
  {
    name: '文档解析器',
    href: '/settings/document',
    icon: FileText,
    description: '配置文档解析器',
  },
  // 可以添加更多设置页面
  // {
  //   name: '个人信息',
  //   href: '/settings/profile',
  //   icon: User,
  //   description: '管理个人信息',
  // },
  // {
  //   name: '密码安全',
  //   href: '/settings/security',
  //   icon: Lock,
  //   description: '修改密码',
  // },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  // 加载中状态
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录，不显示内容（会被重定向）
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pt-14">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            设置
          </h1>
          <p className="text-muted-foreground mt-2">
            管理您的账户设置和偏好
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 侧边导航 */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {SETTINGS_NAVIGATION.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{item.name}</div>
                      <div className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* 主内容区 */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

