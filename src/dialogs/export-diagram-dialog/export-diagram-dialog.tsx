import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/hooks/use-dialog';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/dialog/dialog';
import { Button } from '@/components/button/button';
import type { SelectBoxOption } from '@/components/select-box/select-box';
import { SelectBox } from '@/components/select-box/select-box';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useTranslation } from 'react-i18next';
import { useChartDB } from '@/hooks/use-chartdb';
import { diagramToJSONOutput } from '@/lib/export-import-utils';
import { Spinner } from '@/components/spinner/spinner';
import { encodeUtf8ToBase64, waitFor } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert/alert';
import { useSecurity } from '@/hooks/use-security';
import { PASTE_URL } from '@/lib/env';

export interface ExportDiagramDialogProps extends BaseDialogProps {}

export const ExportDiagramDialog: React.FC<ExportDiagramDialogProps> = ({
    dialog,
}) => {
    const { t } = useTranslation();
    const { diagramName, currentDiagram } = useChartDB();
    const [isLoading, setIsLoading] = useState(false);
    const { closeExportDiagramDialog, openShowPasteCodeDialog } = useDialog();
    const [error, setError] = useState(false);
    const { getUser } = useSecurity();
    const [outputTypeOption, setOutputTypeOption] = useState<string>('code');

    useEffect(() => {
        if (!dialog.open) return;
        setIsLoading(false);
        setError(false);
    }, [dialog.open]);

    const downloadOutput = useCallback(
        (dataUrl: string) => {
            const a = document.createElement('a');
            a.setAttribute('download', `ChartDB(${diagramName}).json`);
            a.setAttribute('href', dataUrl);
            a.click();
        },
        [diagramName]
    );

    const exportToJson = useCallback(async () => {
        setIsLoading(true);
        await waitFor(1000);
        try {
            const json = diagramToJSONOutput(currentDiagram);

            const blob = new Blob([json], { type: 'application/json' });
            const dataUrl = URL.createObjectURL(blob);
            downloadOutput(dataUrl);
            setIsLoading(false);
            closeExportDiagramDialog();
        } catch (e) {
            setError(true);
            setIsLoading(false);

            throw e;
        }
    }, [downloadOutput, currentDiagram, closeExportDiagramDialog]);

    const exportToCode = useCallback(async () => {
        setIsLoading(true);
        try {
            const encodedJson = encodeUtf8ToBase64(
                diagramToJSONOutput(currentDiagram)
            );

            const headers = new Headers();
            headers.append('x-user-id', encodeUtf8ToBase64(getUser() ?? ''));
            const resp = await fetch(`${PASTE_URL}/api/diagrams`, {
                method: 'POST',
                body: JSON.stringify({
                    content: encodedJson,
                    client_diagram_id: currentDiagram.id.slice(8),
                }),
                headers: headers,
            });

            if (resp.status !== 200) {
                throw 'failed to save diagram';
            }
            const respJSON = await resp.json();
            const code = respJSON['code'];

            setIsLoading(false);
            closeExportDiagramDialog();
            openShowPasteCodeDialog({ code: code });
        } catch (e) {
            console.log(e);
            setError(true);
            setIsLoading(false);

            throw e;
        }
    }, [
        currentDiagram,
        getUser,
        closeExportDiagramDialog,
        openShowPasteCodeDialog,
    ]);

    const handleExport = useCallback(async () => {
        switch (outputTypeOption) {
            case 'json':
                await exportToJson();
                break;
            case 'code':
                await exportToCode();
                break;
            default:
                break;
        }
    }, [outputTypeOption, exportToCode, exportToJson]);

    const outputTypeOptions: SelectBoxOption[] = useMemo(
        () =>
            ['code', 'json'].map((format) => ({
                value: format,
                label: t(`export_diagram_dialog.format_${format}`),
            })),
        [t]
    );

    return (
        <Dialog
            {...dialog}
            onOpenChange={(open) => {
                if (!open) {
                    closeExportDiagramDialog();
                }
            }}
        >
            <DialogContent className="flex flex-col" showClose>
                <DialogHeader>
                    <DialogTitle>
                        {t('export_diagram_dialog.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('export_diagram_dialog.description')}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-1">
                    <div className="grid w-full items-center gap-4">
                        <SelectBox
                            options={outputTypeOptions}
                            multiple={false}
                            value={outputTypeOption}
                            onChange={(value) =>
                                setOutputTypeOption(value as string)
                            }
                        />
                    </div>
                    {error ? (
                        <Alert variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertTitle>
                                {t('export_diagram_dialog.error.title')}
                            </AlertTitle>
                            <AlertDescription>
                                {t('export_diagram_dialog.error.description')}
                            </AlertDescription>
                        </Alert>
                    ) : null}
                </div>
                <DialogFooter className="flex gap-1 md:justify-between">
                    <DialogClose asChild>
                        <Button variant="secondary">
                            {t('export_diagram_dialog.cancel')}
                        </Button>
                    </DialogClose>
                    <Button onClick={handleExport} disabled={isLoading}>
                        {isLoading ? (
                            <Spinner className="mr-1 size-5 text-primary-foreground" />
                        ) : null}
                        {t('export_diagram_dialog.export')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
