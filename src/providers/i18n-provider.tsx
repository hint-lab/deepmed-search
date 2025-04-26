'use client';

import React, { PropsWithChildren, useEffect, useState, useMemo } from 'react';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from '@/i18n/locales/en.json';
import zhTranslation from '@/i18n/locales/zh.json';
import jaTranslation from '@/i18n/locales/ja.json';

// 导入 LanguageContext
import { LanguageContext } from '@/contexts/language-context';

// --- i18next 初始化逻辑 ---
// 使用一个标记确保初始化只执行一次
let isI18nextInitialized = false;

i18next
    .use(LanguageDetector) // 使用语言检测器
    .use(initReactI18next) // 绑定 react-i18next
    .init({
        resources: {
            en: { translation: enTranslation },
            zh: { translation: zhTranslation },
            ja: { translation: jaTranslation },
        },
        fallbackLng: 'zh', // 未检测到语言时的回退语言
        interpolation: {
            escapeValue: false, // React 已内置防 XSS 功能
        },
        detection: {
            // 语言检测顺序
            order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            // 指定用于缓存检测到的语言的 key
            caches: ['localStorage'],
        },
    });
isI18nextInitialized = true;
// --- I18nProvider 组件 ---
export function I18nProvider({ children }: PropsWithChildren) {
    // 获取 i18next 实例 (useTranslation 必须在 i18next 初始化后调用)
    // 因此将其放在 Provider 组件内部
    const { i18n: i18nInstance } = useTranslation();
    const [mounted, setMounted] = useState(false);
    // 从 i18next 实例初始化语言状态
    const [currentLanguage, setCurrentLanguage] = useState(i18nInstance.language);
    const languages = useMemo(() => ['en', 'zh', 'ja'], []);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 监听 i18next 语言变化事件并更新 React 状态
    useEffect(() => {
        const handleLanguageChanged = (lng: string) => {
            setCurrentLanguage(lng);
        };
        // 注册监听器
        i18nInstance.on('languageChanged', handleLanguageChanged);
        // 组件加载时确保状态与 i18n 实例同步
        // (有时检测器可能在初始渲染后才设置好语言)
        setCurrentLanguage(i18nInstance.language);
        // 清理函数：组件卸载时移除监听器
        return () => {
            i18nInstance.off('languageChanged', handleLanguageChanged);
        };
    }, [i18nInstance]);

    const changeLanguage = (lang: string) => {
        if (languages.includes(lang)) {
            // 调用 i18next 的 changeLanguage 方法
            // 它会自动处理语言检测器的缓存（如 localStorage）
            i18nInstance.changeLanguage(lang);
        } else {
            console.warn(`Language "${lang}" is not supported.`);
        }
    };

    // 优化 context value，避免不必要的重渲染
    const contextValue = useMemo(() => ({
        currentLanguage,
        changeLanguage,
        languages
    }), [currentLanguage, languages]); // changeLanguage 引用通常是稳定的

    // 防止在服务器端渲染 Provider 内容或在客户端挂载前渲染
    // 避免因客户端语言检测导致的水合作用不匹配错误
    if (!mounted) {
        return null;
    }

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
}
