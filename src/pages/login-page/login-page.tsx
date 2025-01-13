import { Button } from '@/components/button/button';
import { Card } from '@/components/card/card';
import { Input } from '@/components/input/input';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { StorageProvider } from '@/context/storage-context/storage-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { useSecurity } from '@/hooks/use-security';
import { useStorage } from '@/hooks/use-storage';
import { ReactFlowProvider } from '@xyflow/react';
import { t } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useKeyPressEvent } from 'react-use';

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

    useKeyPressEvent('Enter', login);

    return (
        <>
            <section className="flex h-screen w-screen flex-col items-center bg-background dark:bg-[#01050f]">
                <Card className="mt-10 flex w-screen max-w-lg flex-col p-2">
                    <img
                        src={'/buckle.png'}
                        className="mt-8 h-20 object-scale-down"
                    />
                    <div className="my-12 h-px bg-gray-300 dark:bg-[#1e293b]"></div>
                    <div className="flex flex-col px-4">
                        <Input
                            type="text"
                            placeholder={t('login.username_hint')}
                            className="mb-4 h-10 w-full focus-visible:ring-0"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <Button
                            type="button"
                            onClick={login}
                            disabled={false}
                            className="mb-8 ml-auto h-10 w-1/2"
                        >
                            {t('login.login_btn')}
                        </Button>
                    </div>
                </Card>
            </section>
        </>
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
