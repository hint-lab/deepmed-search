'use client';

import { ITenant } from '@/types/tenant';
import { IUser } from '@/types/user';
import { addTenantUser, deleteTenantUser, listTenantUsers, listTenant, agreeTenant } from '@/actions/tenant';
import { getTenantInfo } from '@/actions/user';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/contexts/language-context';

/**
 * 获取租户信息
 */
export function useFetchTenantInfo(showEmptyModelWarn = false) {
    const { t } = useTranslate("tenant");
    const router = useRouter();
    const [data, setData] = useState<ITenant | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
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
                    const tenantData: ITenant = {
                        ...result.data,
                        users: [],
                        knowledgeBases: [],
                    };
                    setData(tenantData);
                }
            } catch (error) {
                console.error('获取租户信息失败:', error);
                setData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [showEmptyModelWarn, router]);

    return { data, isLoading };
}

/**
 * 获取租户用户列表
 */
export const useListTenantUser = () => {
    const { data: tenantInfo } = useFetchTenantInfo();
    const [data, setData] = useState<IUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!tenantInfo?.id) {
            return;
        }
        setLoading(true);
        try {
            const result = await listTenantUsers(tenantInfo.id);
            if (result.success && result.data) {
                setData(result.data as IUser[]);
            }
        } catch (error) {
            console.error('获取租户用户列表失败:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tenantInfo?.id) {
            fetchData();
        } else {
            setLoading(false);
            setData([]);
        }
    }, [tenantInfo?.id]);

    return { data, loading, refetch: fetchData };
};

/**
 * 添加租户用户
 */
export const useAddTenantUser = () => {
    const { data: tenantInfo } = useFetchTenantInfo();
    const { t } = useTranslate('common');
    const [loading, setLoading] = useState(false);

    const addUser = async (email: string): Promise<IUser | null> => {
        if (!tenantInfo?.id) {
            toast.error('Tenant ID is missing');
            return null;
        };
        setLoading(true);
        try {
            const result = await addTenantUser({ tenantId: tenantInfo.id, email });
            if (result.success && result.data) {
                toast.success(t('message.added'));
                return result.data as IUser;
            }
            toast.error(result.error || 'Failed to add user');
            return null;
        } catch (error: any) {
            toast.error(error.message || 'An unexpected error occurred');
            return null;
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
    const { t } = useTranslate('common');
    const [loading, setLoading] = useState(false);

    const deleteUser = async ({
        userId,
        tenantId,
    }: {
        userId: string;
        tenantId?: string;
    }): Promise<boolean> => {
        const effectiveTenantId = tenantId ?? tenantInfo?.id;
        if (!effectiveTenantId) {
            toast.error('Tenant ID is missing');
            return false;
        }
        setLoading(true);
        try {
            const result = await deleteTenantUser({
                tenantId: effectiveTenantId,
                userId,
            });
            if (result.success) {
                toast.success(t('message.deleted'));
                return true;
            } else {
                toast.error(result.error || 'Failed to delete user');
                return false;
            }
        } catch (error: any) {
            toast.error(error.message || 'An unexpected error occurred');
            return false;
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
        setLoading(true);
        try {
            const result = await listTenant();
            if (result.success && result.data) {
                const tenantData: ITenant[] = result.data.map(tenant => ({
                    ...tenant,
                    users: [],
                    knowledgeBases: [],
                }));
                setData(tenantData);
            }
        } catch (error) {
            console.error('获取租户列表失败:', error);
            setData([]);
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
    const { t } = useTranslate('common');
    const [loading, setLoading] = useState(false);

    const agree = async (tenantId: string): Promise<ITenant | null> => {
        setLoading(true);
        try {
            const result = await agreeTenant(tenantId);
            if (result.success && result.data?.tenant) {
                toast.success(t('message.operated'));
                const agreedTenant: ITenant = {
                    ...result.data.tenant,
                    users: [],
                    knowledgeBases: [],
                };
                return agreedTenant;
            }
            toast.error(result.error || 'Failed to agree to tenant invitation');
            return null;
        } catch (error: any) {
            toast.error(error.message || 'An unexpected error occurred');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { loading, agree };
};