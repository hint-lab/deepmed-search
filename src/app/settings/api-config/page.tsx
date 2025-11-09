'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { useTranslate } from '@/contexts/language-context';
import { getUserApiConfig, saveUserApiConfig, resetUserApiConfig, type UserApiConfigData } from '@/actions/api-config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, ArrowLeft, Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/extensions/alert-dialog';

export default function ApiConfigPage() {
    const { t } = useTranslate('apiConfig');
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset: resetForm,
        formState: { errors },
    } = useForm<UserApiConfigData>();

    // 加载配置
    useEffect(() => {
        const loadConfig = async () => {
            if (!session?.user?.id) {
                router.push('/auth/login');
                return;
            }

            try {
                setLoading(true);
                const result = await getUserApiConfig();
                if (result.success && result.data) {
                    // 填充表单 - 只处理字符串类型的字段
                    const configData = result.data as any;
                    const configKeys: (keyof UserApiConfigData)[] = [
                        'openaiBaseUrl',
                        'openaiApiKey',
                        'openaiApiModel',
                        'deepseekApiKey',
                        'deepseekBaseUrl',
                        'geminiApiKey',
                        'geminiBaseUrl',
                        'tavilyApiKey',
                        'searchProvider',
                        'jinaApiKey',
                        'ncbiApiKey',
                    ];
                    configKeys.forEach((key) => {
                        const value = configData[key];
                        if (value && typeof value === 'string') {
                            setValue(key, value);
                        }
                    });
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                toast.error(t('loadError'));
            } finally {
                setLoading(false);
            }
        };

        loadConfig();
    }, [session, router, setValue, t]);

    // 提交表单
    const onSubmit = async (data: UserApiConfigData) => {
        if (!session?.user?.id) {
            toast.error(t('unauthorized'));
            return;
        }

        try {
            setSaving(true);
            const result = await saveUserApiConfig(data);
            if (result.success) {
                toast.success(t('saveSuccess'));
            } else {
                toast.error(result.error || t('saveError'));
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            toast.error(t('saveError'));
        } finally {
            setSaving(false);
        }
    };

    const togglePasswordVisibility = (field: string) => {
        setShowPasswords((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    // 重置配置
    const handleReset = async () => {
        if (!session?.user?.id) {
            toast.error(t('unauthorized'));
            return;
        }

        try {
            setResetting(true);
            const result = await resetUserApiConfig();
            if (result.success) {
                toast.success(t('resetSuccess'));
                // 清空表单 - 显式重置所有字段为空值
                resetForm({
                    openaiBaseUrl: '',
                    openaiApiKey: '',
                    openaiApiModel: '',
                    deepseekApiKey: '',
                    deepseekBaseUrl: '',
                    geminiApiKey: '',
                    geminiBaseUrl: '',
                    tavilyApiKey: '',
                    searchProvider: '',
                    jinaApiKey: '',
                    ncbiApiKey: '',
                });
                setShowResetDialog(false);
            } else {
                toast.error(result.error || t('resetError'));
            }
        } catch (error) {
            console.error('重置配置失败:', error);
            toast.error(t('resetError'));
        } finally {
            setResetting(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-6">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('back')}
                </Button>
                <h1 className="text-3xl font-bold">{t('title')}</h1>
                <p className="text-muted-foreground mt-2">{t('description')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* OpenAI 配置 */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('openai.title')}</CardTitle>
                        <CardDescription>{t('openai.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="openaiApiKey">{t('openai.apiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="openaiApiKey"
                                    type={showPasswords.openaiApiKey ? 'text' : 'password'}
                                    placeholder={t('openai.apiKeyPlaceholder')}
                                    {...register('openaiApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('openaiApiKey')}
                                >
                                    {showPasswords.openaiApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="openaiBaseUrl">{t('openai.baseUrl')}</Label>
                            <Input
                                id="openaiBaseUrl"
                                type="text"
                                placeholder={t('openai.baseUrlPlaceholder')}
                                {...register('openaiBaseUrl')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="openaiApiModel">{t('openai.model')}</Label>
                            <Input
                                id="openaiApiModel"
                                type="text"
                                placeholder={t('openai.modelPlaceholder')}
                                {...register('openaiApiModel')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* DeepSeek 配置 */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('deepseek.title')}</CardTitle>
                        <CardDescription>{t('deepseek.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="deepseekApiKey">{t('deepseek.apiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="deepseekApiKey"
                                    type={showPasswords.deepseekApiKey ? 'text' : 'password'}
                                    placeholder={t('deepseek.apiKeyPlaceholder')}
                                    {...register('deepseekApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('deepseekApiKey')}
                                >
                                    {showPasswords.deepseekApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="deepseekBaseUrl">{t('deepseek.baseUrl')}</Label>
                            <Input
                                id="deepseekBaseUrl"
                                type="text"
                                placeholder={t('deepseek.baseUrlPlaceholder')}
                                {...register('deepseekBaseUrl')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Gemini 配置 */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('gemini.title')}</CardTitle>
                        <CardDescription>{t('gemini.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="geminiApiKey">{t('gemini.apiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="geminiApiKey"
                                    type={showPasswords.geminiApiKey ? 'text' : 'password'}
                                    placeholder={t('gemini.apiKeyPlaceholder')}
                                    {...register('geminiApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('geminiApiKey')}
                                >
                                    {showPasswords.geminiApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="geminiBaseUrl">{t('gemini.baseUrl')}</Label>
                            <Input
                                id="geminiBaseUrl"
                                type="text"
                                placeholder={t('gemini.baseUrlPlaceholder')}
                                {...register('geminiBaseUrl')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 搜索服务配置 */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('search.title')}</CardTitle>
                        <CardDescription>{t('search.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="searchProvider">{t('search.provider')}</Label>
                            <Select
                                value={watch('searchProvider') || ''}
                                onValueChange={(value) => setValue('searchProvider', value)}
                            >
                                <SelectTrigger id="searchProvider">
                                    <SelectValue placeholder={t('search.providerPlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="jina">{t('search.providerJina')}</SelectItem>
                                    <SelectItem value="duckduckgo">{t('search.providerDuckDuckGo')}</SelectItem>
                                    <SelectItem value="tavily">{t('search.providerTavily')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tavilyApiKey">{t('search.tavilyApiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="tavilyApiKey"
                                    type={showPasswords.tavilyApiKey ? 'text' : 'password'}
                                    placeholder={t('search.tavilyApiKeyPlaceholder')}
                                    {...register('tavilyApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('tavilyApiKey')}
                                >
                                    {showPasswords.tavilyApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="jinaApiKey">{t('search.jinaApiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="jinaApiKey"
                                    type={showPasswords.jinaApiKey ? 'text' : 'password'}
                                    placeholder={t('search.jinaApiKeyPlaceholder')}
                                    {...register('jinaApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('jinaApiKey')}
                                >
                                    {showPasswords.jinaApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* NCBI 配置 */}
                <Card>
                    <CardHeader>
                        <CardTitle>{t('ncbi.title')}</CardTitle>
                        <CardDescription>{t('ncbi.description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ncbiApiKey">{t('ncbi.apiKey')}</Label>
                            <div className="relative">
                                <Input
                                    id="ncbiApiKey"
                                    type={showPasswords.ncbiApiKey ? 'text' : 'password'}
                                    placeholder={t('ncbi.apiKeyPlaceholder')}
                                    {...register('ncbiApiKey')}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10"
                                    onClick={() => togglePasswordVisibility('ncbiApiKey')}
                                >
                                    {showPasswords.ncbiApiKey ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 提交按钮 */}
                <div className="flex justify-between gap-4">
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setShowResetDialog(true)}
                        disabled={saving || resetting}
                    >
                        {resetting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('resetting')}
                            </>
                        ) : (
                            <>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                {t('reset')}
                            </>
                        )}
                    </Button>
                    <div className="flex gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={saving || resetting}
                        >
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={saving || resetting}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {t('save')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            {/* 重置确认对话框 */}
            <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('resetConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('resetConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowResetDialog(false)} disabled={resetting}>
                            {t('cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReset}
                            disabled={resetting}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {resetting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t('resetting')}
                                </>
                            ) : (
                                t('reset')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

