'use client';
import { useTranslation } from 'react-i18next';

/**
 * 使用指定命名空间前缀的翻译钩子
 * @param keyPrefix 翻译键前缀
 * @returns 翻译函数
 */
export const useTranslate = (keyPrefix: string) => {
    return useTranslation('translation', { keyPrefix });
};

/**
 * 使用'common'命名空间前缀的翻译钩子
 * @returns 翻译函数
 */
export const useCommonTranslation = () => {
    return useTranslation('translation', { keyPrefix: 'common' });
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
        languages: ['en', 'zh'] // 支持的语言列表
    };
};
