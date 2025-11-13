'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

interface MarkdownProps {
    content: string;
    className?: string;
    components?: React.ComponentProps<typeof ReactMarkdown>['components'];
}

/**
 * 通用的 Markdown 渲染组件
 * 已包含表格、图片和数学公式支持，以及表格边框样式
 */
export function Markdown({ content, className, components }: MarkdownProps) {
    return (
        <div className={cn(
            "prose prose-sm max-w-none dark:prose-invert",
            // 表格边框样式
            "[&_table]:border [&_table]:border-border [&_table]:border-solid [&_table]:border-[1px]",
            "[&_th]:border [&_th]:border-border [&_th]:border-solid [&_th]:border-[1px]",
            "[&_td]:border [&_td]:border-border [&_td]:border-solid [&_td]:border-[1px]",
            "[&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2",
            "[&_table]:border-collapse [&_th]:bg-muted/50",
            className
        )}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex]}
                components={components}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

