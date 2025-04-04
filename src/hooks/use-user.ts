'use client';

import { LanguageTranslationMap } from '@/constants/common';
import { IUserInfo } from '@/types/db/user-setting';
import { getUserInfo, updateUserSettings } from '@/actions/user';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ApiResponse } from '@/types/api';

/**
 * 获取用户信息
 */
export function useFetchUserInfo() {
    const { i18n } = useTranslation();
    const [data, setData] = useState<IUserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getUserInfo();
                if (result.success && result.data) {
                    i18n.changeLanguage(
                        LanguageTranslationMap[
                        result.data.language as keyof typeof LanguageTranslationMap
                        ]
                    );
                    const userData = {
                        ...result.data,
                        access_token: '',
                        color_schema: 'light',
                        create_date: result.data.createdAt.toISOString(),
                        create_time: result.data.createdAt.getTime(),
                        update_date: result.data.updatedAt.toISOString(),
                        update_time: result.data.updatedAt.getTime(),
                        is_active: 'true',
                        is_anonymous: 'false',
                        is_authenticated: 'true',
                        is_superuser: false,
                        last_login_time: result.data.updatedAt.toISOString(),
                        login_channel: 'web',
                        nickname: result.data.name || '',
                        password: '',
                        status: 'active'
                    } as IUserInfo;
                    setData(userData);
                }
            } catch (error) {
                console.error('获取用户信息失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [i18n]);

    return { data, isLoading };
}

/**
 * 更新用户设置
 */
export function useUpdateUserSettings() {
    const { t } = useTranslation();
    const [isPending, setIsPending] = useState(false);

    const updateSettings = async (data: { language?: string; new_password?: string }) => {
        setIsPending(true);
        try {
            const result = await updateUserSettings(data);
            if (result.success) {
                toast.success(t('message.modified'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setIsPending(false);
        }
    };

    return { updateSettings, isPending };
}

/**
 * 保存用户设置
 */
export const useSaveSetting = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const saveSetting = async (userInfo: { new_password: string } | Partial<IUserInfo>) => {
        setLoading(true);
        try {
            const result = await updateUserSettings(userInfo);
            if (result.success) {
                toast.success(t('message.modified'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, saveSetting };
};