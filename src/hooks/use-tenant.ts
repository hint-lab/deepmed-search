'use client';

import { ITenant, ITenantUser } from '@/types/db/user-setting';
import { addTenantUser, deleteTenantUser, listTenantUsers, listTenant, agreeTenant } from '@/actions/tenant';
import { getTenantInfo } from '@/actions/user';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ApiResponse } from '@/types/api';

/**
 * 获取租户信息
 */
export function useFetchTenantInfo(showEmptyModelWarn = false) {
    const { t } = useTranslation();
    const router = useRouter();
    const [data, setData] = useState<ITenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getTenantInfo();
                if (result.success && result.data) {
                    if (showEmptyModelWarn && (!result.data.embd_id || !result.data.llm_id)) {
                        toast.warning(t('setting.modelProvidersWarn'), {
                            action: {
                                label: t('common.confirm'),
                                onClick: () => router.push('/user-setting/model'),
                            },
                        });
                    }
                    const tenantData = {
                        ...result.data,
                        avatar: '',
                        delta_seconds: 0,
                        email: '',
                        nickname: result.data.name || '',
                        role: 'owner',
                        tenant_id: result.data.id,
                        update_date: result.data.updatedAt.toISOString()
                    } as ITenant;
                    setData(tenantData);
                }
            } catch (error) {
                console.error('获取租户信息失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [showEmptyModelWarn, t, router]);

    return { data, isLoading };
}

/**
 * 获取租户用户列表
 */
export const useListTenantUser = () => {
    const { data: tenantInfo } = useFetchTenantInfo();
    const [data, setData] = useState<ITenantUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!tenantInfo?.id) return;
        try {
            const result = await listTenantUsers(tenantInfo.id);
            if (result.success && result.data) {
                const userData = result.data.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    language: user.language,
                    createdAt: user.createdAt
                })) as ITenantUser[];
                setData(userData);
            }
        } catch (error) {
            console.error('获取租户用户列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tenantInfo?.id]);

    return { data, loading, refetch: fetchData };
};

/**
 * 添加租户用户
 */
export const useAddTenantUser = () => {
    const { data: tenantInfo } = useFetchTenantInfo();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const addUser = async (email: string): Promise<ITenantUser> => {
        if (!tenantInfo?.id) throw new Error('租户ID不存在');
        setLoading(true);
        try {
            const result = await addTenantUser({ tenantId: tenantInfo.id, email });
            if (result.success && result.data) {
                toast.success(t('message.added'));
                return {
                    id: result.data.id,
                    name: result.data.name,
                    email: result.data.email,
                    language: result.data.language,
                    createdAt: result.data.createdAt
                };
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, addUser };
};

/**
 * 删除租户用户
 */
export const useDeleteTenantUser = () => {
    const { data: tenantInfo } = useFetchTenantInfo();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const deleteUser = async ({
        userId,
        tenantId,
    }: {
        userId: string;
        tenantId?: string;
    }): Promise<void> => {
        if (!tenantId && !tenantInfo?.id) {
            throw new Error('租户ID不存在');
        }
        setLoading(true);
        try {
            const result = await deleteTenantUser({
                tenantId: tenantId ?? tenantInfo?.id as string,
                userId,
            });
            if (result.success) {
                toast.success(t('message.deleted'));
            } else {
                throw new Error(result.error);
            }
        } finally {
            setLoading(false);
        }
    };

    return { loading, deleteUser };
};

/**
 * 获取租户列表
 */
export const useListTenant = () => {
    const [data, setData] = useState<ITenant[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const result = await listTenant();
            if (result.success && result.data) {
                const tenantData = result.data.map(tenant => ({
                    ...tenant,
                    avatar: '',
                    delta_seconds: 0,
                    email: '',
                    nickname: tenant.name || '',
                    role: 'owner',
                    tenant_id: tenant.id,
                    update_date: tenant.updatedAt.toISOString()
                })) as ITenant[];
                setData(tenantData);
            }
        } catch (error) {
            console.error('获取租户列表失败:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return { data, loading, refetch: fetchData };
};

/**
 * 同意租户邀请
 */
export const useAgreeTenant = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const agree = async (tenantId: string): Promise<ITenant> => {
        setLoading(true);
        try {
            const result = await agreeTenant(tenantId);
            if (result.success && result.data) {
                toast.success(t('message.operated'));
                return {
                    id: result.data.id,
                    avatar: '',
                    delta_seconds: 0,
                    email: '',
                    nickname: result.data.name || '',
                    role: 'owner',
                    tenant_id: result.data.id,
                    update_date: result.data.updatedAt.toISOString(),
                    name: result.data.name || '',
                    createdAt: result.data.createdAt,
                    updatedAt: result.data.updatedAt
                };
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, agree };
};