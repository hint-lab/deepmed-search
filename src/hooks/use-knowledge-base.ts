"use client";
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    IKnowledgeBase,
    ITestingResult,
    IKnowledgeListItem,
    ICreateKnowledgeParams,
    IUpdateKnowledgeParams,
    ISearchKnowledgeParams,
    ISearchKnowledgeResult
} from '@/types/knowledgebase';
import { IRenameTag } from '@/types/tag';
import { usePagination } from '@/hooks/use-pagination';
import {
    createKnowledgeBaseAction,
    updateKnowledgeBaseAction,
    deleteKnowledgeBaseAction,
    getKnowledgeBaseAction,
    listKnowledgeBasesAction,
    getKnowledgeBaseDetailAction,
    getKnowledgeListAction,
    listTagAction,
    removeTagAction,
    renameTagAction,
    getKnowledgeGraphAction,
    getKnowledgeBaseListAction
} from '@/actions/knowledgebase';
import { z } from 'zod';

/**
 * 知识库表单验证模式
 */
const formSchema = z.object({
    name: z.string().min(1, "请输入知识库名称"),
});

type FormValues = z.infer<typeof formSchema>;

/**
 * 搜索知识库的 Hook
 * @returns 搜索字符串和输入处理函数
 */
export const useSearchKnowledge = () => {
    const [searchString, setSearchString] = useState<string>('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchString(e.target.value);
    };
    return {
        searchString,
        handleInputChange,
    };
};

/**
 * 获取当前知识库 ID 的 Hook
 * @returns 从 URL 参数中获取的知识库 ID
 */
export const useKnowledgeBaseId = (): string => {
    const params = useParams();
    return params?.id as string || '';
};

/**
 * 获取当前知识库 ID 的 Hook
 * @returns 从 URL 参数中获取的知识库 ID
 */
export const useKnowledgeBaseInfo = () => {
    const kbId = useKnowledgeBaseId();
    const [data, setData] = useState<IKnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!kbId) return;
            try {
                const result = await getKnowledgeBaseAction(kbId);
                if (result.success) {
                    setData(result.data as IKnowledgeBase);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [kbId]);

    return { data, loading };
}

/**
 * 保存知识库的 Hook
 * @returns 对话框状态、加载状态和创建知识库的处理函数
 */
export const useSaveKnowledgeBase = () => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const showDialog = useCallback(() => {
        setVisible(true);
    }, []);

    const hideDialog = useCallback(() => {
        setVisible(false);
    }, []);

    const onCreateOk = useCallback(async (name: string) => {
        try {
            setLoading(true);
            const result = await createKnowledgeBaseAction({ name });
            if (result.success) {
                hideDialog();
                window.location.reload();
            }
            return result;
        } catch (error) {
            console.error(error);
            return { success: false, error: '创建失败' };
        } finally {
            setLoading(false);
        }
    }, [hideDialog]);

    return {
        visible,
        loading,
        showDialog,
        hideDialog,
        onCreateOk,
    };
};

/**
 * 获取知识库配置的 Hook
 * @returns 知识库配置数据和加载状态
 */
export const useFetchKnowledgeBaseConfiguration = () => {
    const kbId = useKnowledgeBaseId();
    const [data, setData] = useState<IKnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!kbId) return;
            try {
                const result = await getKnowledgeBaseAction(kbId);
                if (result.success) {
                    setData(result.data as IKnowledgeBase);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [kbId]);

    return { data, loading };
};

/**
 * 获取知识库列表的基础版本 Hook
 * @returns 知识库列表和加载状态
 */
export const useFetchKnowledgeBaseList = () => {
    const [list, setList] = useState<IKnowledgeListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await listKnowledgeBasesAction();
                if (result.success) {
                    setList(result.data?.items || []);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return { list, loading };
};

/**
 * 获取知识库选项的 Hook
 * @returns 用于下拉选择框的知识库选项列表
 */
export const useSelectKnowledgeOptions = () => {
    const { list } = useFetchKnowledgeBaseList();

    const options = list?.map((item: IKnowledgeListItem) => ({
        label: item.name,
        value: item.id,
    }));

    return options;
};

/**
 * 获取知识库列表的高级版本 Hook（带分页和搜索功能）
 * @returns 知识库列表、加载状态、分页信息和搜索功能
 */
export const useFetchKnowledgeBaseListWithPagination = () => {
    const [searchString, setSearchString] = useState('');
    const [page, setPage] = useState(1);
    const [list, setList] = useState<IKnowledgeListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 获取数据的回调函数
    const fetchData = useCallback(async (pageNum: number) => {
        try {
            setLoading(true);
            const params: ISearchKnowledgeParams = {
                keyword: searchString,
                page: pageNum,
                pageSize: 10
            };
            const result = await listKnowledgeBasesAction(params);

            if (result.success && result.data) {
                const searchResult = result.data;
                if (pageNum === 1) {
                    setList(searchResult.items);
                } else {
                    setList(prev => [...prev, ...searchResult.items]);
                }
                setHasNextPage(searchResult.items.length === searchResult.pageSize);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('获取知识库列表失败:', error);
        } finally {
            setLoading(false);
        }
    }, [searchString]);

    // 获取下一页数据的回调函数
    const fetchNextPage = useCallback(() => {
        if (!loading && hasNextPage) {
            fetchData(page + 1);
        }
    }, [fetchData, loading, hasNextPage, page]);

    // 处理搜索输入变化的回调函数
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchString(e.target.value);
        setPage(1);
        setHasNextPage(true);
        fetchData(1);
    }, [fetchData]);

    // 监听滚动事件，实现无限加载
    useEffect(() => {
        const handleScroll = () => {
            if (!scrollRef.current || loading || !hasNextPage) return;

            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollHeight - scrollTop <= clientHeight * 1.5) {
                fetchNextPage();
            }
        };

        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScroll);
            return () => scrollElement.removeEventListener('scroll', handleScroll);
        }
    }, [fetchNextPage, loading, hasNextPage]);

    // 初始加载数据
    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    return {
        list,
        loading,
        hasNextPage,
        searchString,
        handleInputChange,
        fetchNextPage,
        scrollRef,
    };
};

