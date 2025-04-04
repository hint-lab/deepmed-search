import { Triangle } from 'lucide-react';
import { ReactNode, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";

/**
 * 删除确认对话框的配置接口
 */
interface DeleteConfirmProps {
    title?: string;      // 对话框标题
    content?: ReactNode; // 对话框内容
    onOk?: (...args: any[]) => any;    // 确认回调
    onCancel?: (...args: any[]) => any; // 取消回调
}

/**
 * 删除确认对话框 Hook
 * @returns {Object} 包含删除确认对话框组件和控制方法的对象
 */
export const useShowDeleteConfirmDialog = () => {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<DeleteConfirmProps>({});
    // 用于存储 Promise 的 resolve 和 reject 函数
    const [promise, setPromise] = useState<{
        resolve: (value: any) => void;
        reject: (reason?: any) => void;
    } | null>(null);

    const { t } = useTranslation();

    /**
     * 删除确认对话框组件
     */
    const DeleteConfirmDialog = () => {
        // 处理确认操作
        const handleOk = async () => {
            try {
                const result = await config.onOk?.();
                promise?.resolve(result);
                setOpen(false);
            } catch (error) {
                promise?.reject(error);
                setOpen(false);
            }
        };

        // 处理取消操作
        const handleCancel = () => {
            config.onCancel?.();
            setOpen(false);
        };

        return (
            <Dialog open={open} onOpenChange={setOpen} >
                <DialogContent className="sm:max-w-[425px]" >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2" >
                            <Triangle className="h-5 w-5 text-destructive" />
                            {config.title || t('common.deleteModalTitle')}
                        </DialogTitle>
                        {config.content && (
                            <DialogDescription>
                                {config.content}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancel}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={handleOk}>
                            {t('common.ok')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };

    /**
     * 显示删除确认对话框的方法
     * @param props - 对话框配置
     * @returns Promise - 返回一个 Promise，在用户确认或取消时 resolve
     */
    const showDeleteConfirm = useCallback(
        ({ title, content, onOk, onCancel }: DeleteConfirmProps): Promise<any> => {
            return new Promise((resolve, reject) => {
                setConfig({ title, content, onOk, onCancel });
                setPromise({ resolve, reject });
                setOpen(true);
            });
        },
        [],
    );

    return { showDeleteConfirm, DeleteConfirmDialog };
};