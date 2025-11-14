"use client"

import { get, isEmpty, trim } from 'lodash';
import { ChangeEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { useGetPaginationWithRouter } from '@/hooks/use-pagination';

// Define IAnswer interface
interface IAnswer {
  answer?: string;
  reference?: any[];
  [key: string]: any;
}

interface TestChunkParams {
  kb_id: string[];
  highlight: boolean;
  question: string;
  doc_ids?: string[];
  page: number;
  size: number;
}

export const useSendQuestion = (kbIds: string[]) => {
  const [answer, setAnswer] = useState<IAnswer>({} as IAnswer);
  const [done, setDone] = useState(true);
  const timer = useRef<NodeJS.Timeout>();
  const sseRef = useRef<AbortController>();
  const [loading, setLoading] = useState(false);
  const [sendingLoading, setSendingLoading] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [searchStr, setSearchStr] = useState<string>('');
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const { pagination, setPagination } = useGetPaginationWithRouter();

  const initializeSseRef = useCallback(() => {
    sseRef.current = new AbortController();
  }, []);

  const resetAnswer = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(() => {
      setAnswer({} as IAnswer);
      clearTimeout(timer.current);
    }, 1000);
  }, []);

  const testChunk = useCallback(async (params: TestChunkParams) => {
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
        return result.data;
      }
      throw new Error(result.error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRelatedQuestions = useCallback(async (question: string) => {
    try {
      const response = await fetch('/api/chat/related-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          kb_ids: kbIds,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setRelatedQuestions(result.data || []);
      }
    } catch (error) {
      console.error('获取相关问题失败:', error);
    }
  }, [kbIds]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const q = trim(question);
      if (isEmpty(q)) return;
      setPagination({ current: 1 });
      setIsFirstRender(false);
      setAnswer({} as IAnswer);
      setSendingLoading(true);

      initializeSseRef();
      try {
        setDone(false);
        const response = await fetch('/api/chat/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: q,
            kb_ids: kbIds,
          }),
          signal: sseRef.current?.signal,
        });

        const reader = response?.body
          ?.pipeThrough(new TextDecoderStream())
          .pipeThrough(new TransformStream({
            transform(chunk, controller) {
              const lines = chunk.toString().split('\n');
              for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.startsWith('data: ')) {
                  controller.enqueue({
                    data: line.slice(6)
                  });
                }
              }
            }
          }))
          .getReader();

        while (true) {
          const x = await reader?.read();
          if (x) {
            const { done, value } = x;
            if (done) {
              console.info('done');
              resetAnswer();
              break;
            }
            try {
              const val = JSON.parse(value?.data || '');
              const d = val?.data;
              if (typeof d !== 'boolean') {
                console.info('data:', d);
                setAnswer({
                  ...d,
                });
              }
            } catch (e) {
              console.warn(e);
            }
          }
        }
        setDone(true);
        resetAnswer();
      } catch (e) {
        setDone(true);
        resetAnswer();
        console.warn(e);
      }

      testChunk({
        kb_id: kbIds,
        highlight: true,
        question: q,
        page: 1,
        size: pagination.pageSize,
      });

      fetchRelatedQuestions(q);
    },
    [
      kbIds,
      setPagination,
      initializeSseRef,
      resetAnswer,
      testChunk,
      pagination.pageSize,
      fetchRelatedQuestions,
    ],
  );

  const handleSearchStrChange: ChangeEventHandler<HTMLInputElement> = useCallback((e) => {
    setSearchStr(e.target.value);
  }, []);

  const handleClickRelatedQuestion = useCallback(
    (question: string) => () => {
      if (sendingLoading) return;
      setSearchStr(question);
      sendQuestion(question);
    },
    [sendQuestion, sendingLoading],
  );

  const handleTestChunk = useCallback(
    (documentIds: string[], page: number = 1, size: number = 10) => {
      const q = trim(searchStr);
      if (sendingLoading || isEmpty(q)) return;

      testChunk({
        kb_id: kbIds,
        highlight: true,
        question: q,
        doc_ids: documentIds ?? selectedDocumentIds,
        page,
        size,
      });
    },
    [sendingLoading, searchStr, kbIds, testChunk, selectedDocumentIds],
  );

  useEffect(() => {
    if (!isEmpty(answer)) {
      setAnswer(answer);
    }
  }, [answer]);

  useEffect(() => {
    if (done) {
      setSendingLoading(false);
    }
  }, [done]);

  const stopOutputMessage = useCallback(() => {
    sseRef.current?.abort();
  }, []);

  return {
    sendQuestion,
    handleSearchStrChange,
    handleClickRelatedQuestion,
    handleTestChunk,
    setSelectedDocumentIds,
    loading,
    sendingLoading,
    answer,
    relatedQuestions: relatedQuestions.slice(0, 5),
    searchStr,
    isFirstRender,
    selectedDocumentIds,
    isSearchStrEmpty: isEmpty(trim(searchStr)),
    stopOutputMessage,
  };
};

export const useFetchBackgroundImage = () => {
  const [imgUrl, setImgUrl] = useState<string>('');

  const fetchImage = useCallback(async () => {
    try {
      const res = await fetch('/api/background-image');
      const ret = await res.json();
      const url = get(ret, 'images.0.url');
      if (url) {
        setImgUrl(url);
      }
    } catch (error) {
      console.log('🚀 ~ fetchImage ~ error:', error);
    }
  }, []);

  useEffect(() => {
    fetchImage();
  }, [fetchImage]);

  return `https://cn.bing.com${imgUrl}`;
};
