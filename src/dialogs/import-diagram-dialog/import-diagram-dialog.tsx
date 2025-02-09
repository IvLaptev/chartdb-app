import React, { useCallback, useEffect, useState } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogInternalContent,
    DialogTitle,
} from '@/components/dialog/dialog';
import { Button } from '@/components/button/button';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useTranslation } from 'react-i18next';
import { useStorage } from '@/hooks/use-storage';
import { useNavigate } from 'react-router-dom';
import { diagramFromJSONInput } from '@/lib/export-import-utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert/alert';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/input/input';
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from '@/lib/utils';
import { PASTE_URL } from '@/lib/env';
import { useSecurity } from '@/hooks/use-security';

export interface ImportDiagramDialogProps extends BaseDialogProps {}

export const ImportDiagramDialog: React.FC<ImportDiagramDialogProps> = ({
    dialog,
}) => {
    const { t } = useTranslation();
    const [code, setCode] = useState<string | null>(null);
    const { addDiagram } = useStorage();
    const navigate = useNavigate();
    const [error, setError] = useState(false);
    const { getUser } = useSecurity();

    const onCodeChange = useCallback((code: string) => {
        if (code.length === 0) {
            setCode(null);
            return;
        }

        setCode(code);
    }, []);

    useEffect(() => {
        if (!dialog.open) return;
        setError(false);
        setCode(null);
    }, [dialog.open]);
    const { closeImportDiagramDialog, closeCreateDiagramDialog } = useDialog();

    const handleImport = useCallback(async () => {
        if (!code) return;

        try {
            const headers = new Headers();
            headers.append('x-user-id', encodeUtf8ToBase64(getUser() ?? ''));
            const resp = await fetch(`${PASTE_URL}/api/diagrams/${code}`, {
                method: 'GET',
                headers: headers,
            });

            if (resp.status !== 200) {
                throw 'failed to save diagram';
            }
            const respJSON = await resp.json();
            const encodedDiagram = respJSON['content'];

            console.log(encodedDiagram);
            console.log(decodeBase64ToUtf8(encodedDiagram));
            console.log(
                diagramFromJSONInput(decodeBase64ToUtf8(encodedDiagram))
            );

            const diagram = diagramFromJSONInput(
                decodeBase64ToUtf8(encodedDiagram)
            );

            await addDiagram({ diagram });

            closeImportDiagramDialog();
            closeCreateDiagramDialog();

            navigate(`/diagrams/${diagram.id}`);
        } catch (e) {
            console.log(e);
            setError(true);

            throw e;
        }
    }, [
        code,
        getUser,
        addDiagram,
        navigate,
        closeImportDiagramDialog,
        closeCreateDiagramDialog,
    ]);

    return (
        <Dialog
            {...dialog}
            onOpenChange={(open) => {
                if (!open) {
                    closeImportDiagramDialog();
                }
            }}
        >
            <DialogContent className="flex max-h-screen flex-col" showClose>
                <DialogHeader>
                    <DialogTitle>
                        {t('import_diagram_dialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('import_diagram_dialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <DialogInternalContent>
                    <div className="flex flex-col p-1">
                        <Input
                            type="text"
                            className="h-24 text-center font-mono text-5xl uppercase tracking-widest focus-visible:ring-0"
                            maxLength={4}
                            onChange={(e) => onCodeChange(e.target.value)}
                        />
                        {error ? (
                            <Alert variant="destructive" className="mt-2">
                                <AlertCircle className="size-4" />
                                <AlertTitle>
                                    {t('import_diagram_dialog.error.title')}
                                </AlertTitle>
                                <AlertDescription>
                                    {t(
                                        'import_diagram_dialog.error.description'
                                    )}
                                </AlertDescription>
                            </Alert>
                        ) : null}
                    </div>
                </DialogInternalContent>
                <DialogFooter className="flex gap-1 md:justify-between">
                    <DialogClose asChild>
                        <Button variant="secondary">
                            {t('import_diagram_dialog.cancel')}
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleImport}
                        disabled={code === null || code.length !== 4}
                    >
                        {t('import_diagram_dialog.import')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
