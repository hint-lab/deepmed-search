'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';
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
import { uploadDocumentAction } from '@/actions/document';
import { createKnowledgeBaseAction, getKnowledgeBaseListAction } from '@/actions/knowledge-base';
import { getDocumentListAction, deleteDocumentAction } from '@/actions/document';

export default function DocumentTestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedDocumentId, setUploadedDocumentId] = useState<string>('');
    const [processingDocumentId, setProcessingDocumentId] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [summary, setSummary] = useState<string>('');
    const [summarizing, setSummarizing] = useState(false);
    const [hiddenKbId, setHiddenKbId] = useState<string>('');
    const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedParser, setSelectedParser] = useState<string>('normal');

    // 获取所有知识库，包括不可见的
    const fetchKnowledgeBases = async () => {
        try {
            const result = await getKnowledgeBaseListAction();
            console.log('获取知识库列表结果:', result);

            if (result.success) {
                const kbList = Array.isArray(result.data) ? result.data : [];
                console.log('知识库列表:', kbList);
                setKnowledgeBases(kbList);

                // 查找不可见的测试知识库
                console.log('查找条件:', {
                    name: '不可见测试知识库',
                    visible: false
                });

                const hiddenKb = kbList.find((kb: any) => {
                    // 安全地打印知识库对象，避免BigInt序列化问题
                    const safeKb = {
                        ...kb,
                        create_time: kb.create_time?.toString(),
                        update_time: kb.update_time?.toString()
                    };
                    console.log('知识库完整数据:', safeKb);
                    console.log('知识库属性列表:', Object.keys(kb));
                    return kb.name === '不可见测试知识库';
                });

                console.log('找到的不可见知识库:', hiddenKb);

                if (hiddenKb) {
                    setHiddenKbId(hiddenKb.id);
                }
            } else {
                console.error('获取知识库列表失败:', result.error);
                toast.error('获取知识库列表失败: ' + result.error);
            }
        } catch (err) {
            console.error('获取知识库列表失败:', err);
            toast.error('获取知识库列表失败');
        }
    };

    // 获取文档列表
    const fetchDocuments = async () => {
        if (!hiddenKbId) return;

        setLoadingDocs(true);
        try {
            const result = await getDocumentListAction(hiddenKbId);
            if (result.success) {
                setDocuments(result.data.docs || []);
            } else {
                toast.error('获取文档列表失败');
            }
        } catch (err) {
            console.error('获取文档列表失败:', err);
            toast.error('获取文档列表失败');
        } finally {
            setLoadingDocs(false);
        }
    };

    // 删除文档
    const handleDeleteDocument = async (docId: string) => {
        try {
            const result = await deleteDocumentAction(docId);
            if (result.success) {
                toast.success('文档删除成功');
                fetchDocuments(); // 刷新文档列表
            } else {
                toast.error(result.error || '删除失败');
            }
        } catch (err) {
            console.error('删除文档失败:', err);
            toast.error('删除文档失败');
        }
    };

    // 在组件加载时获取知识库列表
    useEffect(() => {
        fetchKnowledgeBases();
    }, []);

    // 在知识库ID变化时获取文档列表
    useEffect(() => {
        if (hiddenKbId) {
            fetchDocuments();
        }
    }, [hiddenKbId]);

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

        if (!hiddenKbId) {
            toast.error('知识库未创建，请稍候');
            return;
        }

        setUploading(true);
        setError('');

        try {
            const data = await uploadDocumentAction(hiddenKbId, [file]);
            console.log('上传结果:', data.data);

            if (data.success) {
                // 从返回的数据中获取文档ID
                const uploadedDocument = data.data.documents?.[0];
                if (uploadedDocument) {
                    setUploadedDocumentId(uploadedDocument.id);
                    setProcessingDocumentId(uploadedDocument.id);
                    toast.success(`文件上传成功，文档ID: ${uploadedDocument.id}`);
                    // 上传成功后刷新文档列表
                    fetchDocuments();
                } else {
                    toast.error('文件上传成功但未获取到文档ID');
                    console.error('上传响应数据:', data);
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

    const handleDocumentConvert = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!processingDocumentId) {
            toast.error('请先上传文档或输入文档ID');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const parser = formData.get('parser') as string || 'normal';
        const model = formData.get('model') as string || 'gpt-4o-mini';
        const maintainFormat = formData.get('maintainFormat') === 'on';
        const prompt = formData.get('prompt') as string || '';

        setProcessing(true);
        setError('');
        setResult(null);

        try {
            // 调用远端文档处理服务器
            const response = await fetch(`/api/documents/${processingDocumentId}/process`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    processor: parser,
                    options: parser === 'zerox' ? {
                        model,
                        maintainFormat,
                        prompt,
                    } : {},
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
        if (!processingDocumentId) {
            toast.error('请先上传文档或输入文档ID');
            return;
        }

        const formData = new FormData(e.currentTarget);
        const maxLength = parseInt(formData.get('maxLength') as string) || 300;
        const format = formData.get('format') as string || 'paragraph';

        setSummarizing(true);
        setError('');
        setSummary('');

        try {
            // 调用远端文档摘要服务器
            const response = await fetch(`/api/documents/${processingDocumentId}/summarize`, {
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
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-4">文档解析服务测试</h1>
            <p className="mb-6 text-muted-foreground">
                此页面用于测试文档解析服务，包括上传文档和使用zerox处理器进行处理。
            </p>

            <Separator className="my-6" />

            {/* 显示知识库信息 */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>知识库信息</CardTitle>
                    <CardDescription>当前使用的知识库</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div>
                                <span className="font-medium">当前测试知识库ID: </span>
                                <span>{hiddenKbId || '未创建'}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">文档列表</h3>
                                <Button
                                    onClick={fetchDocuments}
                                    variant="outline"
                                    size="sm"
                                    disabled={loadingDocs}
                                >
                                    {loadingDocs ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        '刷新'
                                    )}
                                </Button>
                            </div>
                            <ScrollArea className="h-[200px] w-full rounded-md border">
                                <div className="p-4">
                                    {documents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            暂无文档
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <FileText className="h-4 w-4" />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm">{doc.name}</span>
                                                            <span className="text-xs text-muted-foreground">ID: {doc.id}</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                    {uploadedDocumentId && (
                        <div className="flex items-center text-green-600">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            文档ID: {uploadedDocumentId}
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
                    <CardDescription>选择解析器处理文档</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleDocumentConvert} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="documentId">文档ID</Label>
                            <Input
                                id="documentId"
                                name="documentId"
                                value={processingDocumentId}
                                onChange={(e) => setProcessingDocumentId(e.target.value)}
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="parser">解析器</Label>
                            <Select
                                name="parser"
                                defaultValue="normal"
                                onValueChange={(value) => setSelectedParser(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="选择解析器" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="normal">普通解析器</SelectItem>
                                    <SelectItem value="zerox">Zerox解析器</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedParser === 'zerox' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="model">模型</Label>
                                    <Select name="model" defaultValue="gpt-4o-mini">
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择模型" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gpt-4o">GPT-4</SelectItem>
                                            <SelectItem value="gpt-4o-mini">GPT-4o-mini</SelectItem>
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
                            </>
                        )}

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
                                value={processingDocumentId}
                                onChange={(e) => setProcessingDocumentId(e.target.value)}
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
