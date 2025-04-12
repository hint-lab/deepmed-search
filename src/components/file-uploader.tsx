'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Upload, Loader2, X } from 'lucide-react';
import { uploadFileAction, DocumentType, getFileUrlAction } from '@/actions/file-upload';

import { Download } from 'lucide-react';

interface FileUploaderProps {
  kbId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}

export function FileUploader({
  kbId,
  onSuccess,
  onError,
  buttonText = '上传文件',
  className = '',
  disabled = false
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('UPLOAD');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 在上传成功后获取文件URL
  const fetchUrl = async () => {
    if (result?.success && result.data?.bucketName && result.data?.objectName) {
      await getFileUrl(result.data.bucketName, result.data.objectName);
    }
  };

  // 当结果变化时获取URL
  useEffect(() => {
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
    setDownloadUrl(null);

    try {
      // 使用Server Action上传文件
      const uploadResult = await uploadFileAction(file, documentType);
      setResult(uploadResult);

      // 调用成功回调
      if (uploadResult.success && onSuccess) {
        onSuccess(uploadResult.data);
      }
    } catch (error) {
      console.error('上传失败:', error);
      setResult({
        success: false,
        error: '上传失败',
        details: (error as Error).message
      });

      // 调用错误回调
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setDownloadUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle>上传文件</CardTitle>
          <CardDescription>选择一个文件上传到存储系统</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="documentType">选择文档类型</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as DocumentType)}
                disabled={disabled}
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

            <div
              className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={disabled}
              />
              {file ? (
                <div className="flex items-center justify-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({formatFileSize(file.size)})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">
                    {disabled ? '上传功能已禁用' : '点击或拖放文件到此处上传'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading || disabled}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {buttonText}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {result && (
        <Card className="mt-4">
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
  );
}