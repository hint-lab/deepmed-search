"use client";
import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    IKnowledgeBase,
    IKnowledgeGraph,
    ITestingResult,
    IRenameTag,
    IKnowledgeListItem,
    ICreateKnowledgeParams,
    IUpdateKnowledgeParams,
    ISearchKnowledgeParams,
    ISearchKnowledgeResult
} from '@/types/db/knowledge-base';
import { useTranslate } from 'react-i18next';
import { useDebounce } from '@/hooks/use-debounce';
import { usePagination } from '@/hooks/use-pagination';
import {
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    getKnowledgeBase,
    listKnowledgeBases,
    getKnowledgeBaseDetail,
    getKnowledgeList,
    listTag,
    removeTag,
    renameTag,
    getKnowledgeGraph,
    getKnowledgeBaseList
} from '@/actions/knowledge-base';
import { z } from 'zod';
// import { i18n } from 'i18n';

const formSchema = z.object({
    name: z.string().min(1, "请输入知识库名称"),
});

type FormValues = z.infer<typeof formSchema>;

// 搜索知识
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

// 保存知识     
export const useSaveKnowledge = () => {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation('translation', { keyPrefix: 'knowledgeList' });

    const showDialog = useCallback(() => {
        setVisible(true);
    }, []);

    const hideDialog = useCallback(() => {
        setVisible(false);
    }, []);

    const onCreateOk = useCallback(async (name: string) => {
        try {
            setLoading(true);
            await createKnowledgeBase({ name });
            toast.success(t('createSuccess'));
            hideDialog();
            // 重新验证路径以刷新数据
            window.location.reload();
        } catch (error) {
            toast.error(t('createError'));
        } finally {
            setLoading(false);
        }
    }, [hideDialog, t]);

    return {
        visible,
        loading,
        showDialog,
        hideDialog,
        onCreateOk,
    };
};

// 获取知识库id
export const useKnowledgeBaseId = (): string => {
    const searchParams = useSearchParams();
    return searchParams.get('id') || '';
};

// 获取知识库配置
export const useFetchKnowledgeBaseConfiguration = () => {
    const knowledgeBaseId = useKnowledgeBaseId();
    const [data, setData] = useState<IKnowledgeBase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!knowledgeBaseId) return;
            try {
                const result = await getKnowledgeBase(knowledgeBaseId);
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
    }, [knowledgeBaseId]);

    return { data, loading };
};

