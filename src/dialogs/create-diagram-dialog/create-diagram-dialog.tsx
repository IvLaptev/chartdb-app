import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/dialog/dialog';
import { DatabaseType } from '@/lib/domain/database-type';
import { useStorage } from '@/hooks/use-storage';
import type { Diagram } from '@/lib/domain/diagram';
import { loadFromDatabaseMetadata } from '@/lib/domain/diagram';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '@/hooks/use-config';
import type { DatabaseMetadata } from '@/lib/data/import-metadata/metadata-types/database-metadata';
import { loadDatabaseMetadata } from '@/lib/data/import-metadata/metadata-types/database-metadata';
import { encodeUtf8ToBase64, generateDiagramId } from '@/lib/utils';
import { useChartDB } from '@/hooks/use-chartdb';
import { useDialog } from '@/hooks/use-dialog';
import type { DatabaseEdition } from '@/lib/domain/database-edition';
import { SelectDatabase } from './select-database/select-database';
import { CreateDiagramDialogStep } from './create-diagram-dialog-step';
import { ImportDatabase } from '../common/import-database/import-database';
import { useTranslation } from 'react-i18next';
import type { BaseDialogProps } from '../common/base-dialog-props';
import { useSecurity } from '@/hooks/use-security';
import { useMutation } from 'react-query';
import { PASTE_URL } from '@/lib/env';
import { toast } from 'react-toastify';
import { diagramToJSONOutput } from '@/lib/export-import-utils';

export interface CreateDiagramDialogProps extends BaseDialogProps {}

export const CreateDiagramDialog: React.FC<CreateDiagramDialogProps> = ({
    dialog,
}) => {
    const security = useSecurity();
    const { diagramId } = useChartDB();
    const { t } = useTranslation();
    const [databaseType, setDatabaseType] = useState<DatabaseType>(
        DatabaseType.GENERIC
    );
    const { closeCreateDiagramDialog } = useDialog();
    const { updateConfig } = useConfig();
    const [scriptResult, setScriptResult] = useState('');
    const [databaseEdition, setDatabaseEdition] = useState<
        DatabaseEdition | undefined
    >();
    const [step, setStep] = useState<CreateDiagramDialogStep>(
        CreateDiagramDialogStep.SELECT_DATABASE
    );
    const { listDiagrams, addDiagram } = useStorage();
    const [diagramNumber, setDiagramNumber] = useState<number>(1);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDiagrams = async () => {
            const diagrams = await listDiagrams();
            setDiagramNumber(diagrams.length + 1);
        };
        fetchDiagrams();
    }, [listDiagrams, setDiagramNumber, dialog.open]);

    useEffect(() => {
        setStep(CreateDiagramDialogStep.SELECT_DATABASE);
        setDatabaseType(DatabaseType.GENERIC);
        setDatabaseEdition(undefined);
        setScriptResult('');
    }, [dialog.open]);

    const createDiagramMutation = useMutation(
        async (diagram: Diagram): Promise<Diagram | undefined> => {
            let tablesCount = 0;
            if (diagram.tables) {
                tablesCount = diagram.tables.length;
            }

            const encodedJson = encodeUtf8ToBase64(
                diagramToJSONOutput(diagram)
            );

            const response = await fetch(`${PASTE_URL}/chartdb/v1/diagrams`, {
                method: 'POST',
                headers: security.getAuthorizationHeader(),
                body: JSON.stringify({
                    clientDiagramId: diagram.id.slice(8),
                    content: encodedJson,
                    name: diagram.name,
                    tablesCount: tablesCount,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                toast.error(data['details'] || data['message']);
                return;
            }

            diagram.id = data.id;

            return diagram;
        }
    );

    const hasExistingDiagram = (diagramId ?? '').trim().length !== 0;

    const importNewDiagram = useCallback(async () => {
        const databaseMetadata: DatabaseMetadata =
            loadDatabaseMetadata(scriptResult);

        const diagram = await loadFromDatabaseMetadata({
            databaseType,
            databaseMetadata,
            diagramNumber,
            databaseEdition:
                databaseEdition?.trim().length === 0
                    ? undefined
                    : databaseEdition,
        });

        await addDiagram({ diagram });
        await updateConfig({ defaultDiagramId: diagram.id });
        closeCreateDiagramDialog();
        navigate(`/diagrams/${diagram.id}`);
    }, [
        databaseType,
        addDiagram,
        databaseEdition,
        closeCreateDiagramDialog,
        navigate,
        updateConfig,
        scriptResult,
        diagramNumber,
    ]);

    const createEmptyDiagram = useCallback(async () => {
        const diagram: Diagram = {
            id: generateDiagramId(),
            name: `Diagram ${diagramNumber}`,
            databaseType: databaseType ?? DatabaseType.GENERIC,
            databaseEdition:
                databaseEdition?.trim().length === 0
                    ? undefined
                    : databaseEdition,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (security.getUserType() !== 'GUEST') {
            const savedDiagram =
                await createDiagramMutation.mutateAsync(diagram);
            if (!savedDiagram) {
                return;
            }
            diagram.id = savedDiagram.id;
        }

        await addDiagram({ diagram });
        closeCreateDiagramDialog();
        navigate(`/diagrams/${diagram.id}`);
    }, [
        databaseType,
        addDiagram,
        databaseEdition,
        closeCreateDiagramDialog,
        navigate,
        diagramNumber,
        createDiagramMutation,
        security,
    ]);

    return (
        <Dialog
            {...dialog}
            onOpenChange={(open) => {
                if (!hasExistingDiagram) {
                    return;
                }

                if (!open) {
                    closeCreateDiagramDialog();
                }
            }}
        >
            <DialogContent
                className="flex max-h-screen w-[90vw] max-w-[90vw] flex-col overflow-y-auto md:overflow-visible lg:max-w-[60vw] xl:lg:max-w-lg xl:min-w-[45vw]"
                showClose={hasExistingDiagram}
            >
                {step === CreateDiagramDialogStep.SELECT_DATABASE ? (
                    <SelectDatabase
                        createNewDiagram={createEmptyDiagram}
                        databaseType={databaseType}
                        hasExistingDiagram={hasExistingDiagram}
                        setDatabaseType={setDatabaseType}
                        onContinue={() =>
                            setStep(CreateDiagramDialogStep.IMPORT_DATABASE)
                        }
                    />
                ) : (
                    <ImportDatabase
                        onImport={importNewDiagram}
                        onCreateEmptyDiagram={createEmptyDiagram}
                        databaseEdition={databaseEdition}
                        databaseType={databaseType}
                        scriptResult={scriptResult}
                        setDatabaseEdition={setDatabaseEdition}
                        goBack={() =>
                            setStep(CreateDiagramDialogStep.SELECT_DATABASE)
                        }
                        setScriptResult={setScriptResult}
                        title={t('new_diagram_dialog.import_database.title')}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
};
