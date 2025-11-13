import { useMemo } from 'react';
import { useTranslate } from '@/contexts/language-context';

export interface ParserItem {
    value: string;
    label: string;
}

export function useSelectParserList() {
    const { t } = useTranslate('knowledgeBase');

    const parserList = useMemo<ParserItem[]>(() => [
        {
            value: 'rule_segmentation',
            label: t('ruleSegmentation'),
        },
        {
            value: 'llm_segmentation',
            label: t('llmSegmentation'),
        },
        {
            value: 'jina_segmentation',
            label: t('jinaSegmentation'),
        },
    ], [t]);

    return parserList;
}
