'use client';

import { useState, useEffect } from 'react';
import { useTranslate } from '@/contexts/language-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, Trash2, Edit2 } from 'lucide-react';
import { formatBytes } from '@/utils/bytes';

interface ChunkListProps {
    knowledgeBaseId: string;
}

interface Chunk {
    id: string;
    name: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    status: 'processing' | 'completed' | 'failed';
}

export function ChunkList({ knowledgeBaseId }: ChunkListProps) {
    const { t } = useTranslate('knowledge');
    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // 模拟获取分块数据
    useEffect(() => {
        const fetchChunks = async () => {
            try {
                // 这里应该是实际的API调用
                // const response = await fetch(`/api/knowledgebase/${knowledgeBaseId}/chunks`);
                // const data = await response.json();

                // 模拟数据
                const mockData: Chunk[] = [
                    {
                        id: '1',
                        name: '文档1.pdf',
                        size: 1024 * 1024 * 2.5, // 2.5MB
                        createdAt: '2023-04-10T12:00:00Z',
                        updatedAt: '2023-04-10T12:05:00Z',
                        status: 'completed'
                    },
                    {
                        id: '2',
                        name: '文档2.docx',
                        size: 1024 * 512, // 512KB
                        createdAt: '2023-04-09T15:30:00Z',
                        updatedAt: '2023-04-09T15:35:00Z',
                        status: 'completed'
                    },
                    {
                        id: '3',
                        name: '文档3.txt',
                        size: 1024 * 128, // 128KB
                        createdAt: '2023-04-08T09:15:00Z',
                        updatedAt: '2023-04-08T09:20:00Z',
                        status: 'processing'
                    }
                ];

                setChunks(mockData);
                setLoading(false);
            } catch (error) {
                console.error('获取分块数据失败:', error);
                setLoading(false);
            }
        };

        fetchChunks();
    }, [knowledgeBaseId]);

    // 过滤分块
    const filteredChunks = chunks.filter(chunk =>
        chunk.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchChunks')}
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('addChunk')}
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('name')}</TableHead>
                            <TableHead>{t('size')}</TableHead>
                            <TableHead>{t('createdAt')}</TableHead>
                            <TableHead>{t('status')}</TableHead>
                            <TableHead className="text-right">{t('actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    {t('loading')}
                                </TableCell>
                            </TableRow>
                        ) : filteredChunks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                    {t('noChunksFound')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredChunks.map((chunk) => (
                                <TableRow key={chunk.id}>
                                    <TableCell className="font-medium">{chunk.name}</TableCell>
                                    <TableCell>{formatBytes(chunk.size)}</TableCell>
                                    <TableCell>{new Date(chunk.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chunk.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            chunk.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                            {t(chunk.status)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button variant="ghost" size="icon">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
} 