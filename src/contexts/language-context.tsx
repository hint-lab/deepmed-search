'use client';

import React, { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

// 定义 Context 类型
export interface LanguageContextType {
    currentLanguage: string;
    changeLanguage: (lang: string) => void;
    languages: string[];
}

// 创建 Context (初始值为 undefined，Provider 中会提供实际值)
export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Hook for accessing language context (currentLanguage, changeLanguage, languages).
 */
export const useLanguageContext = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        // 确保错误消息指向正确的 Provider
        throw new Error('useLanguageContext must be used within an I18nProvider');
    }
    return context;
};

/**
 * 使用指定命名空间前缀的翻译钩子，并提供语言切换功能
 * @param keyPrefix 翻译键前缀
 * @returns 包含翻译函数 `t`、i18n 实例、当前语言、切换语言函数和语言列表的对象
 */
export const useTranslate = (keyPrefix: string) => {
    // 1. 获取翻译函数和 i18n 实例
    const translationResult = useTranslation('translation', { keyPrefix });

    // 2. 从 Context 获取语言状态和切换函数
    const languageContext = useContext(LanguageContext);
    if (languageContext === undefined) {
        throw new Error(
            'useTranslate (including language context access) must be used within an I18nProvider'
        );
    }
    const { currentLanguage, changeLanguage, languages } = languageContext;

    // 3. 合并返回所有需要的值
    return {
        ...translationResult, // 包含 t 和 i18n
        currentLanguage,
        changeLanguage,
        languages,
    };
}; 