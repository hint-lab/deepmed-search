'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { uploadFileAction } from '@/actions/file-upload';

export default function DocumentTestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [documentId, setDocumentId] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [summary, setSummary] = useState<string>('');
    const [summarizing, setSummarizing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('请先选择文件');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const data = await uploadFileAction([file]);

            if (data.success) {
                const uploadedFile = data.data.success_count > 0 ? data.data.files?.[0] : null;
                if (uploadedFile) {
                    setDocumentId(uploadedFile.id);
                    toast.success(`文件上传成功，文档ID: ${uploadedFile.id}`);
                } else {
                    toast.error('文件上传成功但未获取到文档ID');
                }
                setFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } else {
                setError(data.error || '上传失败');
                toast.error(data.error || '上传失败');
            }
        } catch (err) {
            setError('上传请求失败');
            toast.error('上传请求失败');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleProcess = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!documentId) {
            toast.error('请先上传文档');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const model = formData.get('model') as string || 'gpt-4';
        const maintainFormat = formData.get('maintainFormat') === 'on';
        const prompt = formData.get('prompt') as string || '';

        setProcessing(true);
        setError('');
        setResult(null);

        try {
            const response = await fetch(`/api/documents/${documentId}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    processor: 'zerox',
                    options: {
                        model,
                        maintainFormat,
                        prompt,
                    },
                }),
            });

            const data = await response.json();

            if (data.success) {
                setResult(data);
                toast.success('文档处理成功');
            } else {
                setError(data.error || '处理失败');
                toast.error(data.error || '处理失败');
            }
        } catch (err) {
            setError('处理请求失败');
            toast.error('处理请求失败');
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    const handleSummarize = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!documentId) {
            toast.error('请先上传文档');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const maxLength = parseInt(formData.get('maxLength') as string) || 300;
        const format = formData.get('format') as string || 'paragraph';

        setSummarizing(true);
        setError('');
        setSummary('');

        try {
            const response = await fetch(`/api/documents/${documentId}/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    options: {
                        maxLength,
                        format,
                    },
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSummary(data.content);
                toast.success('摘要生成成功');
            } else {
                setError(data.error || '摘要生成失败');
                toast.error(data.error || '摘要生成失败');
            }
        } catch (err) {
            setError('摘要请求失败');
            toast.error('摘要请求失败');
            console.error(err);
        } finally {
            setSummarizing(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">文档解析服务测试</h1>
            <p className="mb-6 text-muted-foreground">
                此页面用于测试文档解析服务，包括上传文档和使用zerox处理器进行处理。
            </p>

            <Separator className="my-6" />

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>上传文档</CardTitle>
                    <CardDescription>选择并上传要处理的文档</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            选择文件
                        </Button>
                        {file && <span className="ml-4">{file.name}</span>}
                    </div>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="w-full sm:w-auto"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                上传中
                            </>
                        ) : (
                            '开始上传'
                        )}
                    </Button>
                    {documentId && (
                        <div className="flex items-center text-green-600">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            文档ID: {documentId}
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center text-red-600">
                            <XCircle className="mr-2 h-4 w-4" />
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>处理文档</CardTitle>
                    <CardDescription>使用zerox处理器处理文档</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProcess} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="documentId">文档ID</Label>
                            <Input
                                id="documentId"
                                name="documentId"
                                value={documentId}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">模型</Label>
                            <Select name="model" defaultValue="gpt-4">
                                <SelectTrigger>
                                    <SelectValue placeholder="选择模型" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
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
                                    处理中
                                </>
                            ) : (
                                '开始处理'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>生成摘要</CardTitle>
                    <CardDescription>为文档生成摘要</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSummarize} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="summaryDocumentId">文档ID</Label>
                            <Input
                                id="summaryDocumentId"
                                name="documentId"
                                value={documentId}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="maxLength">最大长度</Label>
                            <Input
                                id="maxLength"
                                name="maxLength"
                                type="number"
                                defaultValue={300}
                                min={50}
                                max={2000}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="format">格式</Label>
                            <Select name="format" defaultValue="paragraph">
                                <SelectTrigger>
                                    <SelectValue placeholder="选择格式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="paragraph">段落</SelectItem>
                                    <SelectItem value="bullet">要点列表</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" disabled={summarizing} className="w-full">
                            {summarizing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    生成中
                                </>
                            ) : (
                                '生成摘要'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>处理结果</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {processing ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
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
                                    <span>{result.metadata?.pages?.length || 0}</span>
                                </div>
                                <div>
                                    <span className="font-medium">内容预览: </span>
                                    <ScrollArea className="mt-2 h-60 w-full rounded-md border p-4">
                                        <pre className="whitespace-pre-wrap">
                                            {result.content?.substring(0, 500)}...
                                        </pre>
                                    </ScrollArea>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {summary && (
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>文档摘要</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {summarizing ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : (
                            <ScrollArea className="h-60 w-full rounded-md border p-4">
                                <pre className="whitespace-pre-wrap">{summary}</pre>
                            </ScrollArea>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
