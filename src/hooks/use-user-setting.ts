import { useCallback, useMemo } from 'react';

export interface ParserItem {
    value: string;
    label: string;
}

export function useSelectParserList() {
    const parserList = useMemo<ParserItem[]>(() => [
        {
            value: 'naive',
            label: '简单分块',
        },
        {
            value: 'book',
            label: '图书分块',
        },
        {
            value: 'laws',
            label: '法律文档',
        },
        {
            value: 'manual',
            label: '说明手册',
        },
        {
            value: 'picture',
            label: '图片文档',
        },
        {
            value: 'paper',
            label: '论文文档',
        },
        {
            value: 'presentation',
            label: '演示文稿',
        },
        {
            value: 'qa',
            label: '问答文档',
        },
        {
            value: 'resume',
            label: '简历文档',
        },
        {
            value: 'table',
            label: '表格文档',
        },
        {
            value: 'one',
            label: '单文档',
        },
        {
            value: 'knowledge_graph',
            label: '知识图谱',
        },
    ], []);

    return parserList;
}
