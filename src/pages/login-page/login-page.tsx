import { Button } from '@/components/button/button';
import { Input } from '@/components/input/input';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { StorageProvider } from '@/context/storage-context/storage-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { useSecurity } from '@/hooks/use-security';
import { useStorage } from '@/hooks/use-storage';
import { ReactFlowProvider } from '@xyflow/react';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';

export const LoginComponent: React.FC = () => {
    const storage = useStorage();
    const security = useSecurity();

    const [username, setUsername] = useState<string>('');

    useEffect(() => {
        const deletionTasks: Array<Promise<void>> = [];

        storage
            .listDiagrams({
                includeDependencies: true,
                includeRelationships: true,
                includeTables: true,
            })
            .then((diagrams) =>
                diagrams.forEach((diagram) => {
                    deletionTasks.push(
                        storage.deleteDiagram(diagram.id, false)
                    );
                })
            );

        Promise.all(deletionTasks).catch((e) => {
            console.error(e);
        });
    });

    const login = () => {
        storage.loadUserDiagrams(username).then(() => security.login(username));
    };

    return (
        <main>
            <Input
                type="text"
                placeholder={t('login.username_hint')}
                className="h-8 w-full focus-visible:ring-0"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <Button type="button" onClick={login} disabled={false}>
                {t('login.login_btn')}
            </Button>
        </main>
    );
};

export const LoginPage: React.FC = () => {
    return (
        <LocalConfigProvider>
            <ThemeProvider>
                <StorageProvider>
                    <ReactFlowProvider>
                        <LoginComponent />
                    </ReactFlowProvider>
                </StorageProvider>
            </ThemeProvider>
        </LocalConfigProvider>
    );
};
