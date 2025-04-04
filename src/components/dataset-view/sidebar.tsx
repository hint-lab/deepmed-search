'use client';

import Link from 'next/link';
import { usePathname, useParams, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Database, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export default function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { t } = useTranslation('translation', { keyPrefix: 'sidebar' });
    const params = useParams();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const routes = [
        {
            href: `/knowledge-base/dataset?id=${id}`,
            label: t('dataset'),
            icon: BookOpen,
        },
        {
            href: `/knowledge-base/settings?id=${id}`,
            label: t('settings'),
            icon: Settings,
        },
    ];

    return (
        <div className={cn('pb-12 bg-card', className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        {t('navigation')}
                    </h2>
                    <div className="space-y-1">
                        {routes.map((route) => (
                            <Button
                                key={route.href}
                                variant={pathname === route.href ? 'secondary' : 'ghost'}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link href={route.href}>
                                    <route.icon className="mr-2 h-4 w-4" />
                                    {route.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 