/**
 * 创建知识库的 Hook
 * @returns 创建知识库的处理函数和加载状态
 */
export const useCreateKnowledgeBase = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const createKnowledgeBase = async (params: ICreateKnowledgeParams) => {
        setLoading(true);
        try {
            const result = await createKnowledgeBaseAction(params);
            if (result.success) {
                router.push(`/knowledgebase/${result.data.id}?tab=settings`);
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { createKnowledgeBase, loading };
};

/**
 * 更新知识库的 Hook
 * @returns 更新知识库的处理函数和加载状态
 */
export const useUpdateKnowledgeBase = () => {
    const kbId = useKnowledgeBaseId();
    const [loading, setLoading] = useState(false);

    const updateKnowledgeBase = async (params: IUpdateKnowledgeParams) => {
        if (!kbId || !params.name) return;
        setLoading(true);
        try {
            const result = await updateKnowledgeBaseAction(kbId, params.name);
            if (result.success) {
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { updateKnowledgeBase, loading };
};

/**
 * 删除知识库的 Hook
 * @returns 删除知识库的处理函数和加载状态
 */
export const useDeleteKnowledgeBase = () => {
    const [loading, setLoading] = useState(false);

    const deleteKnowledgeBase = async (id: string) => {
        setLoading(true);
        try {
            const result = await deleteKnowledgeBaseAction(id);
            return result;
        } finally {
            setLoading(false);
        }
    };

    return { deleteKnowledgeBase, loading };
};


/**
 * 测试是否成功的 Hook
 * @returns 测试是否成功的状态
 */
export const useSelectIsTestingSuccess = () => {
    const [isSuccess, setIsSuccess] = useState(false);
    return isSuccess;
};

//#endregion

//#region tags
/**
 * 重命名标签的 Hook
 * @returns 重命名标签的处理函数和加载状态
 */
export const useRenameTag = () => {
    const kbId = useKnowledgeBaseId();
    const [loading, setLoading] = useState(false);

    const handleRenameTag = async (params: IRenameTag) => {
        if (!kbId) return;
        setLoading(true);
        try {
            const result = await renameTagAction(kbId, params);
            if (result.success) {
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, handleRenameTag };
};

/**
 * 获取标签列表数据的通用函数
 * @param knowledgeBaseIds 知识库 ID 字符串
 * @returns 标签列表数据
 */
const fetchTagListData = async (knowledgeBaseIds: string): Promise<Array<[string, number]>> => {
    try {
        const result = await listTagAction(knowledgeBaseIds);
        if (result && 'success' in result && result.success && 'data' in result) {
            return Array.isArray(result.data) ? result.data : [];
        }
        return [];
    } catch (error) {
        console.error('获取标签列表失败:', error);
        return [];
    }
};

/**
 * 获取标签列表的 Hook
 * @returns 标签列表和加载状态
 */
export const useFetchTagList = () => {
    const kbId = useKnowledgeBaseId();
    const [list, setList] = useState<Array<[string, number]>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!kbId) return;
            try {
                const data = await fetchTagListData(kbId);
                setList(data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [kbId]);

    return { list, loading };
};

/**
 * 根据知识库 ID 列表获取标签列表的 Hook
 * @returns 标签列表、加载状态和设置知识库 ID 列表的函数
 */
export const useFetchTagListByKnowledgeIds = () => {
    const [knowledgeIds, setKnowledgeIds] = useState<string[]>([]);
    const [list, setList] = useState<Array<[string, number]>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (knowledgeIds.length === 0) return;
            try {
                const data = await fetchTagListData(knowledgeIds.join(','));
                setList(data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [knowledgeIds]);

    return { list, loading, setKnowledgeIds };
};

//#endregion


/**
 * 知识库接口定义
 */
export interface KnowledgeBase {
    id: string;
    name: string;
    description?: string;
    userId: string;
    create_date: Date;
    update_date: Date;
}

/**
 * 获取知识库列表的 Hook
 * @returns 知识库列表和加载状态
 */
export function useKnowledgeBaseList() {
    const [data, setData] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getKnowledgeBaseListAction();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    return { data, isLoading };
}
