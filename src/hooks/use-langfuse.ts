'use client';

import { ILangfuseConfig, ISetLangfuseConfigRequestBody } from '@/types/user-setting';
import { getLangfuseConfig, setLangfuseConfig, deleteLangfuseConfig } from '@/actions/user';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * 设置 Langfuse 配置
 */
export const useSetLangfuseConfig = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const setConfig = async (params: ISetLangfuseConfigRequestBody): Promise<ILangfuseConfig> => {
        setLoading(true);
        try {
            const result = await setLangfuseConfig(params);
            if (result.success) {
                toast.success(t('message.operated'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, setConfig };
};

/**
 * 删除 Langfuse 配置
 */
export const useDeleteLangfuseConfig = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const deleteConfig = async (): Promise<ILangfuseConfig> => {
        setLoading(true);
        try {
            const result = await deleteLangfuseConfig();
            if (result.success) {
                toast.success(t('message.deleted'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, deleteConfig };
};

/**
 * 获取 Langfuse 配置
 */
export const useFetchLangfuseConfig = () => {
    const [data, setData] = useState<ILangfuseConfig | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getLangfuseConfig();
                if (result.success && result.data) {
                    setData(result.data as ILangfuseConfig);
                }
            } catch (error) {
                console.error('获取 Langfuse 配置失败:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return { data, loading };
}; 