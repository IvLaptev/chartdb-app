import type { PropsWithChildren } from 'react';
import React, { useState } from 'react';
import type { SecurityContext } from './security-context';
import { securityContext } from './security-context';
import { encodeUtf8ToBase64 } from '@/lib/utils';
import { useQuery } from 'react-query';
import { PASTE_URL } from '@/lib/env';
import { toast } from 'react-toastify';

export type UserType = 'GUEST' | 'STUDENT' | 'TEACHER' | 'ADMIN';

interface User {
    id: string;
    name: string;
    type: UserType;
}

export const SecurityProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const { data: user } = useQuery(
        [userId, token],
        async (): Promise<User | undefined> => {
            if (!userId) {
                return;
            }

            if (!token) {
                return {
                    id: userId,
                    name: '',
                    type: 'GUEST',
                };
            }

            const response = await fetch(
                `${PASTE_URL}/chartdb/v1/users/${userId}`,
                {
                    headers: getAuthorizationHeader(),
                }
            );

            const data = await response.json();
            if (!response.ok) {
                toast.error(data['details'] || data['message']);
                return;
            }

            let userType: UserType = 'GUEST';
            switch (data['type']) {
                case 'USER_TYPE_GUEST':
                    userType = 'GUEST';
                    break;
                case 'USER_TYPE_STUDENT':
                    userType = 'STUDENT';
                    break;
                case 'USER_TYPE_TEACHER':
                    userType = 'TEACHER';
                    break;
                case 'USER_TYPE_ADMIN':
                    userType = 'ADMIN';
                    break;
            }

            return {
                id: data['id'],
                name: data['login'],
                type: userType,
            };
        }
    );

    const getUser: SecurityContext['getUser'] = () => {
        if (!user) {
            return null;
        }

        return user.id;
    };

    const getToken: SecurityContext['getToken'] = () => token;

    const getUserType: SecurityContext['getUserType'] = () => {
        switch (user?.type) {
            case 'GUEST':
                return 'GUEST';
            case 'STUDENT':
                return 'STUDENT';
            case 'TEACHER':
                return 'TEACHER';
            case 'ADMIN':
                return 'ADMIN';
        }

        return 'GUEST';
    };

    const getAuthorizationHeader: SecurityContext['getAuthorizationHeader'] =
        (): Record<string, string> => {
            if (token === null) {
                return { 'x-user-id': encodeUtf8ToBase64(getUser() ?? '') };
            }

            return { Authorization: `Bearer ${token}` };
        };

    const login: SecurityContext['login'] = (
        userId: string,
        token: string | null
    ) => {
        setToken(token);
        setUserId(userId);
        return true;
    };

    const logout: SecurityContext['logout'] = () => {
        setUserId(null);
        setToken(null);
    };

    return (
        <securityContext.Provider
            value={{
                getUser: getUser,
                getToken: getToken,
                getUserType: getUserType,
                getAuthorizationHeader: getAuthorizationHeader,
                login: login,
                logout: logout,
            }}
        >
            {children}
        </securityContext.Provider>
    );
};
