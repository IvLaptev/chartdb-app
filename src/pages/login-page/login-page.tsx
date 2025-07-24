import { Button } from '@/components/button/button';
import { Card } from '@/components/card/card';
import { Input } from '@/components/input/input';
import { Spinner } from '@/components/spinner/spinner';
import { LocalConfigProvider } from '@/context/local-config-context/local-config-provider';
import { StorageProvider } from '@/context/storage-context/storage-provider';
import { ThemeProvider } from '@/context/theme-context/theme-provider';
import { useSecurity } from '@/hooks/use-security';
import { useStorage } from '@/hooks/use-storage';
import { PASTE_URL } from '@/lib/env';
import { ReactFlowProvider } from '@xyflow/react';
import { t } from 'i18next';
import React, { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { toast } from 'react-toastify';
// import { useKeyPressEvent } from 'react-use';

const emailRegex = /^\S+@(mirea.ru|edu.mirea.ru)$/;

export const LoginComponent: React.FC = () => {
    const storage = useStorage();
    const security = useSecurity();

    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');

    const [usernameError, setUsernameError] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string>('');

    const [loginAsGuestEnabled, toggleLoginAsGuestEnabled] =
        useState<boolean>(false);
    const [registrationModeEnabled, toggleRegistrationModeEnabled] =
        useState<boolean>(false);

    const loginMutation = useMutation(async () => {
        let token: string | null = null;
        let userId: string = '';
        if (loginAsGuestEnabled) {
            const result = await fetch(`${PASTE_URL}/chartdb/v1/users`, {
                method: 'POST',
                body: JSON.stringify({ login: username, password }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await result.json();
            if (!result.ok) {
                toast.error(data['details'] || data['message']);
            }

            userId = data['id'];
        } else {
            if (!emailRegex.test(username)) {
                setUsernameError(t('login.username_error'));
                return;
            } else {
                setUsernameError('');
            }

            const result = await fetch(`${PASTE_URL}/chartdb/v1/users:login`, {
                method: 'POST',
                body: JSON.stringify({ login: username, password }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await result.json();
            if (!result.ok) {
                toast.error(data['details'] || data['message']);
                return;
            }

            userId = data['userId'];
            token = data['token'];
        }

        security.login(userId, token);
    });

    const registerMutation = useMutation(async () => {
        if (!emailRegex.test(username)) {
            setUsernameError(t('login.username_error'));
            return;
        } else {
            setUsernameError('');
        }

        if (password.length < 8) {
            setPasswordError(t('login.password_error'));
            return;
        } else {
            setPasswordError('');
        }

        const result = await fetch(`${PASTE_URL}/chartdb/v1/users`, {
            method: 'POST',
            body: JSON.stringify({ login: username, password }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await result.json();
        if (!result.ok) {
            toast.error(data['details'] || data['message']);
            return;
        }

        toast.success(t('login.successful_registration'));
        flush();
    });

    const confirmMutation = useMutation(async (cid: string) => {
        const response = await fetch(`${PASTE_URL}/chartdb/v1/users:confirm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cid }),
        });

        const data = await response.json();
        if (!response.ok) {
            toast.error(data['details'] || data['message']);
            return;
        }

        toast.success(t('login.successful_confirmation'));
        history.pushState(null, '', '/');
    });

    useQuery('confirmation', () => {
        if (location.pathname === '/confirm' && location.search.length > 0) {
            location.search
                .split('?')[1]
                .split('&')
                .forEach((param) => {
                    const [key, value] = param.split('=');
                    if (
                        key === 'cid' &&
                        confirmMutation.isIdle &&
                        !confirmMutation.isLoading
                    ) {
                        confirmMutation.mutate(value);
                    }
                });
        }
    });

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

    const flush = () => {
        setUsername('');
        setPassword('');
        setUsernameError('');
        setPasswordError('');
    };

    const isLoading = useCallback(() => {
        return loginMutation.isLoading || registerMutation.isLoading;
    }, [loginMutation.isLoading, registerMutation.isLoading]);

    // useKeyPressEvent('Enter', login);

    return (
        <>
            <section className="flex h-screen w-screen flex-col items-center bg-background dark:bg-[#01050f]">
                <Card className="mt-10 flex w-screen max-w-lg flex-col p-2 sm:w-96">
                    <img
                        src={'/buckle.png'}
                        className="mt-8 h-20 object-scale-down"
                    />
                    <div className="my-12 h-px bg-gray-300 dark:bg-[#1e293b]"></div>
                    <div className="flex flex-col px-4">
                        {loginAsGuestEnabled ? (
                            <>
                                <Input
                                    type="text"
                                    disabled={isLoading()}
                                    placeholder={t('login.username_guest_hint')}
                                    className="mb-4 h-10 w-full focus-visible:ring-0"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                />
                                <Button
                                    type="button"
                                    onClick={() => loginMutation.mutate()}
                                    disabled={isLoading()}
                                    className="ml-auto h-10 w-1/2"
                                >
                                    {t('login.login_btn')}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Input
                                    type="text"
                                    disabled={isLoading()}
                                    placeholder={
                                        registrationModeEnabled
                                            ? t('login.registration_login_hint')
                                            : t('login.username_student_hint')
                                    }
                                    className="mb-4 h-10 w-full focus-visible:ring-0"
                                    value={username}
                                    onChange={(e) =>
                                        setUsername(e.target.value)
                                    }
                                />
                                <Input
                                    type="password"
                                    disabled={isLoading()}
                                    placeholder={
                                        registrationModeEnabled
                                            ? t(
                                                  'login.registration_password_hint'
                                              )
                                            : t('login.password_hint')
                                    }
                                    className=" h-10 w-full focus-visible:ring-0"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                />
                                {usernameError && (
                                    <div className="text-sm text-red-500">
                                        {usernameError}
                                    </div>
                                )}
                                {passwordError && (
                                    <div className="text-sm text-red-500">
                                        {passwordError}
                                    </div>
                                )}
                                <div className="mt-4 flex flex-col-reverse sm:flex-row sm:space-x-4">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            if (registrationModeEnabled) {
                                                toggleRegistrationModeEnabled(
                                                    false
                                                );
                                            } else {
                                                toggleRegistrationModeEnabled(
                                                    true
                                                );
                                            }

                                            flush();
                                        }}
                                        disabled={isLoading()}
                                        variant={'ghost'}
                                        className="ml-auto h-10 w-full font-normal text-gray-400"
                                    >
                                        {registrationModeEnabled
                                            ? t('login.login_btn')
                                            : t('login.signup_btn')}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            registrationModeEnabled
                                                ? registerMutation.mutate()
                                                : loginMutation.mutate()
                                        }
                                        disabled={isLoading()}
                                        className="mb-2 ml-auto h-10 w-full"
                                    >
                                        {isLoading() ? (
                                            <Spinner className="mr-1 size-5 text-primary-foreground" />
                                        ) : registrationModeEnabled ? (
                                            t('login.signup_btn')
                                        ) : (
                                            t('login.login_btn')
                                        )}
                                    </Button>
                                </div>
                            </>
                        )}
                        <div className="my-6 flex flex-row items-center space-x-2">
                            <div className="h-px w-full bg-gray-300 dark:bg-[#1e293b]"></div>
                            <p className="text-xs uppercase tracking-widest text-gray-300 dark:text-[#1e293b]">
                                {t('login.or')}
                            </p>
                            <div className="h-px w-full bg-gray-300 dark:bg-[#1e293b]"></div>
                        </div>
                        <Button
                            type="button"
                            onClick={() => {
                                toggleLoginAsGuestEnabled(!loginAsGuestEnabled);
                                toggleRegistrationModeEnabled(false);
                                flush();
                            }}
                            disabled={isLoading()}
                            variant={'secondary'}
                            className="mb-6 ml-auto h-10 w-full"
                        >
                            {loginAsGuestEnabled
                                ? t('login.login_as_student_btn')
                                : t('login.login_as_guest_btn')}
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
