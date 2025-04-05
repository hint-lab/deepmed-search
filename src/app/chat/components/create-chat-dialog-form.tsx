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
import { useCreateDialog } from '@/hooks/use-chat';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useKnowledgeBaseList } from '@/hooks/use-knowledge-base';

const CreateChatDialogFormSchema = (t: Function) => z.object({
    name: z.string().min(1, { message: t('validation.chatNameRequired', 'Chat name cannot be empty') }),
    knowledgeBaseId: z.string().optional(),
});

export function CreateChatDialogForm() {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { createDialog, isPending } = useCreateDialog();
    const { data: knowledgeBases = [], isLoading: isLoadingKnowledgeBases } = useKnowledgeBaseList();

    const schema = CreateChatDialogFormSchema(t);
    type CreateDialogFormValues = z.infer<typeof schema>;

    const form = useForm<CreateDialogFormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            knowledgeBaseId: undefined
        },
    });

    const onSubmit = async (values: CreateDialogFormValues) => {
        try {
            const newDialog = await createDialog({
                name: values.name,
                description: values.description
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
                                <FormItem className="w-full grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                        {t('chatNameLabel')}
                                    </Label>
                                    <FormControl className="col-span-3">
                                        <Input
                                            id="name"
                                            placeholder={t('chatNamePlaceholder')}
                                            {...field}
                                            disabled={isPending}
                                        />
                                    </FormControl>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="knowledgeBaseId"
                            render={({ field }) => (
                                <FormItem className="w-full grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="knowledgeBaseId" className="text-right">
                                        {t('knowledgeBaseLabel')}
                                    </Label>
                                    <Select
                                        disabled={isPending || isLoadingKnowledgeBases}
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <FormControl className="col-span-3">
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('selectKnowledgeBase')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="">
                                                {t('noKnowledgeBase')}
                                            </SelectItem>
                                            {knowledgeBases.map((kb) => (
                                                <SelectItem key={kb.id} value={kb.id}>
                                                    {kb.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="col-span-4 col-start-2" />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" disabled={isPending}>
                                    {t('cancelButton')}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? '...' : t('createButton')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 