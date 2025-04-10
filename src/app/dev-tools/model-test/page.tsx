'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Pencil, MessagesSquare } from 'lucide-react';
import { createChatDialogAction, sendChatMessageAction } from '@/actions/chat';
import { toast } from 'sonner';

export default function ModelTestPage() {
    const [model, setModel] = useState('gpt-4o-mini');
    const [prompt, setPrompt] = useState('');
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(1000);
    const [streaming, setStreaming] = useState(false); // 设置为false，因为sendChatMessageAction不支持流式
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<number | null>(null);
    const [dialogId, setDialogId] = useState<string | null>(null);
    const [dialogCreated, setDialogCreated] = useState(false);

    const resultRef = useRef<HTMLDivElement>(null);

    // 在组件加载时创建测试对话
    useEffect(() => {
        async function createTestDialog() {
            try {
                const result = await createChatDialogAction({
                    name: `模型测试 - ${new Date().toLocaleString()}`
                });

                if (result.success && result.data) {
                    setDialogId(result.data.id);
                    setDialogCreated(true);
                    console.log('创建测试对话成功:', result.data.id);
                } else {
                    console.error('创建测试对话失败:', result.error);
                    setError(`创建对话失败: ${result.error}`);
                }
            } catch (err) {
                console.error('创建对话错误:', err);
                setError('创建对话时出现错误');
            }
        }

        if (!dialogCreated) {
            createTestDialog();
        }
    }, [dialogCreated]);

    const models = [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'claude-3-opus', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
    ];

    const handleSubmit = async () => {
        if (!prompt.trim() || !dialogId) return;

        setIsLoading(true);
        setResult(null);
        setError(null);
        setElapsedTime(null);

        const startTime = Date.now();

        try {
            // 构建增强的提示词，包含模型和参数信息
            const enhancedPrompt = `[模型: ${model}, 温度: ${temperature}, 最大令牌数: ${maxTokens}]\n\n${prompt}`;

            // 使用真实的sendChatMessageAction发送消息
            const response = await sendChatMessageAction(dialogId, enhancedPrompt);

            if (response.success && response.data) {
                // 获取助手响应内容
                setResult(response.data.assistantMessage.content);
            } else {
                throw new Error(response.error || '请求失败');
            }

            setElapsedTime(Date.now() - startTime);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '请求失败';
            setError(errorMessage);
            console.error('API请求失败:', err);
            toast.error('请求失败: ' + errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-4xl py-10">
            <h1 className="text-2xl font-bold mb-6">大模型测试工具</h1>

            {!dialogCreated && (
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <p>正在准备测试环境...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>模型参数设置</CardTitle>
                        <CardDescription>选择模型和设置参数 (注意: 实际模型由服务器端配置决定)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="model">选择模型</Label>
                                <Select value={model} onValueChange={setModel}>
                                    <SelectTrigger id="model">
                                        <SelectValue placeholder="选择一个模型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {models.map((model) => (
                                            <SelectItem key={model.value} value={model.value}>
                                                {model.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    这些是界面选项，实际使用的模型由服务器配置决定
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="temperature">温度 (Temperature): {temperature}</Label>
                                </div>
                                <Slider
                                    id="temperature"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={[temperature]}
                                    onValueChange={(value) => setTemperature(value[0])}
                                />
                                <p className="text-xs text-muted-foreground">
                                    控制生成文本的随机性。较低的值使输出更确定性，较高的值使输出更多样化。
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="max-tokens">最大令牌数 (Max Tokens): {maxTokens}</Label>
                                </div>
                                <Slider
                                    id="max-tokens"
                                    min={100}
                                    max={4000}
                                    step={100}
                                    value={[maxTokens]}
                                    onValueChange={(value) => setMaxTokens(value[0])}
                                />
                                <p className="text-xs text-muted-foreground">
                                    限制模型生成的最大令牌数量。
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Pencil className="h-5 w-5 mr-2" />
                                提示词 (Prompt)
                            </CardTitle>
                            <CardDescription>输入您的提示词</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                className="min-h-[200px]"
                                placeholder="请输入您的提示词..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                disabled={isLoading || !dialogCreated}
                            />
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleSubmit}
                                disabled={isLoading || !prompt.trim() || !dialogCreated}
                                className="w-full"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        处理中...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        发送请求
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <MessagesSquare className="h-5 w-5 mr-2" />
                                响应结果
                            </CardTitle>
                            {elapsedTime !== null && (
                                <CardDescription>请求耗时: {elapsedTime}ms</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div
                                ref={resultRef}
                                className="bg-muted rounded-md p-4 min-h-[200px] max-h-[300px] overflow-auto whitespace-pre-wrap"
                            >
                                {result ? (
                                    <div>{result}</div>
                                ) : error ? (
                                    <div className="text-red-500">{error}</div>
                                ) : (
                                    <div className="text-muted-foreground italic">
                                        响应将显示在这里...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
