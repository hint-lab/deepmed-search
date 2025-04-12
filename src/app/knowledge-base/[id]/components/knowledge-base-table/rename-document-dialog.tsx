import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDocumentInfo } from "@/types/db/document";
import { useTranslate } from "@/hooks/use-language";
import { useRenameDocument } from "@/hooks/use-document"
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface RenameDocumentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    document: IDocumentInfo | null;
    onSuccess?: () => void;
}

export function RenameDocumentDialog({
    open,
    onOpenChange,
    document,
    onSuccess,
}: RenameDocumentDialogProps) {
    const { t } = useTranslate("knowledgeBase");
    const { renameDocument } = useRenameDocument();
    const [newName, setNewName] = useState(document?.name || "");

    useEffect(() => {
        if (document) {
            setNewName(document.name);
        }
    }, [document]);

    const handleSubmit = async () => {
        if (!document || !newName.trim()) return;

        try {
            await renameDocument(document.id, newName.trim());
            toast.success(t("renameSuccess"));
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            toast.error(t("renameError"));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("rename")}</DialogTitle>
                    <DialogDescription>{t("renameDescription")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            {t("fileName")}
                        </Label>
                        <Input
                            id="name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit}>{t("confirm")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 