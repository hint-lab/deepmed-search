'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, X, Loader2, ExternalLink } from 'lucide-react';
import { uploadFileToMinio } from '@/actions/file-upload-actions';
import { FileUploader } from '@/components/file-uploader';

export default function UploadTestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        try {
            // 创建FormData
            const formData = new FormData();
            formData.append('file', file);

            // 使用Server Action上传文件
            const uploadResult = await uploadFileToMinio(formData);
            setResult(uploadResult);
        } catch (error) {
            console.error('上传失败:', error);
            setResult({
                success: false,
                error: '上传失败',
                details: (error as Error).message
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-6">文件上传测试</h1>

            <Tabs defaultValue="simple">
                <TabsList className="mb-4">
                    <TabsTrigger value="simple">简单上传</TabsTrigger>
                    <TabsTrigger value="component">组件上传</TabsTrigger>
                </TabsList>

                <TabsContent value="simple">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>上传文件到MinIO</CardTitle>
                                <CardDescription>选择一个文件上传到MinIO存储</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="file">选择文件</Label>
                                        <Input
                                            id="file"
                                            type="file"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    {file && (
                                        <div className="text-sm">
                                            已选择: <span className="font-medium">{file.name}</span> ({Math.round(file.size / 1024)} KB)
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    onClick={handleUpload}
                                    disabled={!file || uploading}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            上传中...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            开始上传
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>

                        {result && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>上传结果</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.success ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center text-sm">
                                                <FileText className="mr-2 h-4 w-4 text-green-500" />
                                                <span>文件 <strong>{result.filename}</strong> 上传成功</span>
                                            </div>

                                            <div className="p-2 bg-muted rounded-md">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">文件大小:</span>
                                                    <span className="text-sm">{Math.round(result.size / 1024)} KB</span>
                                                </div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">文件类型:</span>
                                                    <span className="text-sm">{result.type}</span>
                                                </div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">存储位置:</span>
                                                    <span className="text-sm">{result.bucketName}/{result.objectName}</span>
                                                </div>
                                            </div>

                                            {result.fileUrl && (
                                                <div className="flex items-center">
                                                    <a
                                                        href={result.fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-500 hover:underline flex items-center"
                                                    >
                                                        打开文件
                                                        <ExternalLink className="ml-1 h-3 w-3" />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-red-500">
                                            <div className="font-semibold mb-2">上传失败</div>
                                            <div className="text-sm">{result.error}</div>
                                            {result.details && (
                                                <div className="text-xs mt-1 text-muted-foreground">{result.details}</div>
                                            )}
                                        </div>
                                    )}

                                    <details className="mt-4">
                                        <summary className="text-sm text-muted-foreground cursor-pointer">查看完整响应</summary>
                                        <pre className="bg-muted p-4 rounded-md overflow-auto mt-2 text-xs">
                                            {JSON.stringify(result, null, 2)}
                                        </pre>
                                    </details>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="component">
                    <Card>
                        <CardHeader>
                            <CardTitle>使用文件上传组件</CardTitle>
                            <CardDescription>测试FileUploader组件功能</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FileUploader
                                kbId="test-kb"
                                onSuccess={(data) => {
                                    setResult({
                                        success: true,
                                        componentUpload: true,
                                        ...data
                                    });
                                }}
                                onError={(error) => {
                                    setResult({
                                        success: false,
                                        componentUpload: true,
                                        error: error.message
                                    });
                                }}
                                buttonText="使用组件上传文件"
                                className="w-full"
                            />

                            {result && result.componentUpload && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-medium mb-2">组件上传结果</h3>
                                    <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                                        {JSON.stringify(result, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
} 