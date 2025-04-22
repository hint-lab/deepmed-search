'use client';

import { useState, useEffect } from 'react';
import { ModelOptions } from 'zerox/node-zerox/dist/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, FileText, ArrowRight, Info } from 'lucide-react';
import {
    processDocumentDirectlyAction,
    convertDocumentAction,
    splitDocumentAction,
    indexDocumentChunksAction,
    updateDocumentProcessingStatusAction,
    getDocumentKnowledgeBaseIdAction
} from '@/actions/document-process';
import { DocumentProcessingStatus } from '@/types/enums';


export default function DocumentTestPage() {
    const [documentId, setDocumentId] = useState<string>('');
    const [kbId, setKbId] = useState<string>('');
    const [kbIdLoading, setKbIdLoading] = useState<boolean>(false);
    const [kbIdError, setKbIdError] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [convertedResult, setConvertedResult] = useState<any>(null);
    const [splitResult, setSplitResult] = useState<any>(null);
    const [indexResult, setIndexResult] = useState<any>(null);
    const [indexEmbeddings, setIndexEmbeddings] = useState<number[][] | null>(null);
    const [currentStep, setCurrentStep] = useState<string>('convert');

    // 为每个步骤添加独立的处理状态
    const [convertProcessing, setConvertProcessing] = useState(false);
    const [splitProcessing, setSplitProcessing] = useState(false);
    const [indexProcessing, setIndexProcessing] = useState(false);
    const [fullProcessing, setFullProcessing] = useState(false);

    // 为每个步骤添加独立的进度
    const [convertProgress, setConvertProgress] = useState<number>(0);
    const [splitProgress, setSplitProgress] = useState<number>(0);
    const [indexProgress, setIndexProgress] = useState<number>(0);
    const [fullProgress, setFullProgress] = useState<number>(0);

    // Effect to fetch kbId when documentId changes
    useEffect(() => {
        if (documentId) {
            const fetchKbId = async () => {
                setKbIdLoading(true);
                setKbId(''); // Reset kbId
                setKbIdError('');
                try {
                    const response = await getDocumentKnowledgeBaseIdAction(documentId);
                    if (response.success && response.kbId) {
                        setKbId(response.kbId);
                    } else {
                        setKbIdError(response.error || '未能获取知识库 ID');
                        toast.error(response.error || '未能获取知识库 ID');
                    }
                } catch (err: any) {
                    setKbIdError('获取知识库 ID 失败: ' + (err.message || '未知错误'));
                    toast.error('获取知识库 ID 失败: ' + (err.message || '未知错误'));
                } finally {
                    setKbIdLoading(false);
                }
            };
            fetchKbId();
        } else {
            setKbId(''); // Clear kbId if documentId is cleared
            setKbIdError('');
        }
    }, [documentId]);

    // 监听结果变化
    useEffect(() => {
        if (result || convertedResult || splitResult || indexResult) {
            // 强制重新渲染结果卡片
            const resultCard = document.getElementById('result-card');
            if (resultCard) {
                resultCard.style.display = 'none';
                setTimeout(() => {
                    resultCard.style.display = 'block';
                }, 0);
            }
        }
    }, [result, convertedResult, splitResult, indexResult]);

    // 监听处理状态变化
    useEffect(() => {
        if (convertProcessing) {
            setConvertProgress(0);
            const interval = setInterval(() => {
                setConvertProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [convertProcessing]);

    // 监听分割处理状态变化
    useEffect(() => {
        if (splitProcessing) {
            setSplitProgress(0);
            const interval = setInterval(() => {
                setSplitProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [splitProcessing]);

    // 监听索引处理状态变化
    useEffect(() => {
        if (indexProcessing) {
            setIndexProgress(0);
            const interval = setInterval(() => {
                setIndexProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [indexProcessing]);

    // 监听完整流程处理状态变化
    useEffect(() => {
        if (fullProcessing) {
            setFullProgress(0);
            const interval = setInterval(() => {
                setFullProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(interval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [fullProcessing]);

    // 处理文档 - 完整流程
    const handleProcessTest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);
        setFullProcessing(true);
        setError('');
        setFullProgress(0);
        setConvertProgress(0);
        setSplitProgress(0);
        setIndexProgress(0);
        setCurrentStep('convert');

        try {
            const form = e.currentTarget;
            const formData = new FormData(form);
            const model = formData.get('model') as string || ModelOptions.OPENAI_GPT_4O_MINI;
            const maintainFormat = formData.get('maintainFormat') === 'on';
            const prompt = formData.get('prompt') as string || '';

            // 获取文档所属的知识库 ID
            const kbIdResponse = await getDocumentKnowledgeBaseIdAction(documentId);
            if (!kbIdResponse.success || !kbIdResponse.kbId) {
                throw new Error(kbIdResponse.error || '获取知识库 ID 失败');
            }

            const response = await processDocumentDirectlyAction(documentId, kbIdResponse.kbId, {
                model,
                maintainFormat,
                prompt
            });

            if (response.success && response.data && response.data.converted) {
                const convertedData = response.data.converted.data;
                const convertedMetadata = response.data.converted.metadata;

                const processedResult = {
                    success: true,
                    data: {
                        pages: convertedData?.pages || [],
                        pageCount: convertedData?.pageCount || 0,
                    },
                    metadata: {
                        processingTime: convertedMetadata?.processingTime || 0,
                        documentId: convertedMetadata?.documentId || documentId,
                        completionTime: convertedMetadata?.completionTime || 0,
                        fileName: convertedMetadata?.fileName || '未知',
                        inputTokens: convertedMetadata?.inputTokens || 0,
                        outputTokens: convertedMetadata?.outputTokens || 0,
                        pageCount: convertedMetadata?.pageCount || 0,
                        wordCount: 0
                    }
                };
                setResult(processedResult);
                setFullProgress(100);
                toast.success('文档处理完成');
            } else {
                const errorMsg = response.error || '处理文档失败，但未返回明确错误信息。';
                setError(errorMsg);
                toast.error(errorMsg);
                console.error('完整流程处理失败:', response);
            }
        } catch (err: any) {
            setError('处理文档失败: ' + (err.message || '未知错误'));
            toast.error('处理文档失败: ' + (err.message || '未知错误'));
            console.error(err);
        } finally {
            setProcessing(false);
            setFullProcessing(false);
        }
    };

    // 仅转换文档
    const handleConvertTest = async () => {
        if (!documentId) {
            toast.error('请输入要测试的文档ID');
            return;
        }

        setConvertProcessing(true);
        setError('');
        setConvertedResult(null);
        setConvertProgress(0);

        toast.info(`正在转换文档: ${documentId}`);

        try {
            await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.CONVERTING, {
                progress: 0,
                progressMsg: '开始转换'
            });

            const response = await convertDocumentAction(documentId, {
                model: ModelOptions.OPENAI_GPT_4O_MINI,
                maintainFormat: true
            });

            if (response.success && response.data) {
                setConvertedResult(response.data);
                setConvertProgress(100);
                toast.success('文档转换完成');
                setCurrentStep('split');
            } else {
                setError(response.error || '转换文档失败');
                toast.error(response.error || '转换文档失败');
                console.error('转换文档失败:', response.error);
                await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.FAILED, {
                    progress: 0,
                    progressMsg: response.error || '转换失败',
                    error: response.error
                });
            }
        } catch (err: any) {
            setError('转换文档失败: ' + (err.message || '未知错误'));
            toast.error('转换文档失败: ' + (err.message || '未知错误'));
            console.error(err);
            await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.FAILED, {
                progress: 0,
                progressMsg: err.message || '转换失败',
                error: err.message
            });
        } finally {
            setConvertProcessing(false);
        }
    };

    // 分割文档
    const handleSplitTest = async () => {
        if (!documentId) {
            toast.error('请输入要测试的文档ID');
            return;
        }

        if (!convertedResult || !convertedResult.data?.pages || convertedResult.data.pages.length === 0) {
            toast.error('请先转换文档');
            return;
        }

        setSplitProcessing(true);
        setError('');
        setSplitResult(null);
        setSplitProgress(0);

        toast.info(`正在分割文档: ${documentId}`);

        try {

            const response = await splitDocumentAction(
                documentId,
                convertedResult.data.pages,
                {
                    model: ModelOptions.OPENAI_GPT_4O_MINI,
                    maintainFormat: true,
                    documentName: convertedResult.metadata?.fileName || '未知文档'
                }
            );

            if (response.success && response.data) {
                setSplitResult(response.data);
                setSplitProgress(100);
                toast.success('文档分割完成');
                setCurrentStep('index');
            } else {

                setError(response.error || '分割文档失败');
                toast.error(response.error || '分割文档失败');
                console.error('分割文档失败:', response.error);
            }
        } catch (err: any) {
            setError('分割文档失败: ' + (err.message || '未知错误'));
            toast.error('分割文档失败: ' + (err.message || '未知错误'));
            console.error(err);
        } finally {
            setSplitProcessing(false);
        }
    };

    // 索引文档块
    const handleIndexTest = async () => {
        if (!documentId) {
            toast.error('请输入要测试的文档ID');
            return;
        }
        if (!kbId && !kbIdLoading) {
            toast.error('无法获取此文档的知识库ID，请检查文档ID是否正确或稍后再试');
            return;
        }
        if (!splitResult || !splitResult.chunks || splitResult.chunks.length === 0) {
            toast.error('请先分割文档');
            return;
        }

        setIndexProcessing(true);
        setError('');
        setIndexResult(null);
        setIndexEmbeddings(null);
        setIndexProgress(0);

        console.log(`正在索引文档块: ${documentId} (知识库: ${kbId})`);

        try {
            await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.INDEXING, {
                progress: 0,
                progressMsg: '开始索引'
            });
            const response = await indexDocumentChunksAction(
                documentId,
                kbId,
                splitResult.chunks
            );

            if (response.success && response.data) {
                setIndexResult(response.data);
                setIndexEmbeddings(response.data.embeddings || null);
                setIndexProgress(100);
                toast.success('文档块索引完成');
                setCurrentStep('complete');

            } else {
                setError(response.error || '索引文档块失败');
                toast.error(response.error || '索引文档块失败');
                console.error(response.error);
                await updateDocumentProcessingStatusAction(documentId, DocumentProcessingStatus.FAILED, {
                    progress: 0,
                    progressMsg: response.error || '转换失败',
                    error: response.error
                });
            }
        } catch (err: any) {
            setError('索引文档块失败: ' + (err.message || '未知错误'));
            toast.error('索引文档块失败: ' + (err.message || '未知错误'));
            console.error(err);
        } finally {
            setIndexProcessing(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-4xl py-10">
            <h1 className="text-2xl font-bold mb-4">文档处理测试工具</h1>
            <p className="mb-6 text-muted-foreground">
                此页面用于测试文档处理功能。输入文档ID后，系统将处理文档并返回结果。
            </p>

            {/* 文档ID输入卡片 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>文档信息</CardTitle>
                    <CardDescription>输入要处理的文档ID，系统将自动获取其所属知识库ID</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="documentId">文档ID</Label>
                            <Input
                                id="documentId"
                                value={documentId}
                                onChange={(e) => setDocumentId(e.target.value)}
                                placeholder="输入要测试处理的文档ID"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="knowledgeBaseId">知识库ID (自动获取)</Label>
                            <div className="flex items-center space-x-2 p-2 h-10 w-full rounded-md border border-input bg-muted text-muted-foreground">
                                {kbIdLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : kbId ? (
                                    <span className="truncate">{kbId}</span>
                                ) : (
                                    <span className="text-sm italic">{kbIdError || '请输入文档ID以获取知识库ID'}</span>
                                )}
                            </div>
                            {kbIdError && !kbIdLoading && (
                                <p className="text-sm text-destructive flex items-center">
                                    <Info className="h-4 w-4 mr-1" /> {kbIdError}
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 步骤指示器 */}
            <div className="flex items-center justify-between mb-6">
                <div className={`flex flex-col items-center ${currentStep === 'convert' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${currentStep === 'convert' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>1</div>
                    <span className="text-sm font-medium">转换</span>
                </div>
                <div className="flex-1 h-0.5 bg-muted mx-4">
                    <div className={`h-full ${currentStep !== 'convert' ? 'bg-primary' : 'bg-muted'}`} style={{ width: currentStep === 'convert' ? '0%' : currentStep === 'split' ? '33%' : currentStep === 'index' ? '66%' : '100%' }}></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 'split' || currentStep === 'index' || currentStep === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${currentStep === 'split' ? 'bg-primary text-primary-foreground' : currentStep === 'index' || currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</div>
                    <span className="text-sm font-medium">分割</span>
                </div>
                <div className="flex-1 h-0.5 bg-muted mx-4">
                    <div className={`h-full ${currentStep === 'index' || currentStep === 'complete' ? 'bg-primary' : 'bg-muted'}`} style={{ width: currentStep === 'index' ? '66%' : currentStep === 'complete' ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 'index' || currentStep === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${currentStep === 'index' ? 'bg-primary text-primary-foreground' : currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>3</div>
                    <span className="text-sm font-medium">索引</span>
                </div>
                <div className="flex-1 h-0.5 bg-muted mx-4">
                    <div className={`h-full ${currentStep === 'complete' ? 'bg-primary' : 'bg-muted'}`} style={{ width: currentStep === 'complete' ? '100%' : '0%' }}></div>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${currentStep === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>4</div>
                    <span className="text-sm font-medium">完成</span>
                </div>
            </div>

            {/* 转换卡片 */}
            <Card className={`mb-6 ${currentStep === 'convert' ? 'border-primary' : ''}`}>
                <CardHeader>
                    <CardTitle>步骤 1: 转换文档</CardTitle>
                    <CardDescription>将文档转换为 Markdown 格式</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="maintainFormat" defaultChecked />
                            <Label htmlFor="maintainFormat">保持格式</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prompt">提示词</Label>
                            <Textarea
                                id="prompt"
                                placeholder="输入自定义提示词，例如：'请提取文档中的关键信息'"
                                rows={4}
                            />
                        </div>
                        <Button
                            onClick={handleConvertTest}
                            disabled={convertProcessing || currentStep !== 'convert'}
                            className="w-full"
                        >
                            {convertProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    转换中... {convertProgress}%
                                </>
                            ) : (
                                '开始转换'
                            )}
                        </Button>
                    </div>

                    {/* 转换结果 */}
                    {convertedResult && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-lg font-medium mb-4">转换结果</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">处理状态: </span>
                                    <span className="text-green-600">成功</span>
                                </div>
                                <div>
                                    <span className="font-medium">处理时间: </span>
                                    <span>{convertedResult.metadata?.processingTime || '未知'} ms</span>
                                </div>
                                <div>
                                    <span className="font-medium">页数: </span>
                                    <span>{convertedResult.metadata?.pageCount || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">输入 Tokens: </span>
                                    <span>{convertedResult.metadata?.inputTokens || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">输出 Tokens: </span>
                                    <span>{convertedResult.metadata?.outputTokens || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">内容预览: </span>
                                    <div className="mt-2 w-full h-72 rounded-md border overflow-y-auto">
                                        <div className="p-4 bg-white">
                                            <pre className="whitespace-pre-wrap text-sm break-all">
                                                {convertedResult.data?.pages?.[0]?.content}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 分割卡片 */}
            <Card className={`mb-6 ${currentStep === 'split' ? 'border-primary' : ''}`}>
                <CardHeader>
                    <CardTitle>步骤 2: 分割文档</CardTitle>
                    <CardDescription>将转换后的文档分割成块</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="splitMaintainFormat" defaultChecked />
                            <Label htmlFor="splitMaintainFormat">保持格式</Label>
                        </div>
                        <Button
                            onClick={handleSplitTest}
                            disabled={splitProcessing || currentStep !== 'split'}
                            className="w-full"
                        >
                            {splitProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    分割中... {splitProgress}%
                                </>
                            ) : (
                                '开始分割'
                            )}
                        </Button>
                    </div>

                    {/* 分割结果 */}
                    {splitResult && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-lg font-medium mb-4">分割结果</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">处理状态: </span>
                                    <span className="text-green-600">成功</span>
                                </div>
                                <div>
                                    <span className="font-medium">总块数: </span>
                                    <span>{splitResult.totalChunks || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">块预览 (最多5个): </span>
                                    <div className="mt-2 w-full h-72 rounded-md border overflow-y-auto">
                                        <div className="space-y-4 p-4">
                                            {splitResult.chunks?.slice(0, 5).map((chunk: any, index: number) => (
                                                <div key={index} className="border-b pb-4 last:border-b-0">
                                                    <div className="font-medium mb-2">块 {index + 1}</div>
                                                    <div className="bg-white rounded-md p-4 overflow-x-auto">
                                                        <pre className="whitespace-pre-wrap text-sm break-all">
                                                            {chunk.content?.substring(0, 500)}{chunk.content?.length > 500 ? '...' : ''}
                                                        </pre>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 索引卡片 */}
            <Card className={`mb-6 ${currentStep === 'index' ? 'border-primary' : ''}`}>
                <CardHeader>
                    <CardTitle>步骤 3: 索引文档块</CardTitle>
                    <CardDescription>为分割后的文档块创建索引</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Button
                            onClick={handleIndexTest}
                            disabled={indexProcessing || currentStep !== 'index' || !kbId}
                            className="w-full"
                        >
                            {indexProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    索引中... {indexProgress}%
                                </>
                            ) : (
                                '开始索引'
                            )}
                        </Button>
                    </div>

                    {/* 索引结果 */}
                    {indexResult && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-lg font-medium mb-4">索引结果</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">处理状态: </span>
                                    <span className="text-green-600">成功</span>
                                </div>
                                <div>
                                    <span className="font-medium">索引块数: </span>
                                    <span>{indexResult.indexedCount || 0}</span>
                                </div>
                                {/* Display Embeddings */}
                                {indexEmbeddings && indexEmbeddings.length > 0 && (
                                    <div>
                                        <span className="font-medium">Embedding 预览 (第一个块的前10维): </span>
                                        <div className="mt-2 w-full rounded-md border p-4 bg-muted overflow-x-auto">
                                            <pre className="text-xs">{`[${indexEmbeddings[0].slice(0, 10).join(', ')} ...]`}</pre>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            维度: {indexEmbeddings[0].length}, 共 {indexEmbeddings.length} 个向量 (来自第一个批次)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 完整流程卡片 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>完整流程</CardTitle>
                    <CardDescription>一次性执行所有步骤</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProcessTest} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="model">模型</Label>
                            <Select name="model" defaultValue={ModelOptions.OPENAI_GPT_4O_MINI}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择模型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ModelOptions.OPENAI_GPT_4O}>GPT-4o</SelectItem>
                                    <SelectItem value={ModelOptions.OPENAI_GPT_4O_MINI}>GPT-4o-mini</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="fullMaintainFormat" name="maintainFormat" defaultChecked />
                            <Label htmlFor="fullMaintainFormat">保持格式</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fullPrompt">提示词</Label>
                            <Textarea
                                id="fullPrompt"
                                name="prompt"
                                placeholder="输入自定义提示词，例如：'请提取文档中的关键信息'"
                                rows={4}
                            />
                        </div>
                        <Button type="submit" disabled={fullProcessing || !kbId} className="w-full">
                            {fullProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    处理中... {fullProgress}%
                                </>
                            ) : (
                                '开始完整处理'
                            )}
                        </Button>
                    </form>

                    {/* 完整处理结果 */}
                    {result && (
                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-lg font-medium mb-4">处理结果</h3>
                            <div className="space-y-4">
                                <div>
                                    <span className="font-medium">处理状态: </span>
                                    <span className="text-green-600">成功</span>
                                </div>
                                <div>
                                    <span className="font-medium">处理时间: </span>
                                    <span>{result.metadata?.processingTime || '未知'} ms</span>
                                </div>
                                <div>
                                    <span className="font-medium">页数: </span>
                                    <span>{result.data?.pages.length || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">输入 Tokens: </span>
                                    <span>{result.metadata?.inputTokens || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">输出 Tokens: </span>
                                    <span>{result.metadata?.outputTokens || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">完成时间: </span>
                                    <span>{result.metadata?.completionTime || '未知'} ms</span>
                                </div>
                                <div>
                                    <span className="font-medium">源文件: </span>
                                    <span>{result.metadata?.fileName || '未知'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 显示错误 */}
            {error && !processing && (
                <div className="mt-4 p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/30">
                    <div className="flex items-start">
                        <FileText className="h-5 w-5 mr-3 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">发生错误</h4>
                            <p className="text-sm break-words">{error}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
