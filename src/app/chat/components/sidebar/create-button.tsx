'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslate } from '@/contexts/language-context';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator
} from "@/components/ui/select";
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useChatDialogContext } from '@/contexts/chat-dialog-context';
import { useKnowledgeBaseContext } from '@/contexts/knowledgebase-context';


const CreateChatDialogFormSchema = (t: Function) => z.object({
    name: z.string().min(1, { message: t('validation.chatNameRequired', 'Chat name cannot be empty') }),
    knowledgeBaseId: z.string().optional(),
    description: z.string().optional(),
});


export function CreateChatDialogButton() {
    const { t } = useTranslate('chat');
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { knowledgeBases, isLoading: isLoadingKnowledgeBases } = useKnowledgeBaseContext();
    const { data: session } = useSession();
    const { createChatDialog } = useChatDialogContext();

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
        if (!session?.user?.id) {
            toast.error(t('userNotLoggedIn', 'User not logged in'));
            return;
        }
        try {
            const newDialog = await createChatDialog({
                name: values.name,
                description: values.description,
                knowledgeBaseId: values.knowledgeBaseId === 'none' || values.knowledgeBaseId === null ? undefined : values.knowledgeBaseId as string,
                userId: session?.user?.id
            });
            if (newDialog?.id) {
                setIsOpen(false);
                form.reset();
                router.push(`/chat/${newDialog.id}`);
            } else {
                toast.error(t('createChatError', 'Failed to create chat. Please try again.'));
            }
        } catch (error) {
            console.error("Failed to create dialog:", error);
            toast.error(t('createChatError', 'Failed to create chat. Please try again.'));
        }
    };
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
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
                                            disabled={isLoadingKnowledgeBases}
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
                                            disabled={isLoadingKnowledgeBases}
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder={t('selectKnowledgeBase')} />
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                sideOffset={4}
                                                className="w-[--radix-select-trigger-width] max-h-[--radix-select-content-available-height]"
                                            >
                                                <SelectItem value="none">
                                                    {t('noKnowledgeBase')}
                                                </SelectItem>
                                                <SelectSeparator className='mx-2' />
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
                                <Button type="button" variant="outline" disabled={isLoadingKnowledgeBases}>
                                    {t('cancelButton')}
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isLoadingKnowledgeBases}>
                                {isLoadingKnowledgeBases ? '...' : t('createButton')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
} 