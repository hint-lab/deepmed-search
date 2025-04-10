
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addJobToQueue, getAllQueueStatus } from '@/actions/queue-actions';

export default function QueueTestPage() {
    const [queueName, setQueueName] = useState('PDF_PROCESSING');
    const [filename, setFilename] = useState('example.pdf');
    const [documentId, setDocumentId] = useState('doc-123');
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const fetchStatus = async () => {
        try {
            const data = await getAllQueueStatus();
            setStatus(data);
        } catch (error) {
            console.error('获取状态失败:', error);
        }
    };

    useEffect(() => {
        fetchStatus();
        // 每5秒刷新一次状态
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            let data;

            if (queueName === 'PDF_PROCESSING') {
                data = { filename };
            } else if (queueName === 'DOCUMENT_INDEXING') {
                data = { documentId };
            }

            const result = await addJobToQueue(queueName, data);
            setResult(result);

            // 刷新状态
            fetchStatus();
        } catch (error) {
            console.error('添加任务失败:', error);
            setResult({ error: '添加任务失败' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-6">队列系统测试 (Server Actions)</h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>添加新任务</CardTitle>
                        <CardDescription>选择队列类型并提供必要数据</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="queue">队列类型</Label>
                                <Select value={queueName} onValueChange={setQueueName}>
                                    <SelectTrigger id="queue">
                                        <SelectValue placeholder="选择队列" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PDF_PROCESSING">PDF处理</SelectItem>
                                        <SelectItem value="DOCUMENT_INDEXING">文档索引</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {queueName === 'PDF_PROCESSING' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="filename">文件名</Label>
                                    <Input
                                        id="filename"
                                        placeholder="example.pdf"
                                        value={filename}
                                        onChange={(e) => setFilename(e.target.value)}
                                    />
                                </div>
                            )}

                            {queueName === 'DOCUMENT_INDEXING' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="documentId">文档ID</Label>
                                    <Input
                                        id="documentId"
                                        placeholder="doc-123"
                                        value={documentId}
                                        onChange={(e) => setDocumentId(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSubmit} disabled={isLoading}>
                            {isLoading ? '添加中...' : '添加任务'}
                        </Button>
                    </CardFooter>
                </Card>

                {result && (
                    <Card>
                        <CardHeader>
                            <CardTitle>结果</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted p-4 rounded-md overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {status && (
                    <Card>
                        <CardHeader>
                            <CardTitle>队列状态</CardTitle>
                            <CardDescription>所有队列的当前状态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4">
                                {status.queues && status.queues.map((queue: any) => (
                                    <div key={queue.name} className="border rounded-md p-4">
                                        <h3 className="font-medium mb-2">{queue.name}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">等待中</span>
                                                <span className="text-2xl font-bold">{queue.waiting || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">处理中</span>
                                                <span className="text-2xl font-bold">{queue.active || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">已完成</span>
                                                <span className="text-2xl font-bold">{queue.completed || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">失败</span>
                                                <span className="text-2xl font-bold">{queue.failed || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4 text-sm text-muted-foreground">
                                更新时间: {new Date(status.timestamp || Date.now()).toLocaleString()}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
} 