'use client';

import { ISystemStatus, IToken } from '@/types/user-setting';
import { getSystemStatus, getSystemVersion, getSystemTokenList, createSystemToken, removeSystemToken } from '@/actions/user';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * 获取系统状态
 */
export function useFetchSystemStatus() {
  const [data, setData] = useState<ISystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await getSystemStatus();
      if (result.success && result.data) {
        const statusData = {
          ...result.data,
          es: {
            status: 'ok',
            elapsed: 0,
            error: '',
            number_of_nodes: 1,
            active_shards: 1
          },
          storage: {
            status: 'ok',
            elapsed: 0,
            error: ''
          },
          database: {
            status: 'ok',
            elapsed: 0,
            error: ''
          },
          redis: {
            status: 'ok',
            elapsed: 0,
            error: '',
            pending: 0
          },
          task_executor_heartbeat: {},
          version: '',
          uptime: 0
        } as ISystemStatus;
        setData(statusData);
      }
    } catch (error) {
      console.error('获取系统状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, isLoading, refetch: fetchData };
}

/**
 * 获取系统版本
 */
export function useFetchSystemVersion() {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getSystemVersion();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (error) {
        console.error('获取系统版本失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, isLoading };
}

/**
 * 获取系统令牌列表
 */
export const useFetchSystemTokenList = () => {
  const [data, setData] = useState<IToken[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await getSystemTokenList();
      if (result.success && result.data) {
        setData(result.data as IToken[]);
      }
    } catch (error) {
      console.error('获取系统令牌列表失败:', error);
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
 * 删除系统令牌
 */
export const useRemoveSystemToken = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const removeToken = async (token: string) => {
    setLoading(true);
    try {
      const result = await removeSystemToken(token);
      if (result.success) {
        toast.success(t('message.deleted'));
        return result.data || [];
      }
      throw new Error(result.error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, removeToken };
};

/**
 * 创建系统令牌
 */
export const useCreateSystemToken = () => {
  const [loading, setLoading] = useState(false);

  const createToken = async (params: { name: string }) => {
    setLoading(true);
    try {
      const result = await createSystemToken(params);
      if (result.success) {
        return result.data || [];
      }
      throw new Error(result.error);
    } finally {
      setLoading(false);
    }
  };

  return { loading, createToken };
};
