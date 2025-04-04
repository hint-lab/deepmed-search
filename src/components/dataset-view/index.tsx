'use client';

import { FileUploadDialog } from '@/components/file-upload-dialog';
import { Upload, Filter } from 'lucide-react';
import { DatasetTable } from './dataset-table';
import { useUploadDocument } from '@/hooks/use-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import DatasetSettings from './setting';

interface DatasetViewProps {
    id?: string;
}

declare global {
    interface Window {
        __refreshDatasetTable?: () => void;
    }
}

export default function DatasetView({ id: propId }: DatasetViewProps) {
    const {
        documentUploadVisible,
        hideDocumentUploadModal,
        showDocumentUploadModal,
        onDocumentUploadOk,
        documentUploadLoading,
    } = useUploadDocument(propId || '');

    const { t } = useTranslation('translation', { keyPrefix: 'dataset' });
    const pathname = usePathname();

    const handleUploadSuccess = async (response: any) => {
        // 调用表格的刷新方法
        if (window && window.__refreshDatasetTable) {
            window.__refreshDatasetTable();
        }
    };

    if (!propId) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noDatasetId')}</p>
                </CardContent>
            </Card>
        );
    }

    const renderContent = () => {
        if (pathname.includes('/settings')) {
            return <DatasetSettings />;
        }

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-2xl font-bold">{t('files')}</CardTitle>
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Filter className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder={t('searchFiles')}
                                className="w-[200px] pl-8"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={showDocumentUploadModal}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('uploadFile')}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <DatasetTable kbId={propId} />
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="flex min-h-screen">
            <div className="hidden border-r bg-slate-900/40 lg:block w-64">
                <Sidebar className="h-full" />
            </div>
            <div className="flex-1">
                <div className="space-y-6 p-8">
                    {renderContent()}
                    {documentUploadVisible && (
                        <FileUploadDialog
                            hideModal={hideDocumentUploadModal}
                            onOk={handleUploadSuccess}
                            loading={documentUploadLoading}
                            kbId={propId}
                        />
                    )}
                </div>
            </div>
        </div>
    );
} 