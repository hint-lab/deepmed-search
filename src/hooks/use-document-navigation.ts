'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useDocumentNavigation() {
    const router = useRouter();

    const navigateToChunkParsedResult = useCallback(
        (documentId: string, kbId: string) => () => {
            router.push(`/knowledge-base/chunk?id=${documentId}&kb_id=${kbId}`);
        },
        [router]
    );

    return {
        navigateToChunkParsedResult,
    };
} 