'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslate } from '@/hooks/use-language';
import { useState, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadDialogProps {
  hideModal: () => void;
  onOk: (file: File) => Promise<void>;
  loading?: boolean;
  kbId: string;
}

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/markdown': ['.md'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUploadDialog({
  hideModal,
  onOk,
  loading,
  kbId
}: FileUploadDialogProps) {
  const { t } = useTranslate('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = useCallback((file: File) => {
    if (!file) return;

    // 检查文件类型
    const fileType = Object.keys(ACCEPTED_FILE_TYPES).find(type =>
      ACCEPTED_FILE_TYPES[type as keyof typeof ACCEPTED_FILE_TYPES].includes(`.${file.name.split('.').pop()?.toLowerCase()}`)
    );

    if (!fileType) {
      toast.error(t('invalidFileType'));
      return;
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('fileTooLarge'));
      return;
    }

    setSelectedFile(file);
  }, [t]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  }, [handleFileChange]);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('pleaseSelectFile'));
      return;
    }
    await onOk(selectedFile);
  };

  return (
    <Dialog open onOpenChange={hideModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('uploadFile')}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('uploadDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 transition-colors",
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              "hover:border-primary hover:bg-primary/5"
            )}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              accept={Object.values(ACCEPTED_FILE_TYPES).flat().join(',')}
            />
            <label
              htmlFor="file"
              className="flex flex-col items-center justify-center gap-2 cursor-pointer"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  {selectedFile ? selectedFile.name : t('dragAndDrop')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('supportedFormats')}
                </p>
              </div>
            </label>
          </div>
          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm truncate max-w-[200px]">{selectedFile.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            className="min-w-[100px]"
          >
            {loading ? (
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
  );
}
