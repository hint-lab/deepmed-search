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

// 定义 ViewType
export type ViewType = 'files' | 'settings' | 'chat';

interface KnowledgeBaseContextType {
    knowledgeBases: IKnowledgeBase[]; // 列表使用 ListItem 类型
    isLoading: boolean;
    fetchKnowledgeBases: () => Promise<void>;
    createKnowledgeBase: (params: CreateIKnowledgeBaseParams) => Promise<IKnowledgeBase | null>; // 创建返回 ListItem
    updateKnowledgeBase: (id: string, name: string, description: string, language: string) => Promise<boolean>;
    deleteKnowledgeBase: (id: string) => Promise<boolean>;
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
    currentKnowledgeBaseId: string | null;
    setCurrentKnowledgeBaseId: (id: string | null) => Promise<void>; // 修改为异步以获取数据
    searchString: string;
    setSearchString: (search: string) => void;
    filteredKnowledgeBases: IKnowledgeBase[]; // 列表使用 ListItem 类型

    // 新增：当前选中的知识库详细信息
    currentKnowledgeBase: IKnowledgeBase | null;
    isLoadingCurrent: boolean; // 添加当前知识库加载状态
}

const KnowledgeBaseContext = createContext<KnowledgeBaseContextType | undefined>(undefined);

export function KnowledgeBaseProvider({ children }: { children: ReactNode }) {
    const [knowledgeBases, setKnowledgeBases] = useState<IKnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentView, setCurrentView] = useState<ViewType>('files');
    const [currentKnowledgeBaseId, _setCurrentKnowledgeBaseId] = useState<string | null>(null);
    const [searchString, setSearchString] = useState('');

    // 新增状态
    const [currentKnowledgeBase, setCurrentKnowledgeBase] = useState<IKnowledgeBase | null>(null);
    const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);

    const { userInfo } = useUser();
    const { t } = useTranslate('knowledge');

    const filteredKnowledgeBases = knowledgeBases.filter(kb =>
        kb.name?.toLowerCase().includes(searchString.toLowerCase()) // 添加可选链以防 name 未定义
    );

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
    }, [t]);

    // 修改 setCurrentKnowledgeBaseId 以获取数据
    const setCurrentKnowledgeBaseId = useCallback(async (id: string | null) => {
        _setCurrentKnowledgeBaseId(id);
        if (id) {
            setIsLoadingCurrent(true);
            setCurrentKnowledgeBase(null); // 清空旧数据
            try {
                const result = await getKnowledgeBaseAction(id);
                if (result.success && result.data) {
                    setCurrentKnowledgeBase(result.data as IKnowledgeBase);
                } else {
                    toast.error(t('fetchDetailError', '获取知识库详情失败'));
                    setCurrentKnowledgeBase(null);
                }
            } catch (error) {
                console.error('Error fetching knowledge base details:', error);
                toast.error(t('fetchDetailError', '获取知识库详情失败'));
                setCurrentKnowledgeBase(null);
            } finally {
                setIsLoadingCurrent(false);
            }
        } else {
            setCurrentKnowledgeBase(null); // ID 为 null 时清空
        }
    }, [t]);

    const createKnowledgeBase = useCallback(async (params: CreateIKnowledgeBaseParams) => {
        setIsCreating(true);
        try {
            const result = await createKnowledgeBaseAction(params);
            if (result.success && result.data) {
                toast.success(t('createSuccess', '知识库创建成功'));
                const newItem: IKnowledgeBase = {
                    id: result.data.id,
                    name: result.data.name,
                    description: result.data.description,
                    doc_num: 0,
                    updated_at: new Date(),
                    created_at: new Date(),
                    created_by: userInfo?.id || '',
                    chunk_num: 0,
                    parser_config: result.data.parser_config ?? null,
                    parser_id: result.data.parser_id ?? null,
                    permission: result.data.permission ?? null,
                    similarity_threshold: result.data.similarity_threshold ?? 0,
                    status: result.data.status ?? '',
                    tenant_id: result.data.tenant_id ?? null,
                    token_num: 0,
                    vector_similarity_weight: result.data.vector_similarity_weight ?? 0,
                    operator_permission: result.data.operator_permission ?? 0
                };
                setKnowledgeBases(prev => [newItem, ...prev]);
                return newItem;
            }
            throw new Error(result.error || t('createError', '创建失败'));
        } catch (error) {
            console.error('Error creating knowledge base:', error);
            toast.error(error instanceof Error ? error.message : t('createError', '创建失败'));
            return null;
        } finally {
            setIsCreating(false);
        }
    }, [t, userInfo?.id]);

    const updateKnowledgeBase = useCallback(async (id: string, name: string, description: string, language: string) => {
        setIsUpdating(true);
        try {
            // 假设 updateKnowledgeBaseAction 返回 { success: boolean, data?: { name: string, ... } }
            // 注意：根据实际 action 定义调整参数
            const result = await updateKnowledgeBaseAction(id, name, description, language);
            if (result.success) { // 检查 result.data 是否存在且包含 name
                toast.success(t('updateSuccess', '知识库更新成功'));
                const updatedName = result.data?.name ?? name; // 使用返回的名称或传入的名称
                setKnowledgeBases(prev => prev.map(kb =>
                    kb.id === id ? { ...kb, name: updatedName } : kb
                ));
                if (id === currentKnowledgeBaseId) {
                    setCurrentKnowledgeBase(prev => prev ? { ...prev, name: updatedName } : null);
                }
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
    }, [t, currentKnowledgeBaseId]);

    const deleteKnowledgeBase = useCallback(async (id: string) => {
        setIsDeleting(true);
        try {
            const result = await deleteKnowledgeBaseAction(id);
            if (result.success) {
                toast.success(t('deleteSuccess', '知识库删除成功'));
                setKnowledgeBases(prev => prev.filter(kb => kb.id !== id));
                // 如果删除的是当前知识库，清空 currentKnowledgeBase
                if (id === currentKnowledgeBaseId) {
                    setCurrentKnowledgeBase(null);
                    _setCurrentKnowledgeBaseId(null); // 也清空 ID
                }
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
    }, [t, currentKnowledgeBaseId]);

    useEffect(() => {
        fetchKnowledgeBases();
    }, [fetchKnowledgeBases]);

    return (
        <KnowledgeBaseContext.Provider value={{
            knowledgeBases,
            isLoading,
            fetchKnowledgeBases,
            createKnowledgeBase,
            updateKnowledgeBase,
            deleteKnowledgeBase,
            isCreating,
            isUpdating,
            isDeleting,
            currentView,
            setCurrentView,
            currentKnowledgeBaseId,
            setCurrentKnowledgeBaseId,
            searchString,
            setSearchString,
            filteredKnowledgeBases,
            currentKnowledgeBase,
            isLoadingCurrent
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
