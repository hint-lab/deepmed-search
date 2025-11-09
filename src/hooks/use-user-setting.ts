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
            value: 'llm_segmentation',
            label: t('llmSegmentation'),
        },
        {
            value: 'rule_segmentation',
            label: t('ruleSegmentation'),
        },
    ], [t]);

    return parserList;
}
