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
import { useTranslate } from "@/hooks/use-language";
import { useKnowledgeBase } from "@/contexts/knowledgebase-context";
import { useUser } from "@/contexts/user-context";




const formSchema = z.object({
    name: z.string().min(1, "请输入知识库名称").max(50, "名称不能超过50个字符"),
    description: z.string().max(200, "描述不能超过200个字符").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateKnowledgeBaseButtonProps {
    visible: boolean;
    hideDialog: () => void;
}

const CreateKnowledgeBaseButton = ({
    visible,
    hideDialog,
}: CreateKnowledgeBaseButtonProps) => {
    const { t } = useTranslate('knowledgeBase');
    const { createKnowledgeBase, isCreating } = useKnowledgeBase();
    const { userInfo } = useUser();
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const onSubmit = (values: FormValues) => {
        createKnowledgeBase({
            name: values.name,
            description: values.description,
            created_by: userInfo?.id || "",
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
                                    <FormLabel>{t("name")}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t("namePlaceholder")} {...field} />
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
                                    <FormLabel>{t("descriptionPlaceholder")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={t("descriptionPlaceholder")}
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
