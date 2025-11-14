'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { checkQueueHealthAction, addTaskAction, getTaskStatusAction } from '@/actions/queue';
import { QUEUE_NAMES } from '@/lib/bullmq/queue-names';
import { TaskType } from '@/lib/bullmq/types';
import { toast } from 'sonner';

export default function QueueTestPage() {
    const [queueNames, setQueueNames] = useState<typeof QUEUE_NAMES>(QUEUE_NAMES);
    const [queueName, setQueueName] = useState<TaskType>(TaskType.DOCUMENT_CONVERT_TO_MD);
    const [documentId, setDocumentId] = useState('doc-123');
    const [status, setStatus] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [healthResult, setHealthResult] = useState<any>(null);
    const [isTestingHealth, setIsTestingHealth] = useState(false);
    const [activeTab, setActiveTab] = useState('add');
    const [jobId, setJobId] = useState<string | null>(null);


    const fetchStatus = async () => {
        if (!jobId) return;

        try {
            const data = await getTaskStatusAction(jobId);
            setStatus(data);
        } catch (error) {
            console.error('获取状态失败:', error);
        }
    };

    useEffect(() => {
        if (jobId) {
            fetchStatus();
            // 每5秒刷新一次状态
            const interval = setInterval(fetchStatus, 5000);
            return () => clearInterval(interval);
        }
    }, [jobId]);

    const handleSubmit = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const data = { documentId };
            const result = await addTaskAction(queueName, data);
            setResult(result);

            if (result.success && result.data?.jobId) {
                setJobId(result.data.jobId);
                // 立即获取任务状态
                const statusResult = await getTaskStatusAction(result.data.jobId);
                setStatus(statusResult);
                toast.success('任务已添加到队列');
            } else {
                toast.error(result.error || '添加任务失败');
            }

            // 刷新状态
            fetchStatus();
        } catch (error) {
            console.error('添加任务失败:', error);
            setResult({
                success: false,
                error: (error as Error).message
            });
            toast.error((error as Error).message || '添加任务失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleHealthCheck = async () => {
        setIsTestingHealth(true);
        setHealthResult(null);

        try {
            const result = await checkQueueHealthAction();
            setHealthResult(result);
            if (result.status === 'healthy') {
                toast.success('队列系统健康状态正常');
            } else {
                toast.warning('队列系统存在异常');
            }
        } catch (error) {
            console.error('健康检查失败:', error);
            setHealthResult({
                success: false,
                error: (error as Error).message
            });
            toast.error((error as Error).message || '健康检查失败');
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
        <div className="pt-24 mx-auto container max-w-4xl py-10">
            <h1 className="text-2xl font-bold mb-4">队列测试工具</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
                <TabsList>
                    <TabsTrigger value="health">健康检查</TabsTrigger>
                    <TabsTrigger value="add">添加任务</TabsTrigger>
                    <TabsTrigger value="status">任务状态</TabsTrigger>
                </TabsList>

                <TabsContent value="add">
                    <Card>
                        <CardHeader>
                            <CardTitle>添加任务</CardTitle>
                            <CardDescription>向指定队列添加新任务</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="queue">队列名称</Label>
                                    <Select value={queueName} onValueChange={setQueueName}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择队列" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={QUEUE_NAMES.DOCUMENT_TO_MARKDOWN}>
                                                文档转Markdown
                                            </SelectItem>
                                            <SelectItem value={QUEUE_NAMES.DOCUMENT_SPLIT_TO_CHUNKS}>
                                                文档分块
                                            </SelectItem>
                                            <SelectItem value={QUEUE_NAMES.CHUNK_VECTOR_INDEX}>
                                                块向量索引
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="documentId">文档ID</Label>
                                    <Input
                                        id="documentId"
                                        value={documentId}
                                        onChange={(e) => setDocumentId(e.target.value)}
                                        placeholder="输入文档ID"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? '添加中...' : '添加任务'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="status">
                    <Card>
                        <CardHeader>
                            <CardTitle>任务状态</CardTitle>
                            <CardDescription>查看任务执行状态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {status ? (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Label>状态:</Label>
                                        <Badge variant={status.state === 'completed' ? 'default' : 'secondary'}>
                                            {status.state}
                                        </Badge>
                                    </div>
                                    {status.progress !== undefined && (
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <Label>进度:</Label>
                                                <span>{Math.round(status.progress)}%</span>
                                            </div>
                                            <Progress value={status.progress} className="w-full" />
                                        </div>
                                    )}
                                    {status.result && (
                                        <div>
                                            <Label>结果:</Label>
                                            <pre className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto">
                                                {JSON.stringify(status.result, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p>暂无任务状态信息</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health">
                    <Card>
                        <CardHeader>
                            <CardTitle>健康检查</CardTitle>
                            <CardDescription>检查队列系统健康状态</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {healthResult ? (
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Label>队列状态:</Label>
                                        {healthResult.status === 'healthy' ? (
                                            <div className="flex items-center text-green-600">
                                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                                <span>健康</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center text-red-600">
                                                <AlertTriangle className="w-4 h-4 mr-1" />
                                                <span>不健康</span>
                                            </div>
                                        )}
                                    </div>
                                    {healthResult.redis && (
                                        <div className="flex items-center space-x-2">
                                            <Label>Redis状态:</Label>
                                            <div className="flex items-center space-x-2">
                                                {healthResult.redis.status === 'connected' ? (
                                                    <div className="flex items-center text-green-600">
                                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                                        <span>已连接</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-red-600">
                                                        <XCircle className="w-4 h-4 mr-1" />
                                                        <span>未连接</span>
                                                    </div>
                                                )}
                                            </div>
                                            {healthResult.redis.error && (
                                                <p className="text-red-600 mt-2">{healthResult.redis.error}</p>
                                            )}
                                        </div>
                                    )}
                                    {healthResult.queues && (
                                        <div>
                                            <Label>队列状态:</Label>
                                            <div className="mt-2 space-y-2">
                                                {Object.entries(healthResult.queues).map(([name, status]: [string, any]) => (
                                                    <div key={name} className="p-2 bg-gray-100 rounded-md">
                                                        <p className="font-medium">{name}</p>
                                                        {status.error ? (
                                                            <p className="text-red-600">{status.error}</p>
                                                        ) : (
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <div>
                                                                    <span className="text-gray-600">等待中:</span>
                                                                    <span className="ml-2">{status.waiting || 0}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600">处理中:</span>
                                                                    <span className="ml-2">{status.active || 0}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600">已完成:</span>
                                                                    <span className="ml-2">{status.completed || 0}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600">失败:</span>
                                                                    <span className="ml-2">{status.failed || 0}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p>暂无健康检查结果</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleHealthCheck} disabled={isTestingHealth}>
                                {isTestingHealth ? '检查中...' : '检查健康状态'}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 