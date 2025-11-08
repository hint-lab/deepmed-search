import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslate } from "@/contexts/language-context";
import { useKnowledgeBaseContext } from "@/contexts/knowledgebase-context";
import { useSession } from "next-auth/react"

// 在组件外部定义，或者使用函数生成
const getFormSchema = (t: (key: string) => string) => z.object({
    name: z.string().min(1, t("validation.nameRequired")).max(50, t("validation.nameMaxLength")),
    description: z.string().max(200, t("validation.descriptionMaxLength")).optional(),
});

type FormValues = {
    name: string;
    description?: string;
};

interface CreateKnowledgeBaseButtonProps {
    visible: boolean;
    hideDialog: () => void;
}

const CreateKnowledgeBaseButton = ({
    visible,
    hideDialog,
}: CreateKnowledgeBaseButtonProps) => {
    const { t } = useTranslate('knowledgeBase');
    const { createKnowledgeBase, isCreating } = useKnowledgeBaseContext();
    const { data: session } = useSession();
    const form = useForm<FormValues>({
        resolver: zodResolver(getFormSchema(t)),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const onSubmit = (values: FormValues) => {
        createKnowledgeBase({
            name: values.name,
            description: values.description,
            created_by: session?.user?.id || "",
        });
        hideDialog();
    };

    return (
        <Dialog open={visible} onOpenChange={hideDialog}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("createKnowledgeBase")}</DialogTitle>
                    <DialogDescription>
                        {t("createKnowledgeBaseDescription")}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("form.namePlaceholder")} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("form.description")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("form.descriptionPlaceholder")}
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isCreating}>
                                {isCreating ? t("creating") : t("create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateKnowledgeBaseButton;
