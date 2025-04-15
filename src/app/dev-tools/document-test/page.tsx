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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, FileText } from 'lucide-react';
import { processDocumentDirectlyAction } from '@/actions/document-process';

export default function DocumentTestPage() {
    const [documentId, setDocumentId] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);

    // 处理文档
    const handleProcessTest = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!documentId) {
            toast.error('请输入要测试的文档ID');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const model = formData.get('model') as string || ModelOptions.OPENAI_GPT_4O_MINI;
        const maintainFormat = formData.get('maintainFormat') === 'on';
        const prompt = formData.get('prompt') as string || '';

        setProcessing(true);
        setError('');
        setResult(null);
        setProgress(0);

        toast.info(`正在处理文档: ${documentId}`);

        try {
            const response = await processDocumentDirectlyAction(documentId, {
                model,
                maintainFormat,
                prompt
            });

            if (response.success) {
                setResult(response.data);
                setProgress(100);
                toast.success('文档处理完成');
            } else {
                setError(response.error || '处理文档失败');
                toast.error(response.error || '处理文档失败');
            }
        } catch (err: any) {
            setError('处理文档失败: ' + (err.message || '未知错误'));
            toast.error('处理文档失败: ' + (err.message || '未知错误'));
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-4">文档处理测试工具</h1>
            <p className="mb-6 text-muted-foreground">
                此页面用于测试文档处理功能。输入文档ID后，系统将处理文档并返回结果。
            </p>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>处理测试</CardTitle>
                    <CardDescription>测试文档处理功能</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProcessTest} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="documentId">文档ID</Label>
                            <Input
                                id="documentId"
                                name="documentId"
                                value={documentId}
                                onChange={(e) => setDocumentId(e.target.value)}
                                placeholder="输入要测试处理的文档ID"
                            />
                        </div>
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
                            <Checkbox id="maintainFormat" name="maintainFormat" defaultChecked />
                            <Label htmlFor="maintainFormat">保持格式</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="prompt">提示词</Label>
                            <Textarea
                                id="prompt"
                                name="prompt"
                                placeholder="输入自定义提示词，例如：'请提取文档中的关键信息'"
                                rows={4}
                            />
                        </div>
                        <Button type="submit" disabled={processing} className="w-full">
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    处理中... {progress}%
                                </>
                            ) : (
                                '开始处理'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 处理结果卡片 */}
            {result && (
                <Card className="mb-6 bg-blue-50 border border-blue-200">
                    <CardHeader>
                        <CardTitle>处理结果</CardTitle>
                        <CardDescription>文档处理的结果</CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                <span className="font-medium">页面数: </span>
                                <span>{result.metadata?.pageCount || 0}</span>
                            </div>
                            <div>
                                <span className="font-medium">源文件: </span>
                                <span>{result.metadata?.fileName || '未知'}</span>
                            </div>
                            <div>
                                <span className="font-medium">内容预览 (最多500字符): </span>
                                <ScrollArea className="mt-2 h-60 w-full rounded-md border p-4 bg-white">
                                    <pre className="whitespace-pre-wrap text-sm">
                                        {result.content?.substring(0, 500)}{result.content?.length > 500 ? '...' : ''}
                                    </pre>
                                </ScrollArea>
                            </div>
                            {/* 显示完整元数据 */}
                            <div>
                                <span className="font-medium">完整元数据:</span>
                                <ScrollArea className="mt-2 h-40 w-full rounded-md border p-4 bg-gray-100">
                                    <pre className="whitespace-pre-wrap text-xs">
                                        {JSON.stringify(result.metadata, null, 2)}
                                    </pre>
                                </ScrollArea>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
