'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addJobToQueue, getAllQueueStatus, testQueueHealth } from '@/actions/queue-actions';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function QueueTestPage() {
    const [queueName, setQueueName] = useState('PDF_PROCESSING');
    const [filename, setFilename] = useState('example.pdf');
    const [documentId, setDocumentId] = useState('doc-123');
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [healthResult, setHealthResult] = useState<any>(null);
    const [isTestingHealth, setIsTestingHealth] = useState(false);
    const [activeTab, setActiveTab] = useState('add');

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
            } else if (queueName === 'DOCUMENT_CONVERT_TO_MARKDOWN') {
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

    const handleHealthTest = async () => {
        setIsTestingHealth(true);
        setHealthResult(null);

        try {
            const result = await testQueueHealth();
            setHealthResult(result);
            // 刷新状态
            fetchStatus();
        } catch (error) {
            console.error('健康测试失败:', error);
            setHealthResult({
                success: false,
                error: '健康测试失败',
                details: (error as Error).message
            });
        } finally {
            setIsTestingHealth(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'connected':
            case 'success':
                return 'bg-green-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
            case 'error':
            case 'critical':
            case 'missing':
                return 'bg-red-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'connected':
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error':
            case 'critical':
            case 'missing':
                return <XCircle className="h-5 w-5 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-6">队列系统测试 (Server Actions)</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="add">添加任务</TabsTrigger>
                    <TabsTrigger value="health">健康测试</TabsTrigger>
                </TabsList>

                <TabsContent value="add" className="mt-6">
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
                                            <SelectItem value="DOCUMENT_CONVERT_TO_MARKDOWN">文档转换为Markdown</SelectItem>
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
                        <Card className="mt-6">
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
                </TabsContent>

                <TabsContent value="health" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>队列健康测试</CardTitle>
                            <CardDescription>测试Redis连接和Bullmq队列系统健康状态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4 text-sm text-muted-foreground">
                                点击下方按钮运行健康测试，测试会检查以下内容:
                            </p>
                            <ul className="list-disc pl-5 mb-4 text-sm text-muted-foreground space-y-1">
                                <li>Redis连接状态</li>
                                <li>每个队列的可用性</li>
                                <li>添加测试任务能力</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleHealthTest} disabled={isTestingHealth}>
                                {isTestingHealth ? '测试中...' : '运行健康测试'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {healthResult && (
                        <Card className="mt-6">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>健康测试结果</CardTitle>
                                    {healthResult.overallStatus && (
                                        <Badge className={getStatusColor(healthResult.overallStatus)}>
                                            {healthResult.overallStatus === 'healthy' ? '健康' :
                                                healthResult.overallStatus === 'warning' ? '警告' : '严重'}
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    测试耗时: {healthResult.duration ? `${healthResult.duration}ms` : '未知'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Redis 连接状态 */}
                                {healthResult.redis && (
                                    <div className="mb-4">
                                        <h3 className="text-sm font-medium mb-2">Redis连接</h3>
                                        <div className="bg-muted rounded-md p-3 flex items-center gap-2">
                                            {getStatusIcon(healthResult.redis.status)}
                                            <div>
                                                <div className="font-medium">
                                                    状态: {healthResult.redis.status === 'connected' ? '已连接' : '连接失败'}
                                                </div>
                                                {healthResult.redis.details && (
                                                    <div className="text-sm text-muted-foreground">
                                                        {healthResult.redis.details}
                                                    </div>
                                                )}
                                                {healthResult.redis.error && (
                                                    <div className="text-sm text-red-500">
                                                        错误: {healthResult.redis.error}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 队列状态 */}
                                {healthResult.queues && Object.keys(healthResult.queues).length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-medium mb-2">队列状态</h3>
                                        <div className="space-y-2">
                                            {Object.entries(healthResult.queues).map(([queueName, queueInfo]: [string, any]) => (
                                                <div key={queueName} className="bg-muted rounded-md p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium">{queueName}</span>
                                                        <Badge className={getStatusColor(queueInfo.status)}>
                                                            {queueInfo.status === 'healthy' ? '健康' :
                                                                queueInfo.status === 'missing' ? '缺失' : '错误'}
                                                        </Badge>
                                                    </div>

                                                    {queueInfo.error && (
                                                        <div className="text-sm text-red-500 mb-2">
                                                            错误: {queueInfo.error}
                                                        </div>
                                                    )}

                                                    {queueInfo.testJob && (
                                                        <div className="text-sm text-muted-foreground">
                                                            测试任务ID: {queueInfo.testJob.id}
                                                        </div>
                                                    )}

                                                    {queueInfo.details && (
                                                        <div className="mt-2 text-xs text-muted-foreground">
                                                            <div>等待中: {queueInfo.details.waiting || 0}</div>
                                                            <div>处理中: {queueInfo.details.active || 0}</div>
                                                            <div>已完成: {queueInfo.details.completed || 0}</div>
                                                            <div>失败: {queueInfo.details.failed || 0}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 错误信息 */}
                                {healthResult.error && (
                                    <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
                                        <h3 className="font-medium mb-1">测试失败</h3>
                                        <p className="text-sm">{healthResult.error}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <div className="text-sm text-muted-foreground">
                                    测试时间: {new Date(healthResult.timestamp).toLocaleString()}
                                </div>
                                <Button variant="outline" onClick={handleHealthTest} size="sm">
                                    重新测试
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* 始终显示队列状态卡片 */}
            {status && (
                <Card className="mt-6">
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
    );
} 