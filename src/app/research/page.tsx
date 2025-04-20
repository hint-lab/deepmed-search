"use client"; // 标记为客户端组件

import React, { useState, useEffect, useTransition } from 'react';
import { startResearchAction } from '@/actions/research'; // 导入 Server Action
import { StepAction, AnswerAction } from '@/lib/deep-research/types'; // 导入类型
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react'; // 加载图标
import ReactMarkdown from 'react-markdown'; // 用于渲染 Markdown
import remarkGfm from 'remark-gfm'; // 支持 GFM (表格, 删除线等)
import rehypeRaw from 'rehype-raw'; // 支持直接渲染 HTML
import { ServerActionResponse } from '@/types/actions'; // 导入 ServerActionResponse 类型
import ThinkStatusDisplay from './components/think';

// 定义步骤详情的类型 (应与后端返回一致)
interface StepDetail {
    step: number;
    question: string;
    action: string;
    think?: string;
    details?: any; // 可以根据需要定义更具体的类型
}

export default function ResearchPage() {
    const [question, setQuestion] = useState<string>('');
    const [result, setResult] = useState<StepAction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[] | null>(null);
    const [stepDetails, setStepDetails] = useState<StepDetail[] | null>(null); // 新增：用于存储步骤详情的状态
    const [isPending, startTransition] = useTransition();

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuestion(event.target.value);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setResult(null);
        setLogs(null);
        setStepDetails(null); // 重置步骤详情

        if (!question.trim()) {
            setError("请输入研究问题。");
            return;
        }

        startTransition(async () => {
            // 更新类型断言以包含 stepDetails
            const response = await startResearchAction(question) as ServerActionResponse<{ result: StepAction; logs?: string[]; stepDetails?: StepDetail[] }>;
            if (response.success && response.data) {
                setResult(response.data.result);
                setLogs(response.data.logs || null); // 如果没有日志则设为 null
                setStepDetails(response.data.stepDetails || null); // 设置步骤详情状态
            } else {
                setError(response.error || "研究失败，请稍后再试。");
                setLogs(null);
                setStepDetails(null); // 错误时清空
            }
        });
    };

    // 类型守卫，用于检查是否为 AnswerAction
    function isAnswerAction(action: StepAction | null): action is AnswerAction {
        return action?.action === 'answer';
    }

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-16 sm:pt-20 ${(!result && !error && !logs && !stepDetails) ? 'justify-center' : 'justify-start'}`}>
            <div className="w-full max-w-3xl space-y-8">
                <div className="text-center space-y-3 mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 from-blue-600 via-purple-600 to-pink-600">
                        深度医学研究
                    </h1>
                    <form onSubmit={handleSubmit} className="mt-6">
                        <div className="flex items-center focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background rounded-lg transition-all duration-150">
                            <div className="relative flex-grow">
                                <Input
                                    id="research-question"
                                    type="text"
                                    value={question}
                                    onChange={handleInputChange}
                                    placeholder="输入您的问题，开始探索..."
                                    disabled={isPending}
                                    className="h-12 text-base rounded-l-lg rounded-r-none border-r-0 border border-border/80 shadow-sm px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="flex-shrink-0 h-12 rounded-l-none rounded-r-lg px-6 border border-x-0 border-border/80 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm hover:shadow-lg transition-all focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        研究中...
                                    </>
                                ) : (
                                    '开始研究'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {error && (
                    <div className="border border-destructive bg-destructive/10 rounded-lg p-4">
                        <p className="text-sm text-destructive/90 font-medium">{error}</p>
                    </div>
                )}

                {isPending && !result && !logs && !stepDetails && (
                    <div className="flex flex-col justify-start items-center py-5 rounded-lg">
                        <div className="flex justify-center items-center space-x-3">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">正在处理研究请求，请稍候...</p> </div>
                        <ThinkStatusDisplay></ThinkStatusDisplay>
                    </div>
                )}

                {result && (
                    <div className="border-t border-border/60 pt-8 mt-10 space-y-6">
                        <h2 className="text-xl font-semibold">研究结果</h2>
                        <div className="prose dark:prose-invert max-w-none space-y-5 text-base leading-relaxed bg-background p-5 rounded-lg border border-border/60 shadow-sm">
                            {isAnswerAction(result) && result.mdAnswer ? (
                                <div className="markdown-content space-y-4">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{result.mdAnswer}</ReactMarkdown>
                                </div>
                            ) : isAnswerAction(result) ? (
                                <p>{result.answer || '未能生成文本答案。'}</p>
                            ) : (
                                <p className="text-muted-foreground text-sm">研究已完成，但未生成直接的文本答案。请查看下方详细信息。</p>
                            )}

                            {isAnswerAction(result) && result.references && result.references.length > 0 && (
                                <div className="pt-5 border-t border-border/60 mt-5">
                                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">参考文献</h3>
                                    <ul className="list-none pl-0 space-y-2.5">
                                        {result.references.map((ref, index) => (
                                            <li key={index} className="text-sm flex items-start">
                                                <span className="text-muted-foreground w-6 text-right mr-2">[{index + 1}]</span>
                                                <div className="flex-1">
                                                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium">
                                                        {ref.title || ref.url}
                                                    </a>
                                                    {ref.dateTime && <span className="block text-xs text-muted-foreground/80 mt-0.5">({ref.dateTime})</span>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <details className="pt-5 border-t border-border/60 mt-5">
                                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">查看原始结果数据</summary>
                                <pre className="text-xs whitespace-pre-wrap break-all bg-muted/40 p-4 rounded-lg mt-2 border border-border/60">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </details>
                        </div>
                    </div>
                )}

                {stepDetails && stepDetails.length > 0 && (
                    <div className="border-t border-border/60 pt-8 mt-10 space-y-4">
                        <details className="group" open> {/* 默认展开 */}
                            <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                <span>处理步骤详情</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <div className="text-xs bg-muted/40 p-4 rounded-lg mt-2 border border-border/60 space-y-3">
                                {stepDetails.map((step) => (
                                    <div key={step.step} className="border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                                        <p><strong className="font-medium">步骤 {step.step}:</strong> <span className="text-primary font-semibold">{step.action}</span></p>
                                        <p className="text-muted-foreground pl-2">处理问题: "{step.question}"</p>
                                        {step.think && <p className="text-muted-foreground pl-2 mt-1">思考: {step.think}</p>}
                                        {/* 可选：显示更详细的步骤信息 */}
                                        {/* {step.details && <pre className="mt-1 pl-2 text-muted-foreground/80 text-[0.7rem] whitespace-pre-wrap break-all">{JSON.stringify(step.details, null, 2)}</pre>} */}
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>
                )}

                {logs && logs.length > 0 && (
                    <div className="border-t border-border/60 pt-8 mt-10 space-y-4">
                        <details className="group">
                            <summary className="cursor-pointer list-none flex items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                <span>查看后台处理日志</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </summary>
                            <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 p-4 rounded-lg mt-2 border border-border/60 overflow-x-auto">
                                {logs.map((log, index) => (
                                    <div key={index} className="border-b border-border/40 py-1 last:border-b-0">
                                        {typeof log === 'object' && log !== null ? JSON.stringify(log) : String(log)}
                                    </div>
                                ))}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </main>
    );
}
