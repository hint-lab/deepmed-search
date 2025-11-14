import { useCallback, useState } from 'react';

export interface Pagination {
    current: number;
    pageSize: number;
    total: number;
}

export function useGetPaginationWithRouter() {
    const [pagination, setPagination] = useState<Pagination>({
        current: 1,
        pageSize: 10,
        total: 0
    });

    const setCurrentPagination = useCallback((newPagination: Partial<Pagination>) => {
        setPagination(prev => ({
            ...prev,
            ...newPagination
        }));
    }, []);

    return {
        pagination,
        setPagination: setCurrentPagination
    };
}

export function usePagination(initialPage: number = 1, initialSize: number = 10) {
    const [page, setPage] = useState(initialPage);
    const [size, setSize] = useState(initialSize);

    return {
        page,
        size,
        setPage,
        setSize,
    };
} 