'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, X, Loader2, ExternalLink, Database, HardDrive, Download } from 'lucide-react';
import { uploadFileAction, DocumentType } from '@/actions/file-upload';
import { getMinioStatusAction, getFileUrlAction } from '@/actions/minio';
import { FileUploader } from '@/components/file-uploader';
import { MinioServerStatus } from '@/lib/minio';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UploadTestPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [minioStatus, setMinioStatus] = useState<MinioServerStatus | null>(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [documentType, setDocumentType] = useState<DocumentType>('UPLOAD');
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    // 获取 MinIO 状态
    const fetchMinioStatus = async () => {
        setLoadingStatus(true);
        try {
            const response = await getMinioStatusAction();
            if (response.success && response.data) {
                setMinioStatus(response.data);
            }
        } catch (error) {
            console.error('获取 MinIO 状态失败:', error);
        } finally {
            setLoadingStatus(false);
        }
    };

    // 获取文件预签名URL
    const getFileUrl = async (bucketName: string, objectName: string) => {
        try {
            console.log('正在获取文件URL:', { bucketName, objectName });
            const response = await getFileUrlAction(bucketName, objectName);
            console.log('获取文件URL响应:', response);

            if (response.success && response.data) {
                setDownloadUrl(response.data);
                console.log('设置下载URL:', response.data);
            } else {
                console.error('获取文件下载URL失败:', response.error);
            }
        } catch (error) {
            console.error('获取文件URL失败:', error);
        }
    };

    // 页面加载时获取状态
    useEffect(() => {
        fetchMinioStatus();
    }, []);

    // 在上传成功后获取文件URL
    useEffect(() => {
        const fetchUrl = async () => {
            if (result?.success && result.data?.bucketName && result.data?.objectName) {
                await getFileUrl(result.data.bucketName, result.data.objectName);
            }
        };
        fetchUrl();
    }, [result]);

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
            const uploadResult = await uploadFileAction(file, documentType);
            setResult(uploadResult);

            // 上传成功后刷新 MinIO 状态
            if (uploadResult.success) {
                fetchMinioStatus();
            }
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

    // 格式化文件大小
    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="pt-24 mx-auto container max-w-3xl py-10">
            <h1 className="text-2xl font-bold mb-6">文件上传测试</h1>

            {/* MinIO 状态卡片 */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Database className="mr-2 h-5 w-5" />
                            <CardTitle>MinIO 服务器状态</CardTitle>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchMinioStatus}
                            disabled={loadingStatus}
                        >
                            {loadingStatus ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                '刷新'
                            )}
                        </Button>
                    </div>
                    <CardDescription>
                        显示 MinIO 服务器的状态和存储桶信息
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {minioStatus ? (
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <div className={`size-3 rounded-full mr-2 animate-pulse ${minioStatus.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                                <span className="font-medium">状态: {minioStatus.status === 'healthy' ? '正常' : '异常'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted rounded-md">
                                    <div className="text-sm text-muted-foreground">总存储量</div>
                                    <div className="text-lg font-medium">{formatFileSize(minioStatus.totalSize)}</div>
                                </div>
                                <div className="p-3 bg-muted rounded-md">
                                    <div className="text-sm text-muted-foreground">总对象数</div>
                                    <div className="text-lg font-medium">{minioStatus.totalObjects}</div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium mb-2">存储桶列表</h3>
                                <div className="space-y-2">
                                    {minioStatus.buckets.map((bucket) => (
                                        <div key={bucket.name} className="p-3 bg-muted rounded-md">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <HardDrive className="mr-2 h-4 w-4" />
                                                    <span className="font-medium">{bucket.name}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <div className="text-sm text-muted-foreground">
                                                        {bucket.objects} 个对象
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-1 text-sm text-muted-foreground">
                                                大小: {formatFileSize(bucket.size)}
                                            </div>
                                            {bucket.folders && bucket.folders.length > 0 && (
                                                <div className="mt-2">
                                                    <div className="text-sm font-medium mb-1">文件夹结构:</div>
                                                    <div className="space-y-1">
                                                        {bucket.folders.map((folder, index) => (
                                                            <div key={index} className="text-sm text-muted-foreground pl-2">
                                                                📁 {folder.path} ({formatFileSize(folder.size)}, {folder.files} 个文件, {folder.subfolders} 个子文件夹)
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-32">
                            {loadingStatus ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <div className="text-muted-foreground">加载中...</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                        <Label htmlFor="documentType">选择文档类型</Label>
                                        <Select
                                            value={documentType}
                                            onValueChange={(value) => setDocumentType(value as DocumentType)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择文档类型" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="UPLOAD">普通上传文档</SelectItem>
                                                <SelectItem value="KB">知识库文档</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
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
                                                <span>文件 <strong>{result.data.name}</strong> 上传成功</span>
                                            </div>

                                            <div className="p-2 bg-muted rounded-md">
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">文件大小:</span>
                                                    <span className="text-sm">{formatFileSize(result.data.size)}</span>
                                                </div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">文件类型:</span>
                                                    <span className="text-sm">{result.data.type}</span>
                                                </div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">存储位置:</span>
                                                    <span className="text-sm">{result.data.bucketName}/{result.data.objectName}</span>
                                                </div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm font-medium">文档类型:</span>
                                                    <span className="text-sm">{result.data.documentType}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                {downloadUrl && (
                                                    <a
                                                        href={downloadUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-500 hover:underline flex items-center"
                                                    >
                                                        下载文件
                                                        <Download className="ml-1 h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
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
                                    // 上传成功后刷新 MinIO 状态
                                    fetchMinioStatus();
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