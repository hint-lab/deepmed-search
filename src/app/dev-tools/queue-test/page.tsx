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
import { addTaskAction, getTaskStatusAction, checkQueueHealthAction } from '@/actions/queue';
import { TASK_TYPES, TaskType } from '@/lib/queue';

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
    const [jobId, setJobId] = useState<string | null>(null);
    const [queueServiceUrl, setQueueServiceUrl] = useState<string>('http://localhost:5000');
    const [showConfig, setShowConfig] = useState<boolean>(false);
    const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
    const [connectionTestResult, setConnectionTestResult] = useState<any>(null);

    // 保存队列服务URL到localStorage
    useEffect(() => {
        const savedUrl = localStorage.getItem('queueServiceUrl');
        if (savedUrl) {
            setQueueServiceUrl(savedUrl);
        }
    }, []);

    const saveQueueServiceUrl = () => {
        localStorage.setItem('queueServiceUrl', queueServiceUrl);
        // 显示成功消息
        alert('队列服务URL已更新，新的请求将使用此URL');
    };

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
            let data;
            let taskType: TaskType;

            switch (queueName) {
                case 'PDF_PROCESSING':
                    taskType = TASK_TYPES.PDF_PROCESS;
                    data = { filename };
                    break;
                case 'DOCUMENT_INDEXING':
                    taskType = TASK_TYPES.DOCUMENT_INDEX;
                    data = { documentId };
                    break;
                case 'DOCUMENT_CONVERT_TO_MARKDOWN':
                    taskType = TASK_TYPES.DOCUMENT_CONVERT;
                    data = { documentId };
                    break;
                default:
                    throw new Error('不支持的队列类型');
            }

            const result = await addTaskAction(taskType, data);
            setResult(result);

            if (result.success && result.jobId) {
                setJobId(result.jobId);
            }

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
            console.log('开始健康测试，队列服务URL:', queueServiceUrl);

            // 使用Server Action检查队列健康状态
            console.log('正在请求健康状态...');
            const healthResult = await checkQueueHealthAction();
            console.log('健康状态结果:', healthResult);

            if (!healthResult.success) {
                throw new Error(healthResult.error || '获取队列健康状态失败');
            }

            // 添加一个测试任务来检查系统健康状态
            console.log('正在添加系统任务...');
            const result = await addTaskAction(TASK_TYPES.SYSTEM_TASK, {
                action: 'health_check',
                timestamp: Date.now()
            });
            console.log('系统任务添加结果:', result);

            // 合并健康状态和任务结果
            const finalHealthResult = {
                success: result.success,
                jobId: result.jobId,
                timestamp: new Date().toISOString(),
                duration: Date.now() - new Date(healthResult.timestamp || Date.now()).getTime(),
                overallStatus: healthResult.status || 'unknown',
                redis: healthResult.redis || { status: 'unknown' },
                queues: healthResult.queues || {},
                performance: healthResult.performance || {
                    totalJobs: 0,
                    activeJobs: 0,
                    completedJobs: 0,
                    failedJobs: 0
                }
            };

            console.log('设置健康测试结果:', finalHealthResult);
            setHealthResult(finalHealthResult);

            // 刷新状态
            if (result.success && result.jobId) {
                setJobId(result.jobId);
            }
        } catch (error) {
            console.error('健康测试失败:', error);
            setHealthResult({
                success: false,
                error: '健康测试失败',
                details: error instanceof Error ? error.message : '未知错误',
                timestamp: new Date().toISOString()
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

    // 测试队列服务连接
    const testQueueConnection = async () => {
        setIsTestingConnection(true);
        setConnectionTestResult(null);

        try {
            // 使用 API 路由而不是直接访问队列服务
            const response = await fetch('/api/queue-health');

            if (!response.ok) {
                throw new Error(`连接失败: ${response.statusText}`);
            }

            const data = await response.json();
            setConnectionTestResult({
                success: true,
                data,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('连接测试失败:', error);
            setConnectionTestResult({
                success: false,
                error: error instanceof Error ? error.message : '未知错误',
                timestamp: new Date().toISOString()
            });
        } finally {
            setIsTestingConnection(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-6">队列系统测试 (Server Actions)</h1>

            {/* 队列服务配置 */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>队列服务配置</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            {showConfig ? '隐藏配置' : '显示配置'}
                        </Button>
                    </div>
                    <CardDescription>配置队列服务的连接信息</CardDescription>
                </CardHeader>
                {showConfig && (
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="queueServiceUrl">队列服务URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="queueServiceUrl"
                                        value={queueServiceUrl}
                                        onChange={(e) => setQueueServiceUrl(e.target.value)}
                                        placeholder="http://localhost:5000"
                                    />
                                    <Button onClick={saveQueueServiceUrl}>保存</Button>
                                    <Button
                                        variant="outline"
                                        onClick={testQueueConnection}
                                        disabled={isTestingConnection}
                                    >
                                        {isTestingConnection ? '测试中...' : '测试连接'}
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    当前队列服务: {queueServiceUrl}
                                </p>

                                {/* 连接测试结果 */}
                                {connectionTestResult && (
                                    <div className={`mt-2 p-3 rounded-md ${connectionTestResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        <div className="font-medium">
                                            {connectionTestResult.success ? '连接成功' : '连接失败'}
                                        </div>
                                        {connectionTestResult.success ? (
                                            <div className="text-sm mt-1">
                                                <div>状态: {connectionTestResult.data.status || '正常'}</div>
                                                <div>版本: {connectionTestResult.data.version || '未知'}</div>
                                            </div>
                                        ) : (
                                            <div className="text-sm mt-1">
                                                错误: {connectionTestResult.error}
                                            </div>
                                        )}
                                        <div className="text-xs mt-1 opacity-70">
                                            测试时间: {new Date(connectionTestResult.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

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

                                {queueName === 'DOCUMENT_CONVERT_TO_MARKDOWN' && (
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
                            <CardTitle>健康测试</CardTitle>
                            <CardDescription>测试队列服务的健康状态</CardDescription>
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
                                                {healthResult.redis.error && healthResult.redis.status !== 'connected' && (
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

                                {/* 性能统计 */}
                                {healthResult.performance && (
                                    <div className="mt-4">
                                        <h3 className="text-sm font-medium mb-2">性能统计</h3>
                                        <div className="bg-muted rounded-md p-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">总任务数</span>
                                                    <span className="text-xl font-bold">{healthResult.performance.totalJobs || 0}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">活动任务</span>
                                                    <span className="text-xl font-bold">{healthResult.performance.activeJobs || 0}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">完成任务</span>
                                                    <span className="text-xl font-bold">{healthResult.performance.completedJobs || 0}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-muted-foreground">失败任务</span>
                                                    <span className="text-xl font-bold">{healthResult.performance.failedJobs || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 错误信息 */}
                                {healthResult.error && (
                                    <div className="mt-4 p-3 bg-red-100 text-red-800 rounded-md">
                                        <h3 className="font-medium mb-1">测试失败</h3>
                                        <p className="text-sm">{healthResult.error}</p>
                                        {healthResult.details && (
                                            <p className="text-sm mt-2">{healthResult.details}</p>
                                        )}
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
                            {status.queues && typeof status.queues === 'object' && Object.keys(status.queues).length > 0 ? (
                                Object.entries(status.queues).map(([queueName, queueInfo]: [string, any]) => (
                                    <div key={queueName} className="border rounded-md p-4">
                                        <h3 className="font-medium mb-2">{queueName}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">等待中</span>
                                                <span className="text-2xl font-bold">{queueInfo.details?.jobCounts?.waiting || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">处理中</span>
                                                <span className="text-2xl font-bold">{queueInfo.details?.jobCounts?.active || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">已完成</span>
                                                <span className="text-2xl font-bold">{queueInfo.details?.jobCounts?.completed || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground">失败</span>
                                                <span className="text-2xl font-bold">{queueInfo.details?.jobCounts?.failed || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center p-4 text-muted-foreground">
                                    暂无队列数据，请先运行健康测试
                                </div>
                            )}
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