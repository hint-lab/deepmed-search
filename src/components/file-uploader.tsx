'use client';

import { FileText, Upload, X, Loader2 } from 'lucide-react';
import * as React from 'react';
import Dropzone, {
  type DropzoneProps,
  type FileRejection,
} from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBytes } from '@/utils/bytes';
import { cn } from '@/lib/utils';
import { useTranslate } from '@/hooks/use-language';
import { useUploadDocument } from '@/hooks/use-document-upload';
/**
 * 文件上传组件的属性接口
 */
interface FileUploaderProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onError' | 'onClick'> {
  /** 知识库ID */
  kbId: string;
  /** 上传成功的回调函数 */
  onSuccess?: (data: any) => void;
  /** 上传失败的回调函数 */
  onError?: (error: Error) => void;
  /** 是否禁用上传功能 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 按钮文本 */
  buttonText?: string;
}

/**
 * 文件上传组件
 * 集成了文件上传对话框和文件上传功能
 */
export function FileUploader({
  kbId,
  onSuccess,
  onError,
  disabled = false,
  className,
  buttonText,
  ...props
}: FileUploaderProps) {
  const { t } = useTranslate('upload');

  // 使用文档上传hook
  const {
    documentUploadModalVisible,
    isUploading,
    showDocumentUploadModal,
    hideDocumentUploadModal,
    onDocumentUploadOk
  } = useUploadDocument(kbId, {
    onSuccess,
    onError
  });

  return (
    <>
      {/* 上传按钮 */}
      <Button
        variant="default"
        size="sm"
        onClick={() => showDocumentUploadModal()}
        disabled={disabled}
        className={cn("w-full lg:w-auto", className)}
        {...props}
      >
        <Upload className="mr-2 h-4 w-4" />
        {buttonText || t('uploadFile')}
      </Button>

      {/* 文件上传对话框 */}
      {documentUploadModalVisible && (
        <Dialog open onOpenChange={hideDocumentUploadModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{t('uploadFile')}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('uploadDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Dropzone
                onDrop={async (acceptedFiles) => {
                  if (acceptedFiles.length > 0) {
                    await onDocumentUploadOk(acceptedFiles[0]);
                  }
                }}
                maxFiles={1}
                multiple={false}
                disabled={isUploading}
              >
                {({ getRootProps, getInputProps, isDragActive }) => (
                  <div
                    {...getRootProps()}
                    className={cn(
                      "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                      isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                      "hover:border-primary hover:bg-primary/5"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Upload className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {isDragActive ? t('dropHere') : t('dragAndDrop')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('supportedFormats')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Dropzone>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={hideDocumentUploadModal}>
                {t('cancel')}
              </Button>
              <Button
                disabled={isUploading}
                className="min-w-[100px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('uploading')}
                  </>
                ) : (
                  t('upload')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}