import { useState } from 'react';
import { usePagination } from './use-pagination';

interface TestChunkParams {
    kb_id: string[];
    highlight: boolean;
    question: string;
    doc_ids?: string[];
    page: number;
    size: number;
}

interface TestingResult {
    chunks: any[];
    documents: any[];
    total: number;
}

export function useTestChunkRetrieval() {
    const { page, size } = usePagination();
    const [data, setData] = useState<TestingResult>({ chunks: [], documents: [], total: 0 });
    const [loading, setLoading] = useState(false);

    const testChunk = async (params: TestChunkParams) => {
        setLoading(true);
        try {
            const response = await fetch('/api/retrieval/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params),
            });
            const result = await response.json();
            if (result.success) {
                setData(result.data);
                return result.data;
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
} 