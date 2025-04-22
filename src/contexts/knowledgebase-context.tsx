"use client"
import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { IKnowledgeBase, CreateIKnowledgeBaseParams, UpdateIKnowledgeBaseParams } from '@/types/knowledgebase';
import { useUser } from './user-context'; // 假设需要用户信息
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language'; // 假设需要翻译
import {
    createKnowledgeBaseAction,
    updateKnowledgeBaseAction,
    deleteKnowledgeBaseAction,
    listKnowledgeBasesAction,
    getKnowledgeBaseAction // 如果需要获取单个知识库信息
} from '@/actions/knowledgebase';

interface KnowledgeBaseContextType {
    knowledgeBases: IKnowledgeBase[]; // 使用列表项类型，更轻量
    isLoading: boolean;
    fetchKnowledgeBases: () => Promise<void>;
    getKnowledgeBaseById: (id: string) => Promise<IKnowledgeBase | null>; // 获取单个知识库详情
    createKnowledgeBase: (params: CreateIKnowledgeBaseParams) => Promise<IKnowledgeBase | null>;
    updateKnowledgeBase: (id: string, name: string, description: string, language: string) => Promise<boolean>; // 简化更新参数
    deleteKnowledgeBase: (id: string) => Promise<boolean>;
    switchViewType: (type: 'table' | 'settings') => void;
    viewType: 'table' | 'settings';
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export function KnowledgeBaseProvider({ children }: { children: ReactNode }) {
    const [knowledgeBases, setKnowledgeBases] = useState<IKnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [viewType, setViewType] = useState<'table' | 'settings'>('table');
    const { userInfo } = useUser(); // 示例：可能需要用户信息
    const { t } = useTranslate('knowledge'); // 示例：使用翻译

    // 获取知识库列表
    const fetchKnowledgeBases = useCallback(async () => {
        // 也许需要检查 userInfo?.id
        setIsLoading(true);
        try {
            // 使用 listKnowledgeBasesAction 获取基础列表
            const result = await listKnowledgeBasesAction({ page: 1, pageSize: 1000 }); // 获取足够多的数据或调整策略
            if (result.success && result.data) {
                setKnowledgeBases(result.data.items || []);
            } else {
                throw new Error(result.error || t('fetchListError', '获取知识库列表失败'));
            }
        } catch (error) {
            console.error('Error fetching knowledge bases:', error);
            toast.error(t('fetchListError', '获取知识库列表失败'));
            setKnowledgeBases([]); // 出错时清空列表
        } finally {
            setIsLoading(false);
        }
    }, [t]); // 依赖项根据实际情况调整

    // 获取单个知识库详情
    const getKnowledgeBaseById = useCallback(async (id: string): Promise<IKnowledgeBase | null> => {
        // 这个函数可以根据需要保留或移除，如果页面通常只需要列表，可以不需要它
        try {
            const result = await getKnowledgeBaseAction(id);
            if (result.success) {
                return result.data as IKnowledgeBase;
            }
            return null;
        } catch (error) {
            console.error('Error fetching knowledge base details:', error);
            return null;
        }
    }, []);


    // 创建知识库
    const createKnowledgeBase = useCallback(async (params: CreateIKnowledgeBaseParams): Promise<IKnowledgeBase | null> => {
        setIsCreating(true);
        try {
            const result = await createKnowledgeBaseAction(params);
            if (result.success && result.data) {
                toast.success(t('createSuccess', '知识库创建成功'));
                // 假设返回的数据包含足够的信息来构成  
                setKnowledgeBases(prev => [result.data, ...prev]);
                return result.data;
            }
            throw new Error(result.error || t('createError'));
        } catch (error) {
            console.error('Error creating knowledge base:', error);
            toast.error(error instanceof Error ? error.message : t('createError'));
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [t]);

    // 更新知识库 (只更新名称示例)
    const updateKnowledgeBase = useCallback(async (id: string, name: string, description: string, language: string): Promise<boolean> => {
        setIsUpdating(true);
        try {
            const result = await updateKnowledgeBaseAction(id, name, description, language); // 使用 action
            if (result.success && result.data) {
                toast.success(t('updateSuccess', '知识库更新成功'));
                setKnowledgeBases(prev => prev.map(kb =>
                    kb.id === id ? { ...kb, ...result.data } : kb
                ));
                return true;
            }
            throw new Error(result.error || t('updateError', '更新知识库失败'));
        } catch (error) {
            console.error('Error updating knowledge base:', error);
            toast.error(error instanceof Error ? error.message : t('updateError', '更新知识库失败'));
            return false;
        } finally {
            setIsUpdating(false);
        }
    }, [t]);

    // 删除知识库
    const deleteKnowledgeBase = useCallback(async (id: string): Promise<boolean> => {
        setIsDeleting(true);
        try {
            const result = await deleteKnowledgeBaseAction(id);
            if (result.success) {
                toast.success(t('deleteSuccess', '知识库删除成功'));
                setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
                return true;
            }
            throw new Error(result.error || t('deleteError', '删除知识库失败'));
        } catch (error) {
            console.error('Error deleting knowledge base:', error);
            toast.error(error instanceof Error ? error.message : t('deleteError', '删除知识库失败'));
            return false;
        } finally {
            setIsDeleting(false);
        }
    }, [t]);

    // 切换视图
    const switchViewType = useCallback((type: 'table' | 'settings') => {
        setViewType(type);
    }, []);

    // 初始加载知识库列表
    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    return (
        <KnowledgeBaseContext.Provider value={{
            knowledgeBases,
            isLoading,
            fetchKnowledgeBases,
            getKnowledgeBaseById,
            createKnowledgeBase,
            updateKnowledgeBase,
            deleteKnowledgeBase,
            switchViewType,
            viewType,
            isCreating,
            isUpdating,
            isDeleting
        }}>
            {children}
        </KnowledgeBaseContext.Provider>
    );
}

export function useKnowledgeBase() {
    const context = useContext(KnowledgeBaseContext);
    if (context === undefined) {
        throw new Error('useKnowledgeBase must be used within a KnowledgeBaseProvider');
    }
    return context;
}
