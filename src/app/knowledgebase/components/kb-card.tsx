'use client';

/**
 * 知识库卡片组件
 * 用于展示单个知识库的基本信息，包括名称、文档数量、创建时间等
 * 提供删除和配置知识库的功能
 */

import { IKnowledgeBase } from '@/types/knowledgebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, FileText, Calendar, User } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { formatDate } from '@/utils/date';
import { useRouter } from 'next/navigation';
import { useTranslate } from '@/contexts/language-context';
import { useEffect } from 'react';
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';

/**
 * 知识库卡片组件的属性接口
 */
interface IKnowledgeBaseCardProps {
    /** 知识库数据 */
    item: IKnowledgeBase;
}

/**
 * 知识库卡片组件
 * @param props - 组件属性
 * @returns 知识库卡片组件
 */
export function KnowledgeBaseCard({ item }: IKnowledgeBaseCardProps) {
    const router = useRouter();
    const { t } = useTranslate('knowledgeBase');
    const { deleteKnowledgeBase } = useKnowledgeBaseContext();
    useEffect(() => {
        console.log(item)
    }, [item,])

    /**
     * 处理删除知识库
     * @param id - 知识库ID
     */
    const handleDelete = async (id: string) => {
        try {
            await deleteKnowledgeBase(id);
        } catch (error) {
            toast.error(t('deleteError'));
        }
    };

    /**
     * 处理配置知识库
     * @param id - 知识库ID
     */

    const handleClick = () => {
        router.push(`/knowledgebase/${item.id}`);
    };

    return (
        <Card className="w-[300px] h-[251px] flex flex-col justify-between p-2 cursor-pointer" onClick={handleClick} >
            <CardHeader className="p-6">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                            }}>
                                {t('delete')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleClick();
                            }}>
                                {t('settings.title')}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="mt-4 cursor-pointer" >
                    <CardTitle className="text-2xl font-semibold line-clamp-2">{item.name}</CardTitle>
                    <CardDescription className="mt-1 text-xs font-semibold line-clamp-3">
                        {item.description}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 " >
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-xs font-semibold">
                            {item.doc_num || 0} {t('card.documents')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs font-semibold">
                            {formatDate(item.updated_at)}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
} 