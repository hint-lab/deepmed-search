'use client';

import { useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "./extensions/alert-dialog";
import { Loader2 } from 'lucide-react';

interface DeleteConfirmationDialogProps {
    children: ReactNode; // The trigger element
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void | Promise<void>;
    isDeleting?: boolean; // Optional loading state for the confirm button
}

export function DeleteConfirmationDialog({
    children,
    title,
    description,
    confirmText = 'Delete', // Default texts
    cancelText = 'Cancel',
    onConfirm,
    isDeleting = false,
}: DeleteConfirmationDialogProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault(); // Prevent default form submission if applicable
        await onConfirm();
        // Optionally close the dialog after confirmation, 
        // or let the parent handle it based on the result of onConfirm
        // setIsOpen(false); 
        // Decided to let parent control closing logic via onConfirm if needed
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setIsOpen(false)} disabled={isDeleting}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
} 