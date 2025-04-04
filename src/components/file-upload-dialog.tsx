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
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadDialogProps {
  hideModal: () => void;
  onOk: (response: any) => void;
  loading?: boolean;
  kbId: string;
}

export function FileUploadDialog({
  hideModal,
  onOk,
  loading,
  kbId
}: FileUploadDialogProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'upload' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('pleaseSelectFile'));
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('kbId', kbId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '上传失败');
      }

      toast.success(t('uploadSuccess'));
      onOk(data);
      hideModal();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={hideModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('uploadFile')}</DialogTitle>
          <DialogDescription>{t('uploadDescription')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              id="file"
              className="hidden"
              onChange={handleFileChange}
              accept=".txt,.pdf,.doc,.docx,.md"
            />
            <label
              htmlFor="file"
              className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-slate-50"
            >
              <Upload className="w-4 h-4" />
              {selectedFile ? selectedFile.name : t('selectFile')}
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={hideModal}>
            {t('cancel')}
          </Button>
          <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? t('uploading') : t('upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
