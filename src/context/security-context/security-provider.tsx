import type { PropsWithChildren } from 'react';
import React, { useState } from 'react';
import type { SecurityContext } from './security-context';
import { securityContext } from './security-context';
import { encodeUtf8ToBase64 } from '@/lib/utils';

export const SecurityProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    const getUser: SecurityContext['getUser'] = () => {
        return user;
    };

    const getToken: SecurityContext['getToken'] = () => token;

    const getUserType: SecurityContext['getUserType'] = () => {
        if (token === null) {
            return 'GUEST';
        }

        return 'STUDENT';
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
        setUser(userId);
        setToken(token);
        return true;
    };

    const logout: SecurityContext['logout'] = () => setUser(null);

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
