import React from 'react';
import type { StorageContext } from './storage-context';
import { storageContext } from './storage-context';
import Dexie, { type EntityTable } from 'dexie';
import type { Diagram } from '@/lib/domain/diagram';
import type { DBTable } from '@/lib/domain/db-table';
import type { DBRelationship } from '@/lib/domain/db-relationship';
import { determineCardinalities } from '@/lib/domain/db-relationship';
import type { ChartDBConfig } from '@/lib/domain/config';
import type { DBDependency } from '@/lib/domain/db-dependency';
import { useSecurity } from '@/hooks/use-security';
import type { DBHistory } from '@/lib/domain/db-history';
import {
    diagramFromJSONInput,
    diagramToJSONOutput,
} from '@/lib/export-import-utils';
import { decodeBase64ToUtf8, encodeUtf8ToBase64 } from '@/lib/utils';
import { PASTE_URL } from '@/lib/env';
import { toast } from 'react-toastify';
import { DatabaseType } from '@/lib/domain/database-type';
import { useMutation } from 'react-query';

export const StorageProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const { getUser, getUserType, getAuthorizationHeader } = useSecurity();

    const deleteDiagramMutation = useMutation(async (id: string) => {
        const response = await fetch(`${PASTE_URL}/chartdb/v1/diagrams/${id}`, {
            headers: getAuthorizationHeader(),
            method: 'DELETE',
        });

        if (!response.ok) {
            const data = await response.json();
            toast.error(data['details'] || data['message']);
        }
    });

    const db = new Dexie('ChartDB') as Dexie & {
        diagrams: EntityTable<
            Diagram,
            'id' // primary key "id" (for the typings only)
        >;
        db_tables: EntityTable<
            DBTable & { diagramId: string },
            'id' // primary key "id" (for the typings only)
        >;
        db_relationships: EntityTable<
            DBRelationship & { diagramId: string },
            'id' // primary key "id" (for the typings only)
        >;
        db_dependencies: EntityTable<
            DBDependency & { diagramId: string },
            'id' // primary key "id" (for the typings only)
        >;
        config: EntityTable<
            ChartDBConfig & { id: number },
            'id' // primary key "id" (for the typings only)
        >;
    };

    // Schema declaration:
    db.version(1).stores({
        diagrams: '++id, name, databaseType, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, x, y, fields, indexes, color, createdAt, width',
        db_relationships:
            '++id, diagramId, name, sourceTableId, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(2).upgrade((tx) =>
        tx
            .table<DBTable & { diagramId: string }>('db_tables')
            .toCollection()
            .modify((table) => {
                for (const field of table.fields) {
                    field.type = {
                        // @ts-expect-error string before
                        id: (field.type as string).split(' ').join('_'),
                        // @ts-expect-error string before
                        name: field.type,
                    };
                }
            })
    );

    db.version(3).stores({
        diagrams:
            '++id, name, databaseType, databaseEdition, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, x, y, fields, indexes, color, createdAt, width',
        db_relationships:
            '++id, diagramId, name, sourceTableId, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(4).stores({
        diagrams:
            '++id, name, databaseType, databaseEdition, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, x, y, fields, indexes, color, createdAt, width, comment',
        db_relationships:
            '++id, diagramId, name, sourceTableId, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(5).stores({
        diagrams:
            '++id, name, databaseType, databaseEdition, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, schema, x, y, fields, indexes, color, createdAt, width, comment',
        db_relationships:
            '++id, diagramId, name, sourceSchema, sourceTableId, targetSchema, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(6).upgrade((tx) =>
        tx
            .table<DBRelationship & { diagramId: string }>('db_relationships')
            .toCollection()
            .modify((relationship, ref) => {
                const {
                    sourceCardinality,
                    targetCardinality,
                } = // @ts-expect-error string before
                    determineCardinalities(relationship.type ?? 'one_to_one');

                relationship.sourceCardinality = sourceCardinality;
                relationship.targetCardinality = targetCardinality;

                // @ts-expect-error string before
                delete ref.value.type;
            })
    );

    db.version(7).stores({
        diagrams:
            '++id, name, databaseType, databaseEdition, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, schema, x, y, fields, indexes, color, createdAt, width, comment',
        db_relationships:
            '++id, diagramId, name, sourceSchema, sourceTableId, targetSchema, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        db_dependencies:
            '++id, diagramId, schema, tableId, dependentSchema, dependentTableId, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(8).stores({
        diagrams:
            '++id, name, databaseType, databaseEdition, createdAt, updatedAt',
        db_tables:
            '++id, diagramId, name, schema, x, y, fields, indexes, color, createdAt, width, comment, isView, isMaterializedView, order',
        db_relationships:
            '++id, diagramId, name, sourceSchema, sourceTableId, targetSchema, targetTableId, sourceFieldId, targetFieldId, type, createdAt',
        db_dependencies:
            '++id, diagramId, schema, tableId, dependentSchema, dependentTableId, createdAt',
        config: '++id, defaultDiagramId',
    });

    db.version(9).upgrade((tx) =>
        tx
            .table<DBTable & { diagramId: string }>('db_tables')
            .toCollection()
            .modify((table) => {
                for (const field of table.fields) {
                    if (typeof field.nullable === 'string') {
                        field.nullable =
                            (field.nullable as string).toLowerCase() === 'true';
                    }
                }
            })
    );

    db.on('ready', async () => {
        const config = await getConfig();

        if (!config) {
            const diagrams = await db.diagrams.toArray();

            await db.config.add({
                id: 1,
                defaultDiagramId: diagrams?.[0]?.id ?? '',
            });
        }
    });

    // Init MIREA database
    const mireaDB = new Dexie('HistoryDB') as Dexie & {
        diagrams: EntityTable<
            DBHistory,
            'id' // primary key "id" (for the typings only)
        >;
    };

    // Schema declaration:
    mireaDB.version(1).stores({
        diagrams: '++id, uid, metadata',
    });

    mireaDB.version(2).stores({
        diagrams: '++id, uid, metadata, createdAt, updatedAt',
    });

    const syncDiagram = async (key: string) => {
        const orig = await getDiagram(key, {
            includeDependencies: true,
            includeRelationships: true,
            includeTables: true,
        });

        const meta = await mireaDB.diagrams.get(key);

        if (!orig) {
            if (meta) {
                await mireaDB.diagrams.delete(key);
            }
            return;
        }

        const extra = encodeUtf8ToBase64(diagramToJSONOutput(orig));

        if (!meta) {
            await mireaDB.diagrams.add({
                id: key,
                uid: encodeUtf8ToBase64(getUser()!),
                metadata: extra,
                createdAt: orig.createdAt,
                updatedAt: orig.updatedAt,
            });
            return;
        }

        meta.metadata = extra;
        meta.updatedAt = orig.updatedAt;

        await mireaDB.diagrams.update(key, meta);
        return;
    };

    const getConfig: StorageContext['getConfig'] = async (): Promise<
        ChartDBConfig | undefined
    > => {
        return await db.config.get(1);
    };

    const updateConfig: StorageContext['updateConfig'] = async (
        config: Partial<ChartDBConfig>
    ) => {
        await db.config.update(1, config);
    };

    const addDiagram: StorageContext['addDiagram'] = async ({
        diagram,
        withSync = true,
    }: {
        diagram: Diagram;
        withSync?: boolean;
    }) => {
        await db.diagrams.add({
            id: diagram.id,
            name: diagram.name,
            databaseType: diagram.databaseType,
            databaseEdition: diagram.databaseEdition,
            createdAt: diagram.createdAt,
            updatedAt: diagram.updatedAt,
        });

        const tables = diagram.tables ?? [];
        for (const table of tables) {
            await addTable({ diagramId: diagram.id, table });
        }

        const relationships = diagram.relationships ?? [];
        for (const relationship of relationships) {
            addRelationship({ diagramId: diagram.id, relationship });
        }

        const dependencies = diagram.dependencies ?? [];
        for (const dependency of dependencies) {
            addDependency({ diagramId: diagram.id, dependency });
        }

        if (withSync) {
            await syncDiagram(diagram.id);
        }
    };

    const listDiagrams: StorageContext['listDiagrams'] = async (
        options: {
            includeTables?: boolean;
            includeRelationships?: boolean;
            includeDependencies?: boolean;
        } = {
            includeRelationships: false,
            includeTables: false,
            includeDependencies: false,
        }
    ): Promise<Diagram[]> => {
        if (getUserType() !== 'GUEST') {
            const response = await fetch(`${PASTE_URL}/chartdb/v1/diagrams`, {
                headers: getAuthorizationHeader(),
            });

            const data = await response.json();
            if (!response.ok) {
                toast.error(data['details'] || data['message']);
                return [];
            }

            return data['diagrams'].map(
                (diagram: {
                    id: string;
                    name: string;
                    updatedAt: string;
                    createdAt: string;
                    tablesCount: number;
                }): Diagram => {
                    const tables: Array<DBTable> = [];
                    for (let i = 0; i < diagram.tablesCount; i++) {
                        tables.push({
                            id: i.toString(),
                            name: i.toString(),
                            x: 0,
                            y: 0,
                            fields: [],
                            indexes: [],
                            color: '',
                            isView: false,
                            createdAt: 1,
                        });
                    }
                    return {
                        id: diagram.id,
                        name: diagram.name,
                        updatedAt: new Date(diagram.updatedAt),
                        createdAt: new Date(diagram.createdAt),
                        databaseType: DatabaseType.GENERIC,
                        tables: tables,
                    };
                }
            );
        }

        let diagrams: Diagram[] = await db.diagrams.toArray();

        if (options.includeTables) {
            diagrams = await Promise.all(
                diagrams.map(async (diagram) => {
                    diagram.tables = await listTables(diagram.id);
                    return diagram;
                })
            );
        }

        if (options.includeRelationships) {
            diagrams = await Promise.all(
                diagrams.map(async (diagram) => {
                    diagram.relationships = await listRelationships(diagram.id);
                    return diagram;
                })
            );
        }

        if (options.includeDependencies) {
            diagrams = await Promise.all(
                diagrams.map(async (diagram) => {
                    diagram.dependencies = await listDependencies(diagram.id);
                    return diagram;
                })
            );
        }

        return diagrams;
    };

    const getDiagram: StorageContext['getDiagram'] = async (
        id: string,
        options: {
            includeTables?: boolean;
            includeRelationships?: boolean;
            includeDependencies?: boolean;
        } = {
            includeRelationships: false,
            includeTables: false,
            includeDependencies: false,
        }
    ): Promise<Diagram | undefined> => {
        const diagram = await db.diagrams.get(id);

        if (!diagram) {
            return undefined;
        }

        if (options.includeTables) {
            diagram.tables = await listTables(id);
        }

        if (options.includeRelationships) {
            diagram.relationships = await listRelationships(id);
        }

        if (options.includeDependencies) {
            diagram.dependencies = await listDependencies(id);
        }

        return diagram;
    };

    const updateDiagram: StorageContext['updateDiagram'] = async ({
        id,
        attributes,
    }: {
        id: string;
        attributes: Partial<Diagram>;
    }) => {
        await db.diagrams.update(id, attributes);

        if (attributes.id) {
            await db.db_tables
                .where('diagramId')
                .equals(id)
                .modify({ diagramId: attributes.id });
            await db.db_relationships
                .where('diagramId')
                .equals(id)
                .modify({ diagramId: attributes.id });
            await db.db_dependencies
                .where('diagramId')
                .equals(id)
                .modify({ diagramId: attributes.id });
        }
        await syncDiagram(id);
    };

    const deleteDiagram: StorageContext['deleteDiagram'] = async (
        id: string,
        withSync: boolean = true,
        local: boolean = false
    ) => {
        await Promise.all([
            db.diagrams.delete(id),
            db.db_tables.where('diagramId').equals(id).delete(),
            db.db_relationships.where('diagramId').equals(id).delete(),
            db.db_dependencies.where('diagramId').equals(id).delete(),
        ]);

        if (getUserType() !== 'GUEST' && !local) {
            await deleteDiagramMutation.mutate(id);
        }

        if (withSync) {
            await syncDiagram(id);
        }
    };

    const loadUserDiagrams: StorageContext['loadUserDiagrams'] = async (
        userId: string
    ) => {
        const metadata = await mireaDB.diagrams
            .where('uid')
            .equals(encodeUtf8ToBase64(userId))
            .toArray();

        for (let i = 0; i < metadata.length; i++) {
            if (!metadata[i].metadata) {
                continue;
            }

            const diagram = diagramFromJSONInput(
                decodeBase64ToUtf8(metadata[i].metadata!)
            );
            diagram.id = metadata[i].id;
            diagram.createdAt = metadata[i].createdAt;
            diagram.updatedAt = metadata[i].updatedAt;

            await addDiagram({
                diagram: diagram,
                withSync: false,
            });
        }
        await updateConfig({
            defaultDiagramId: metadata.pop()?.id,
        });
    };

    const addTable: StorageContext['addTable'] = async ({
        diagramId,
        table,
    }: {
        diagramId: string;
        table: DBTable;
    }) => {
        await db.db_tables.add({
            ...table,
            diagramId,
        });
        await syncDiagram(diagramId);
    };

    const getTable: StorageContext['getTable'] = async ({
        id,
        diagramId,
    }: {
        diagramId: string;
        id: string;
    }): Promise<DBTable | undefined> => {
        return await db.db_tables.get({ id, diagramId });
    };

    const deleteDiagramTables: StorageContext['deleteDiagramTables'] = async (
        diagramId: string
    ) => {
        await db.db_tables.where('diagramId').equals(diagramId).delete();
        await syncDiagram(diagramId);
    };

    const updateTable: StorageContext['updateTable'] = async ({
        id,
        attributes,
    }) => {
        await db.db_tables.update(id, attributes);
        const table = await db.db_tables.get(id);
        await syncDiagram(table!.diagramId);
    };

    const putTable: StorageContext['putTable'] = async ({
        diagramId,
        table,
    }) => {
        await db.db_tables.put({ ...table, diagramId });
        await syncDiagram(diagramId);
    };

    const deleteTable: StorageContext['deleteTable'] = async ({
        id,
        diagramId,
    }: {
        id: string;
        diagramId: string;
    }) => {
        await db.db_tables.where({ id, diagramId }).delete();
        await syncDiagram(diagramId);
    };

    const listTables: StorageContext['listTables'] = async (
        diagramId: string
    ): Promise<DBTable[]> => {
        // Fetch all tables associated with the diagram
        const tables = await db.db_tables
            .where('diagramId')
            .equals(diagramId)
            .toArray();

        return tables;
    };

    const addRelationship: StorageContext['addRelationship'] = async ({
        diagramId,
        relationship,
    }: {
        diagramId: string;
        relationship: DBRelationship;
    }) => {
        await db.db_relationships.add({
            ...relationship,
            diagramId,
        });
        await syncDiagram(diagramId);
    };

    const deleteDiagramRelationships: StorageContext['deleteDiagramRelationships'] =
        async (diagramId: string) => {
            await db.db_relationships
                .where('diagramId')
                .equals(diagramId)
                .delete();
            await syncDiagram(diagramId);
        };

    const getRelationship: StorageContext['getRelationship'] = async ({
        id,
        diagramId,
    }: {
        diagramId: string;
        id: string;
    }): Promise<DBRelationship | undefined> => {
        return await db.db_relationships.get({ id, diagramId });
    };

    const updateRelationship: StorageContext['updateRelationship'] = async ({
        id,
        attributes,
    }: {
        id: string;
        attributes: Partial<DBRelationship>;
    }) => {
        await db.db_relationships.update(id, attributes);
        const relationship = await db.db_relationships.get(id);
        await syncDiagram(relationship!.diagramId);
    };

    const deleteRelationship: StorageContext['deleteRelationship'] = async ({
        id,
        diagramId,
    }: {
        id: string;
        diagramId: string;
    }) => {
        await db.db_relationships.where({ id, diagramId }).delete();
        await syncDiagram(diagramId);
    };

    const listRelationships: StorageContext['listRelationships'] = async (
        diagramId: string
    ): Promise<DBRelationship[]> => {
        // Sort relationships alphabetically
        return (
            await db.db_relationships
                .where('diagramId')
                .equals(diagramId)
                .toArray()
        ).sort((a, b) => {
            return a.name.localeCompare(b.name);
        });
    };

    const addDependency: StorageContext['addDependency'] = async ({
        diagramId,
        dependency,
    }) => {
        await db.db_dependencies.add({
            ...dependency,
            diagramId,
        });
        await syncDiagram(diagramId);
    };

    const getDependency: StorageContext['getDependency'] = async ({
        diagramId,
        id,
    }) => {
        return await db.db_dependencies.get({ id, diagramId });
    };

    const updateDependency: StorageContext['updateDependency'] = async ({
        id,
        attributes,
    }) => {
        await db.db_dependencies.update(id, attributes);
        const dep = await db.db_dependencies.get(id);
        await syncDiagram(dep!.diagramId);
    };

    const deleteDependency: StorageContext['deleteDependency'] = async ({
        diagramId,
        id,
    }) => {
        await db.db_dependencies.where({ id, diagramId }).delete();
        await syncDiagram(diagramId);
    };

    const listDependencies: StorageContext['listDependencies'] = async (
        diagramId
    ) => {
        return await db.db_dependencies
            .where('diagramId')
            .equals(diagramId)
            .toArray();
    };

    const deleteDiagramDependencies: StorageContext['deleteDiagramDependencies'] =
        async (diagramId) => {
            await db.db_dependencies
                .where('diagramId')
                .equals(diagramId)
                .delete();
            await syncDiagram(diagramId);
        };

    return (
        <storageContext.Provider
            value={{
                getConfig,
                updateConfig,
                addDiagram,
                listDiagrams,
                getDiagram,
                updateDiagram,
                deleteDiagram,
                loadUserDiagrams,
                addTable,
                getTable,
                updateTable,
                putTable,
                deleteTable,
                listTables,
                addRelationship,
                getRelationship,
                updateRelationship,
                deleteRelationship,
                listRelationships,
                deleteDiagramTables,
                deleteDiagramRelationships,
                addDependency,
                getDependency,
                updateDependency,
                deleteDependency,
                listDependencies,
                deleteDiagramDependencies,
            }}
        >
            {children}
        </storageContext.Provider>
    );
};
