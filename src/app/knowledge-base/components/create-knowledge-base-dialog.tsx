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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
    name: z.string().min(1, "请输入知识库名称"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateKnowledgeBaseDialogProps {
    visible: boolean;
    hideDialog: () => void;
    loading: boolean;
    onOk: (name: string) => void;
}

const CreateKnowledgeBaseDialog = ({
    visible,
    hideDialog,
    loading,
    onOk,
}: CreateKnowledgeBaseDialogProps) => {
    const { t } = useTranslation('translation', { keyPrefix: 'knowledgeBase' });

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
        },
    });

    const onSubmit = (values: FormValues) => {
        onOk(values.name);
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
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                {loading ? t("creating") : t("create")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateKnowledgeBaseDialog;
