'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { cn } from '@/lib/utils';
import { Mermaid } from './mermaid';
import 'katex/dist/katex.min.css';

interface MarkdownProps {
    content: string;
    className?: string;
    components?: React.ComponentProps<typeof ReactMarkdown>['components'];
}

/**
 * 通用的 Markdown 渲染组件
 * 已包含表格、图片、数学公式和流程图支持，以及表格边框样式
 */
export function Markdown({ content, className, components }: MarkdownProps) {
    // 合并自定义组件和默认组件
    const mergedComponents = {
        // 处理代码块，检测 mermaid 语言
        code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match && match[1] ? match[1] : '';
            const codeContent = String(children).replace(/\n$/, '');

            // 如果是 mermaid 代码块，使用 Mermaid 组件渲染
            if (!inline && language === 'mermaid') {
                return <Mermaid chart={codeContent} />;
            }

            // 默认代码块渲染
            return (
                <code className={codeClassName} {...props}>
                    {children}
                </code>
            );
        },
        ...components,
    };

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
                components={mergedComponents}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

