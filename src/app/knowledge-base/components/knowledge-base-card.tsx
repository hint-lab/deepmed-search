'use client';

import { IKnowledgeBase } from '@/types/db/knowledge-base';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText, Calendar, User } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteKnowledgeBase } from '@/actions/knowledge';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDate } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/hooks/use-language';
interface IKnowledgeBaseCardProps {
    item: IKnowledgeBase;
}

export default function KnowledgeBaseCard({ item }: IKnowledgeBaseCardProps) {
    const router = useRouter();
    const { t } = useTranslate('knowledgeBase');
    const handleDelete = async () => {
        const result = await deleteKnowledgeBase(item.id);
        if (result.success) {
            toast.success('删除成功');
        } else {
            toast.error('删除失败');
        }
    };
    const handleClick = () => {
        router.push(`/knowledge-base/${item.id}`);
    };
    const handleConfiguration = () => {
        router.push(`/knowledge-base/${item.id}/settings`);
    };
    return (
        <Card className="w-[300px] h-[251px] flex flex-col justify-between cursor-pointer" onClick={handleClick}>
            <CardHeader className="p-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleDelete}>
                                {t('delete')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleConfiguration}>
                                {t('settings')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="mt-4">
                    <CardTitle className="text-2xl font-semibold line-clamp-2">{item.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs font-semibold line-clamp-3">
                        {item.description}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-semibold">
                            {item.documents?.length || 0} 文档
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold">
                            {formatDate(item.updatedAt)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 