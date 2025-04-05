'use client';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import ja from '@/i18n/locales/ja.json';

// 初始化 i18next
i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            zh: { translation: zh },
            ja: { translation: ja }
        },
        lng: typeof window !== 'undefined' ? localStorage.getItem('language') || 'zh' : 'zh',
        fallbackLng: 'zh',
        interpolation: {
            escapeValue: false
        }
    });

/**
 * 使用指定命名空间前缀的翻译钩子
 * @param keyPrefix 翻译键前缀
 * @returns 翻译函数
 */
export const useTranslate = (keyPrefix: string) => {
    return useTranslation('translation', { keyPrefix });
};

/**
 * 获取当前语言
 * @returns 当前使用的语言代码
 */
export const useCurrentLanguage = () => {
    const { i18n } = useTranslation();
    return i18n.language;
};

/**
 * 切换语言的钩子
 * @returns 当前语言和切换语言的函数
 */
export const useLanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        // 可选：保存语言选择到本地存储
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
    };

    return {
        currentLanguage: i18n.language,
        changeLanguage,
        languages: ['en', 'zh', 'ja'] // 支持的语言列表
    };
};
