'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, ServerCrash, Check, AlertTriangle, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function McpTestPage() {
    const [endpoint, setEndpoint] = useState(process.env.NEXT_PUBLIC_AI_API_BASE || 'https://api.941chat.com');
    const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_AI_API_KEY || '');
    const [testType, setTestType] = useState('ping');
    const [requestPayload, setRequestPayload] = useState('{\n  "test": true\n}');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | 'pending' | null>(null);
    const [tavilyApiKey, setTavilyApiKey] = useState('');

    const testTypes = [
        { value: 'ping', label: '连接测试 (Ping)' },
        { value: 'echo', label: '回显测试 (Echo)' },
        { value: 'auth', label: '认证测试 (Auth)' },
        { value: 'custom', label: '自定义请求 (Custom)' },
        { value: 'completion', label: '文本补全 (Completion)' },
        { value: 'tavily_search', label: 'Tavily搜索 (Search)' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-green-500 text-white';
            case 'error':
                return 'bg-red-500 text-white';
            case 'pending':
                return 'bg-yellow-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <Check className="h-4 w-4" />;
            case 'error':
                return <AlertTriangle className="h-4 w-4" />;
            case 'pending':
                return <Loader2 className="h-4 w-4 animate-spin" />;
            default:
                return null;
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setResult(null);
        setConnectionStatus('pending');

        try {
            // 准备基本请求数据
            let url = endpoint;
            let method = 'POST';
            let headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

            if (apiKey && testType !== 'tavily_search') {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            let body: any;

            // 根据测试类型配置请求
            switch (testType) {
                case 'ping':
                    url = `${endpoint}/health`;
                    method = 'GET';
                    break;

                case 'echo':
                    url = `${endpoint}/echo`;
                    body = JSON.parse(requestPayload);
                    break;

                case 'auth':
                    url = `${endpoint}/auth/validate`;
                    // 不需要请求体，只检查API密钥
                    break;

                case 'completion':
                    url = `${endpoint}/v1/chat/completions`;
                    // 构建OpenAI格式的请求
                    body = {
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: JSON.parse(requestPayload).prompt || "Hello, how are you?"
                            }
                        ]
                    };
                    break;

                case 'tavily_search':
                    url = 'https://api.tavily.com/search';
                    headers['Content-Type'] = 'application/json';
                    if (tavilyApiKey) {
                        headers['Authorization'] = `Bearer ${tavilyApiKey}`;
                    } else {
                        throw new Error('Tavily API密钥未设置');
                    }
                    body = JSON.parse(requestPayload);
                    break;

                case 'custom':
                    // 使用用户输入的JSON
                    body = JSON.parse(requestPayload);
                    break;

                default:
                    body = {};
            }

            // 记录请求信息
            const requestInfo = {
                endpoint: url,
                method,
                headers,
                body: method !== 'GET' ? body : undefined
            };

            // 发送真实请求
            const startTime = Date.now();
            const response = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' ? JSON.stringify(body) : undefined,
                // 设置较长的超时时间，特别是对于模型请求
                cache: 'no-store'
            });

            const responseTime = Date.now() - startTime;

            let responseData;
            let responseText = '';

            try {
                responseData = await response.json();
            } catch (e) {
                // 如果响应不是JSON格式
                responseText = await response.text();
                responseData = { raw_text: responseText };
            }

            setResult({
                request: requestInfo,
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: responseData
                },
                responseTime,
                timestamp: new Date().toISOString()
            });

            setConnectionStatus(response.ok ? 'success' : 'error');

            if (!response.ok) {
                toast.error(`请求失败: ${response.status} ${response.statusText}`);
            }

        } catch (err) {
            console.error('API请求失败:', err);
            setResult({
                error: err instanceof Error ? err.message : '请求失败',
                request: {
                    endpoint,
                    method: 'POST',
                    body: testType !== 'ping' ? requestPayload : undefined
                },
                timestamp: new Date().toISOString()
            });
            setConnectionStatus('error');
            toast.error('请求失败: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setIsLoading(false);
        }
    };

    const formatJson = (obj: any): string => {
        return JSON.stringify(obj, null, 2);
    };

    // 当测试类型改变时，更新请求体模板
    const handleTestTypeChange = (value: string) => {
        setTestType(value);
        if (value === 'tavily_search' && requestPayload === '{\n  "test": true\n}') {
            setRequestPayload('{\n  "query": "What is the latest news about AI?",\n  "search_depth": "basic",\n  "include_domains": [],\n  "exclude_domains": [],\n  "max_results": 5\n}');
        } else if (value === 'completion' && requestPayload === '{\n  "test": true\n}') {
            setRequestPayload('{\n  "prompt": "Tell me a short story about a robot"\n}');
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-4xl py-10">
            <h1 className="text-2xl font-bold mb-6">MCP API 测试工具</h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>API 配置</CardTitle>
                        <CardDescription>设置API端点和认证信息</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="endpoint">API 端点</Label>
                                <Input
                                    id="endpoint"
                                    placeholder="https://api.example.com"
                                    value={endpoint}
                                    onChange={(e) => setEndpoint(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="api-key">API 密钥</Label>
                                <Input
                                    id="api-key"
                                    type="password"
                                    placeholder="输入API密钥..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>
                            {testType === 'tavily_search' && (
                                <div className="grid gap-2 mt-4 border-t pt-4">
                                    <Label htmlFor="tavily-api-key" className="flex items-center">
                                        <Search className="h-4 w-4 mr-2" />
                                        Tavily API 密钥
                                    </Label>
                                    <Input
                                        id="tavily-api-key"
                                        type="password"
                                        placeholder="输入Tavily API密钥..."
                                        value={tavilyApiKey}
                                        onChange={(e) => setTavilyApiKey(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        需要单独的Tavily API密钥才能进行搜索请求
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>测试请求</CardTitle>
                        <CardDescription>选择测试类型并发送请求</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="test-type">测试类型</Label>
                                <Select value={testType} onValueChange={handleTestTypeChange}>
                                    <SelectTrigger id="test-type">
                                        <SelectValue placeholder="选择测试类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {testTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {testType !== 'ping' && testType !== 'auth' && (
                                <div className="grid gap-2">
                                    <Label htmlFor="request-payload">请求数据</Label>
                                    {testType === 'completion' && (
                                        <p className="text-xs text-muted-foreground mb-2">
                                            以下是文本补全的示例JSON。修改"prompt"字段中的文本以更改请求。
                                        </p>
                                    )}
                                    {testType === 'tavily_search' && (
                                        <p className="text-xs text-muted-foreground mb-2">
                                            这是Tavily搜索API的示例请求。修改"query"字段以更改搜索内容。
                                        </p>
                                    )}
                                    <Textarea
                                        id="request-payload"
                                        className="font-mono text-sm min-h-[150px]"
                                        placeholder={'{\n  "key": "value"\n}'}
                                        value={requestPayload}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRequestPayload(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || (testType === 'tavily_search' && !tavilyApiKey)}
                            className="w-full"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    处理中...
                                </>
                            ) : (
                                <>
                                    <ServerCrash className="mr-2 h-4 w-4" />
                                    发送请求
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>

                {result && (
                    <Tabs defaultValue="formatted">
                        <TabsList className="mb-2">
                            <TabsTrigger value="formatted">格式化结果</TabsTrigger>
                            <TabsTrigger value="raw">原始数据</TabsTrigger>
                        </TabsList>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>
                                        响应结果
                                        {connectionStatus && (
                                            <Badge className={`ml-2 ${getStatusColor(connectionStatus)}`}>
                                                <span className="flex items-center">
                                                    {getStatusIcon(connectionStatus)}
                                                    <span className="ml-1">
                                                        {connectionStatus === 'success' ? '连接成功' :
                                                            connectionStatus === 'error' ? '连接失败' : '连接中'}
                                                    </span>
                                                </span>
                                            </Badge>
                                        )}
                                    </CardTitle>
                                    <CardDescription>
                                        时间: {new Date(result.timestamp).toLocaleString()}
                                        {result.responseTime && <> (耗时: {result.responseTime}ms)</>}
                                    </CardDescription>
                                </div>
                            </CardHeader>

                            <TabsContent value="formatted">
                                <CardContent>
                                    <div className="grid gap-4">
                                        <div>
                                            <h3 className="text-sm font-medium mb-2">请求</h3>
                                            <div className="bg-muted rounded-md p-3 text-sm">
                                                <div className="mb-2">
                                                    <span className="font-bold">URL:</span> {result.request.endpoint}
                                                </div>
                                                <div className="mb-2">
                                                    <span className="font-bold">方法:</span> {result.request.method}
                                                </div>
                                                {result.request.headers && (
                                                    <div className="mb-2">
                                                        <span className="font-bold">请求头:</span>
                                                        <pre className="mt-1 text-xs whitespace-pre-wrap">
                                                            {formatJson(result.request.headers)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {result.request.body && (
                                                    <div>
                                                        <span className="font-bold">请求体:</span>
                                                        <pre className="mt-1 text-xs whitespace-pre-wrap">
                                                            {typeof result.request.body === 'string' ?
                                                                result.request.body :
                                                                formatJson(result.request.body)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <ArrowRight className="text-muted-foreground" />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium mb-2">响应</h3>
                                            <div className="bg-muted rounded-md p-3 text-sm">
                                                {result.error ? (
                                                    <div className="text-red-500">
                                                        <span className="font-bold">错误:</span> {result.error}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="mb-2">
                                                            <span className="font-bold">状态码:</span> {result.response.status} {result.response.statusText}
                                                        </div>
                                                        <div>
                                                            <span className="font-bold">响应数据:</span>
                                                            <pre className="mt-1 text-xs whitespace-pre-wrap">
                                                                {formatJson(result.response.data)}
                                                            </pre>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </TabsContent>

                            <TabsContent value="raw">
                                <CardContent>
                                    <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                                        {formatJson(result)}
                                    </pre>
                                </CardContent>
                            </TabsContent>
                        </Card>
                    </Tabs>
                )}
            </div>
        </div>
    );
} 