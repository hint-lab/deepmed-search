'use client';

import { IUserInfo } from '@/types/db/user-setting';
import { updateUserSettings } from '@/actions/user';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * 更新用户设置 Hook
 * @returns {
 *   updateSettings: Function;  // 更新用户设置的函数
 *   isPending: boolean;       // 更新状态
 * }
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
 * 保存用户设置 Hook
 * @returns {
 *   saveSetting: Function;    // 保存用户设置的函数
 *   loading: boolean;         // 保存状态
 * }
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