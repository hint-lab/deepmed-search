'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslate } from '@/hooks/use-language';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useCreateChatDialog } from '@/hooks/use-chat';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useKnowledgeBaseList } from '@/hooks/use-knowledge-base';
import { useUser } from '@/contexts/user-context';
import { toast } from 'sonner';

const CreateChatDialogFormSchema = (t: Function) => z.object({
    name: z.string().min(1, { message: t('validation.chatNameRequired', 'Chat name cannot be empty') }),
    knowledgeBaseId: z.string().optional(),
    description: z.string().optional(),
});

export function CreateChatDialogForm() {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { createChatDialog, loading } = useCreateChatDialog();
    const { data: knowledgeBases = [], isLoading: isLoadingKnowledgeBases } = useKnowledgeBaseList();
    const { userInfo } = useUser();

    const schema = CreateChatDialogFormSchema(t);
    type CreateDialogFormValues = z.infer<typeof schema>;

    const form = useForm<CreateDialogFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            knowledgeBaseId: undefined,
            description: undefined,
        },
    });

    const onSubmit = async (values: CreateDialogFormValues) => {
        if (!userInfo?.id) {
            toast.error(t('userNotLoggedIn', 'User not logged in'));
            return;
        }
        try {
            const newDialog = await createChatDialog({
                name: values.name,
                description: values.description,
                knowledgeBaseId: values.knowledgeBaseId,
                userId: userInfo.id
            });
            if (newDialog?.id) {
                setIsOpen(false);
                form.reset();
                router.push(`/chat/${newDialog.id}`);
            }
        } catch (error) {
            console.error("Failed to create dialog:", error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-auto">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('createChatTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('createChatDescription')}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="w-full space-y-2">
                                    <Label htmlFor="name">
                                        {t('chatNameLabel')}
                                    </Label>
                                    <FormControl>
                                        <Input
                                            id="name"
                                            placeholder={t('chatNamePlaceholder')}
                                            {...field}
                                            disabled={loading}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="knowledgeBaseId"
                            render={({ field }) => (
                                <FormItem className="w-full space-y-2">
                                    <Label htmlFor="knowledgeBaseId">
                                        {t('knowledgeBaseLabel')}
                                    </Label>
                                    <FormControl>
                                        <Select
                                            disabled={loading || isLoadingKnowledgeBases}
                                            onValueChange={field.onChange}
                                            value={field.value ?? ''}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t('selectKnowledgeBase')} />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                sideOffset={4}
                                                className="w-[--radix-select-trigger-width] max-h-[--radix-select-content-available-height]"
                                            >
                                                {knowledgeBases.map((kb) => (
                                                    <SelectItem key={kb.id} value={kb.id}>
                                                        {kb.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={loading}>
                                    {t('cancelButton')}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={loading}>
                                {loading ? '...' : t('createButton')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 