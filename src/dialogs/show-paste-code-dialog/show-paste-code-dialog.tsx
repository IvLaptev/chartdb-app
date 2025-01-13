import React, { useEffect } from 'react';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useDialog } from '@/hooks/use-dialog';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogFooter,
    DialogHeader,
    DialogInternalContent,
} from '@/components/dialog/dialog';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button/button';

export interface ShowPasteCodeDialogProps extends BaseDialogProps {
    code: string;
}

export const ShowPasteCodeDialog: React.FC<ShowPasteCodeDialogProps> = ({
    code,
    dialog,
}) => {
    const { closeShowPasteCodeDialog } = useDialog();
    const { t } = useTranslation();

    useEffect(() => {
        if (!dialog.open) return;
    }, [dialog.open]);

    return (
        <Dialog
            {...dialog}
            onOpenChange={(open) => {
                if (!open) {
                    closeShowPasteCodeDialog();
                }
            }}
        >
            <DialogContent className="flex max-h-screen flex-col" showClose>
                <DialogHeader>
                    <DialogTitle>
                        {t('show_paste_code_dialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('show_paste_code_dialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <DialogInternalContent className="h-24">
                    <div className="flex h-full flex-col items-center overflow-hidden">
                        <p className="font-mono text-5xl uppercase tracking-widest">
                            {code}
                        </p>
                    </div>
                </DialogInternalContent>
                <DialogFooter className="flex gap-1 md:justify-between">
                    <DialogClose asChild>
                        <Button className="ml-auto">
                            {t('show_paste_code_dialog.ok')}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
