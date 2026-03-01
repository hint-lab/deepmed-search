"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RetrievalResponse, DebateResponse } from '@/lib/cdp-api/types';
import { EvidenceTable } from './components/evidence-table';
import { DebateVisualization } from './components/debate-visualization';

export default function CDPDebatePage() {
    const [caseReport, setCaseReport] = useState<string>('');
    const [isLoadingRetrieval, setIsLoadingRetrieval] = useState<boolean>(false);
    const [isLoadingDebate, setIsLoadingDebate] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // Retrieval State
    const [retrievalData, setRetrievalData] = useState<RetrievalResponse | null>(null);
    
    // Debate State
    const [debateData, setDebateData] = useState<DebateResponse | null>(null);
    const [selectedPathIndex, setSelectedPathIndex] = useState<number | undefined>(undefined);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCaseReport(event.target.value);
        setError(null);
    };

    const handleEvidenceSelect = (index: number) => {
        setSelectedPathIndex(index);
    };

    const handleRetrieve = async () => {
        if (!caseReport.trim()) {
            setError('Please enter a case description.');
            return;
        }

        setIsLoadingRetrieval(true);
        setError(null);
        setRetrievalData(null);

        try {
            // 使用代理 API 调用 CDP，避免混合内容问题
            const response = await fetch('/api/cdp-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'retrieve/context',
                    query: caseReport,
                    top_k_pseudo: 16,
                    top_k_hybrid: 16,
                    use_graph_retrieval: true,
                    top_k_graph: 1,
                    top_k_reranked: 5,
                    num_pseudo_questions: 0,
                }),
            });
            const result = await response.json();
            
            // 转换响应格式以匹配预期
            const mappedResult = {
                pseudo_questions: [],
                evidence_panel: (result.results?.reranked?.results || []).map((item: any, index: number) => ({
                    // 将 path_id 编码进 id 里，方便传递。这里用 "path_{index}" 前缀。
                    id: `path_${index}_${item.file || 'doc'}`,
                    // 保存原始索引以便追踪辩论路径
                    originalIndex: index, 
                    text: item.document || '',
                    score: item.score || 0,
                    source: item.file || 'unknown',
                    is_generic_noise: false,
                    is_rare_cue: false,
                })),
                graph_data: { nodes: [], edges: [] },
                mode: 'deepmed' as const,
                step_time: (result.timing?.hybrid_seconds || 0) + (result.timing?.graph_seconds || 0) + (result.timing?.reasoning_seconds || 0),
            };
            setRetrievalData(mappedResult);
        } catch (err: any) {
            setError(err.message || 'Retrieval failed.');
            setRetrievalData(null);
        } finally {
            setIsLoadingRetrieval(false);
        }
    };

    const handleDebate = async () => {
        if (!caseReport.trim()) {
            setError('Please enter a case description.');
            return;
        }
        if (!retrievalData) {
            setError('Please retrieve evidence first.');
            return;
        }
        if (retrievalData.evidence_panel.length === 0) {
            setError('No evidence found. Please try another query before generating debate.');
            return;
        }

        setIsLoadingDebate(true);
        setError(null);
        setDebateData(null);

        try {
            // 使用代理 API 调用 CDP，避免混合内容问题
            const response = await fetch('/api/cdp-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'debate/validate',
                    query: caseReport,
                    paths: retrievalData.evidence_panel.map(item => item.text),
                    judgment_mode: 'llm',
                }),
            });
            const result = await response.json();
            
            // 映射后端响应到前端期望的格式
            const debateResults = result?.debate_result?.debate_results ?? [];
            // 获取 judgment_results 做映射
            const judgmentResults = result?.debate_result?.judgment_results ?? [];
            const judgmentMap = new Map(
                judgmentResults.map((j: any) => [j.path, j.judgment.llm_judgment.confidence])
            );

            const debateLogs = debateResults.map((item: any) => {
                // 优先用 judgment_results 里的 confidence
                const pathText = item.path;
                const judgmentConfidence = judgmentMap.get(pathText);
                const finalConfidence = judgmentConfidence ?? item?.debate?.proponent_confidence ?? 0;

                return {
                    path_id: item.path_index,
                    history: (item?.debate?.rounds ?? []).map((round: any) => ({
                        proponent: round?.proponent ?? '',
                        opponent: round?.opponent ?? '',
                    })),
                    final_confidence: finalConfidence,
                };
            });

            const maxConfidence = debateLogs.length > 0 
                ? Math.max(...debateLogs.map((log: any) => log.final_confidence)) 
                : 0;

            // 解析 final_answer
            let diagnosis = '';
            let reasoningTrace: string[] = [];
            try {
                if (result?.final_answer) {
                    const parsed = JSON.parse(result.final_answer);
                    diagnosis = parsed.answer_choice || '';
                    // step_by_step_thinking 是用 "1. ", "2. " 这种格式分隔的
                    reasoningTrace = parsed.step_by_step_thinking 
                        ? parsed.step_by_step_thinking.split(/(?=\d+\.\s)/).filter(Boolean).map((s: string) => s.replace(/^\d+\.\s*/, ''))
                        : [];
                }
            } catch (e) {
                console.error('Failed to parse final_answer', e);
            }

            const mappedResult: DebateResponse = {
                debate_logs: debateLogs,
                diagnosis: diagnosis,
                confidence: maxConfidence,
                reasoning_trace: reasoningTrace,
                mode: 'deepmed',
                step_time: 0,
            };
            
            setDebateData(mappedResult);
        } catch (err: any) {
            setError(err.message || 'Debate generation failed.');
            setDebateData(null);
        } finally {
            setIsLoadingDebate(false);
        }
    };

    return (
        <main className={`flex min-h-screen flex-col items-center p-6 sm:p-10 md:p-16 bg-gradient-to-b from-background via-background to-muted/10 pt-24 sm:pt-20 ${(!retrievalData && !debateData && !error) ? 'justify-center' : 'justify-start'}`}>
            <div className="w-full max-w-7xl space-y-8">
                {/* Header */}
                <div className="text-center space-y-3 my-6 sm:my-8">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-700 to-blue-600 dark:from-cyan-300 dark:to-blue-400">
                        CDP Debate & Evidence
                    </h1>
                    <p className="text-muted-foreground">
                        Evidence Retrieval & Debate Visualization based on CDP Backend
                    </p>
                </div>

                {/* Input Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Case Report Input</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => { e.preventDefault(); handleRetrieve(); }} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-grow">
                                    <Input
                                        id="case-report-input"
                                        type="text"
                                        value={caseReport}
                                        onChange={handleInputChange}
                                        placeholder="Enter patient symptoms or clinical presentation..."
                                        disabled={isLoadingRetrieval || isLoadingDebate}
                                        className="h-12 text-base rounded-l-lg rounded-r-none border-r-0 border border-border/80 px-5 w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    onClick={handleRetrieve}
                                    disabled={isLoadingRetrieval || isLoadingDebate}
                                    className="flex-shrink-0 h-12 rounded-none px-6 border-y border-x-0 border-border/80 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white transition-all"
                                >
                                    {isLoadingRetrieval ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Retrieving...
                                        </>
                                    ) : (
                                        'Retrieve Evidence'
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleDebate}
                                    disabled={isLoadingRetrieval || isLoadingDebate || !retrievalData}
                                    className="flex-shrink-0 h-12 rounded-r-lg rounded-l-none px-6 border-y border-l-0 border-border/80 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all"
                                >
                                    {isLoadingDebate ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        'Generate Debate'
                                    )}
                                </Button>
                            </div>
                            
                            {/* Quick Examples */}
                            <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-sm text-muted-foreground">Examples:</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCaseReport("Patient presents with episodic headaches, sweating, and palpitations. Blood pressure is elevated during episodes.")}
                                    className="text-xs"
                                >
                                    Example 1
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCaseReport("Patient with paroxysmal hypertension, headache, and sweating triad.")}
                                    className="text-xs"
                                >
                                    Example 2
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Flow: Retrieve Evidence first, then Generate Debate.
                            </p>
                        </form>
                    </CardContent>
                </Card>

                {/* Error Display */}
                {error && (
                    <Card className="border-destructive">
                        <CardContent className="pt-6">
                            <div className="border border-destructive bg-destructive/10 rounded-lg p-4">
                                <p className="text-sm text-destructive/90 font-medium">{error}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Loading State */}
                {(isLoadingRetrieval || isLoadingDebate) && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="w-full mb-6 p-8 rounded-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border border-cyan-200 dark:border-cyan-800/50 shadow-lg backdrop-blur-sm">
                                <div className="flex flex-col items-center space-y-6">
                                    {/* Animation */}
                                    <div className="flex space-x-3">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                                        <div className="w-4 h-4 bg-cyan-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                        <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                    </div>
                                    
                                    {/* Text Info */}
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">
                                            {isLoadingRetrieval ? 'Retrieving Evidence...' : 'Generating Debate...'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground max-w-md">
                                            Please wait while we process your request.
                                        </p>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full max-w-xs h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Evidence Table */}
                {retrievalData && (
                    <>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap items-center gap-3 text-sm">
                                    <span className="font-medium">Retrieval Summary</span>
                                    <span className="text-muted-foreground">
                                        Evidence: {retrievalData.evidence_panel.length}
                                    </span>
                                    <span className="text-muted-foreground">
                                        Time: {retrievalData.step_time.toFixed(2)}s
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        {retrievalData.evidence_panel.length > 0 ? (
                            <EvidenceTable data={retrievalData} onEvidenceSelect={handleEvidenceSelect} />
                        ) : (
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="text-sm text-muted-foreground">
                                        No evidence returned from retrieval. Please adjust your query and try again.
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* Debate Visualization */}
                {debateData && (
                    <DebateVisualization data={debateData} selectedPathIndex={selectedPathIndex} />
                )}
            </div>
        </main>
    );
}
