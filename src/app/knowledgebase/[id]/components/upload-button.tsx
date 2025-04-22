'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { uploadDocumentAction } from '@/actions/document';
import { toast } from 'sonner';

interface DocumentUploadButtonProps {
  kbId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
}

export function DocumentUploadButton({
  kbId,
  onSuccess,
  onError,
  buttonText = '上传文件',
  className = '',
  disabled = false
}: DocumentUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleUpload(file);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    // 检查知识库ID
    if (!kbId) {
      toast.error('上传失败', {
        description: '知识库ID不能为空'
      });
      return;
    }

    setUploading(true);

    try {
      console.log('开始上传文件:', file.name, '到知识库:', kbId);

      // 使用Server Action上传文件
      const uploadResult = await uploadDocumentAction(kbId, [file]);
      console.log('上传结果:', uploadResult);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error ? String(uploadResult.error) : '上传失败');
      }

      // 调用成功回调
      if (onSuccess) {
        onSuccess(uploadResult.data);
      }

      // 显示成功toast
      toast.success('文件上传成功', {
        description: `文件 ${file.name} 已成功上传到知识库`
      });

    } catch (error) {
      console.error('上传失败:', error);

      // 显示错误toast
      toast.error('上传失败', {
        description: (error as Error).message || '未知错误'
      });

      // 调用错误回调
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setUploading(false);
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />

      <Button
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="flex items-center"
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
    </div>
  );
}