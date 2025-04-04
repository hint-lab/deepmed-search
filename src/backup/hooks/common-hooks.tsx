import { Triangle } from 'lucide-react';
import isEqual from 'lodash/isEqual';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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

export const useSetModalState = () => {
  const [visible, setVisible] = useState(false);

  const showModal = useCallback(() => {
    setVisible(true);
  }, []);
  const hideModal = useCallback(() => {
    setVisible(false);
  }, []);

  const switchVisible = useCallback(() => {
    setVisible(!visible);
  }, [visible]);

  return { visible, showModal, hideModal, switchVisible };
};

export const useDeepCompareEffect = (
  effect: React.EffectCallback,
  deps: React.DependencyList,
) => {
  const ref = useRef<React.DependencyList>();
  let callback: ReturnType<React.EffectCallback> = () => { };
  if (!isEqual(deps, ref.current)) {
    callback = effect();
    ref.current = deps;
  }
  useEffect(() => {
    return () => {
      if (callback) {
        callback();
      }
    };
  }, []);
};

export interface UseDynamicSVGImportOptions {
  onCompleted?: (
    name: string,
    SvgIcon: React.FC<React.SVGProps<SVGSVGElement>> | undefined,
  ) => void;
  onError?: (err: Error) => void;
}

export function useDynamicSVGImport(
  name: string,
  options: UseDynamicSVGImportOptions = {},
) {
  const ImportedIconRef = useRef<React.FC<React.SVGProps<SVGSVGElement>>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const { onCompleted, onError } = options;
  useEffect(() => {
    setLoading(true);
    const importIcon = async (): Promise<void> => {
      try {
        ImportedIconRef.current = (await import(name)).ReactComponent;
        onCompleted?.(name, ImportedIconRef.current);
      } catch (err: any) {
        onError?.(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    importIcon();
  }, [name, onCompleted, onError]);

  return { error, loading, SvgIcon: ImportedIconRef.current };
}

interface DeleteConfirmProps {
  title?: string;
  content?: ReactNode;
  onOk?: (...args: any[]) => any;
  onCancel?: (...args: any[]) => any;
}

export const useShowDeleteConfirm = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<DeleteConfirmProps>({});
  const [promise, setPromise] = useState<{
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  } | null>(null);

  const { t } = useTranslation();

  const DeleteConfirmDialog = () => {
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

    const handleCancel = () => {
      config.onCancel?.();
      setOpen(false);
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
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

export const useTranslate = (keyPrefix: string) => {
  return useTranslation('translation', { keyPrefix });
};

export const useCommonTranslation = () => {
  return useTranslation('translation', { keyPrefix: 'common' });
};
