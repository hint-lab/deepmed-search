'use client';

import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUploadDialog } from '@/components/file-upload-dialog';
import { useState } from 'react';
import { MoreHorizontal, Search, Upload, FolderIcon } from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';

interface FileItem {
    id: string;
    name: string;
    type: 'folder' | 'file';
    size: number;
    uploadDate: string;
    knowledgeBase: string;
}

export default function FilesPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([
        {
            id: '1',
            name: '.knowledgebase',
            type: 'folder',
            size: 169890,
            uploadDate: '2025-03-27T21:27:00',
            knowledgeBase: '-',
        },
    ]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedFiles(files.map(file => file.id));
        } else {
            setSelectedFiles([]);
        }
    };

    const handleSelectFile = (fileId: string, checked: boolean) => {
        if (checked) {
            setSelectedFiles(prev => [...prev, fileId]);
        } else {
            setSelectedFiles(prev => prev.filter(id => id !== fileId));
        }
    };

    const handleUploadSuccess = (response: any) => {
        // 添加新文件到列表
        setFiles(prev => [...prev, {
            id: response.id,
            name: response.name,
            type: 'file',
            size: response.size,
            uploadDate: new Date().toISOString(),
            knowledgeBase: response.kbId,
        }]);
        setUploadDialogOpen(false);
    };

    return (
        <div className="container mx-auto py-6 space-y-4">
            <div className="flex justify-between items-center mt-12">
                <div className="flex w-[300px]">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="搜索文件"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        onClick={() => setUploadDialogOpen(true)}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        新增文件
                    </Button>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={selectedFiles.length === files.length}
                                    onCheckedChange={handleSelectAll}
                                />
                            </TableHead>
                            <TableHead>名称</TableHead>
                            <TableHead>上传日期</TableHead>
                            <TableHead>大小</TableHead>
                            <TableHead>知识库</TableHead>
                            <TableHead className="w-12">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {files.map((file) => (
                            <TableRow key={file.id}>
                                <TableCell>
                                    <Checkbox
                                        checked={selectedFiles.includes(file.id)}
                                        onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        {file.type === 'folder' ? (
                                            <FolderIcon className="h-4 w-4 text-blue-500" />
                                        ) : null}
                                        {file.name}
                                    </div>
                                </TableCell>
                                <TableCell>{formatDate(file.uploadDate)}</TableCell>
                                <TableCell>{formatBytes(file.size)}</TableCell>
                                <TableCell>{file.knowledgeBase}</TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                删除
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {uploadDialogOpen && (
                <FileUploadDialog
                    hideModal={() => setUploadDialogOpen(false)}
                    onOk={handleUploadSuccess}
                    kbId="default"
                />
            )}
        </div>
    );
}