// 获取知识库列表
export const useFetchKnowledgeList = () => {
    const [list, setList] = useState<IKnowledgeListItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await listKnowledgeBases();
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

export const useSelectKnowledgeOptions = () => {
    const { list } = useFetchKnowledgeList();

    const options = list?.map((item: IKnowledgeListItem) => ({
        label: item.name,
        value: item.id,
    }));

    return options;
};

export const useInfiniteFetchKnowledgeList = () => {
    const [searchString, setSearchString] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<IKnowledgeListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async (pageNum: number) => {
        try {
            setLoading(true);
            const params: ISearchKnowledgeParams = {
                keyword: searchString,
                page: pageNum,
                pageSize: 10
            };
            const result = await listKnowledgeBases(params);

            if (result.success && result.data) {
                const searchResult = result.data;
                if (pageNum === 1) {
                    setData(searchResult.items);
                } else {
                    setData(prev => [...prev, ...searchResult.items]);
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

    const fetchNextPage = useCallback(() => {
        if (!loading && hasNextPage) {
            fetchData(page + 1);
        }
    }, [fetchData, loading, hasNextPage, page]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchString(e.target.value);
        setPage(1);
        setHasNextPage(true);
        fetchData(1);
    }, [fetchData]);

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

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    return {
        data,
        loading,
        hasNextPage,
        searchString,
        handleInputChange,
        fetchNextPage,
        scrollRef,
    };
};

// 创建知识库
export const useCreateKnowledge = () => {
    const router = useRouter();
    const { t } = useTranslate();
    const [loading, setLoading] = useState(false);

    const createKnowledge = async (params: ICreateKnowledgeParams) => {
        setLoading(true);
        try {
            const result = await createKnowledgeBase(params);
            if (result.success) {
                toast.success(t('创建成功'));
                router.push(`/knowledge/configuration?id=${result.data.id}`);
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { createKnowledge, loading };
};

// 更新知识库
export const useUpdateKnowledge = () => {
    const knowledgeBaseId = useKnowledgeBaseId();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const updateKnowledge = async (name: string) => {
        setLoading(true);
        try {
            const result = await updateKnowledgeBase(knowledgeBaseId, name);
            if (result.success) {
                toast.success(t('更新成功'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { updateKnowledge, loading };
};

// 删除知识库
export const useDeleteKnowledge = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const deleteKnowledge = async (id: string) => {
        setLoading(true);
        try {
            const result = await deleteKnowledgeBase(id);
            if (result.success) {
                toast.success(t('删除成功'));
            } else {
                throw new Error(result.error);
            }
        } finally {
            setLoading(false);
        }
    };

    return { deleteKnowledge, loading };
};

//#region Retrieval testing
export const useTestChunkRetrieval = () => {
    const knowledgeBaseId = useKnowledgeBaseId();
    const { page, size: pageSize } = usePagination();
    const [data, setData] = useState<ITestingResult>({ chunks: [], documents: [], total: 0 });
    const [loading, setLoading] = useState(false);

    const testChunk = async (values: any) => {
        setLoading(true);
        try {
            const result = await getKnowledgeBaseDetail(knowledgeBaseId);
            if (result.success) {
                const testingResult: ITestingResult = {
                    chunks: [],
                    documents: (result.data?.documents || []).map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        content: doc.content || ''
                    })),
                    total: result.data?.documents?.length || 0
                };
                setData(testingResult);
                return testingResult;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return {
        data,
        loading,
        testChunk,
    };
};

export const useChunkIsTesting = () => {
    const [isTesting, setIsTesting] = useState(false);
    return isTesting;
};

export const useSelectTestingResult = (): ITestingResult => {
    const [result, setResult] = useState<ITestingResult>({
        chunks: [],
        documents: [],
        total: 0,
    });
    return result;
};

export const useSelectIsTestingSuccess = () => {
    const [isSuccess, setIsSuccess] = useState(false);
    return isSuccess;
};

//#endregion

//#region tags
export const useRenameTag = () => {
    const knowledgeBaseId = useKnowledgeBaseId();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleRenameTag = async (params: IRenameTag) => {
        setLoading(true);
        try {
            const result = await renameTag(knowledgeBaseId, params);
            if (result.success) {
                toast.success(t('message.modified'));
                return result.data;
            }
            throw new Error(result.error);
        } finally {
            setLoading(false);
        }
    };

    return { loading, handleRenameTag };
};

// 创建一个通用的标签列表获取函数
const fetchTagListData = async (knowledgeBaseIds: string): Promise<Array<[string, number]>> => {
    try {
        const result = await listTag(knowledgeBaseIds);
        if (result && 'success' in result && result.success) {
            return result.data || [];
        }
        return [];
    } catch (error) {
        console.error('获取标签列表失败:', error);
        return [];
    }
};

export const useFetchTagList = () => {
    const knowledgeBaseId = useKnowledgeBaseId();
    const [list, setList] = useState<Array<[string, number]>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchTagListData(knowledgeBaseId);
                setList(data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [knowledgeBaseId]);

    return { list, loading };
};

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

export function useFetchKnowledgeGraph() {
    const knowledgeBaseId = useKnowledgeBaseId();
    const [data, setData] = useState<IKnowledgeGraph>({ nodes: [], edges: [], graph: {}, mind_map: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!knowledgeBaseId) return;
            try {
                const result = await getKnowledgeGraph(knowledgeBaseId);
                if (result && 'success' in result && result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [knowledgeBaseId]);

    return { data, loading };
}

export interface KnowledgeBase {
    id: string;
    name: string;
    description?: string;
    userId: string;
    create_date: Date;
    update_date: Date;
}

/**
 * 获取知识库列表
 */
export function useKnowledgeBaseList() {
    const [data, setData] = useState<KnowledgeBase[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const result = await getKnowledgeBaseList();
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
