'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { usePathname } from 'next/navigation';

// 导入翻译文件
import enTranslation from '@/i18n/locales/en.json';
import zhTranslation from '@/i18n/locales/zh.json';
import jaTranslation from '@/i18n/locales/ja.json';

// 确保 i18next 只初始化一次
if (!i18next.isInitialized) {
    i18next
        .use(LanguageDetector)
        .use(initReactI18next)
        .init({
            resources: {
                en: {
                    translation: enTranslation,
                },
                zh: {
                    translation: zhTranslation,
                },
                ja: {
                    translation: jaTranslation,
                },
            },
            fallbackLng: 'zh',
            interpolation: {
                escapeValue: false,
            },
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage'],
            },
        });
}

export function I18nProvider({ children }: PropsWithChildren) {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // 在客户端挂载前不渲染任何内容
    if (!mounted) {
        return null;
    }

    return <>{children}</>;
} 