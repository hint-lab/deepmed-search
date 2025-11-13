'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
    chart: string;
}

/**
 * Mermaid 图表组件
 * 用于渲染 Mermaid 流程图、序列图等
 */
export function Mermaid({ chart }: MermaidProps) {
    const [svg, setSvg] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        // 初始化 Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
        });
    }, []);

    useEffect(() => {
        if (!chart || !containerRef.current) return;

        const renderChart = async () => {
            try {
                setError(null);
                const id = idRef.current;
                
                // 清空容器
                if (containerRef.current) {
                    containerRef.current.innerHTML = '';
                }

                // 渲染图表
                const { svg } = await mermaid.render(id, chart);
                setSvg(svg);
            } catch (err) {
                console.error('Mermaid render error:', err);
                setError(err instanceof Error ? err.message : 'Failed to render diagram');
            }
        };

        renderChart();
    }, [chart]);

    if (error) {
        return (
            <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10">
                <p className="text-sm text-destructive">流程图渲染失败: {error}</p>
                <pre className="mt-2 text-xs overflow-auto">{chart}</pre>
            </div>
        );
    }

    return (
        <div 
            ref={containerRef}
            className="mermaid-container my-4 flex justify-center overflow-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}

