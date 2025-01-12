import type { PropsWithChildren } from 'react';
import React, { useState } from 'react';
import type { SecurityContext } from './security-context';
import { securityContext } from './security-context';

export const SecurityProvider: React.FC<PropsWithChildren> = ({ children }) => {
    const [user, setUser] = useState<string | null>(null);

    const getUser: SecurityContext['getUser'] = () => user;

    const login: SecurityContext['login'] = (username: string) => {
        setUser(username);
        return true;
    };

    const logout: SecurityContext['logout'] = () => setUser(null);

    return (
        <securityContext.Provider
            value={{
                getUser: getUser,
                login: login,
                logout: logout,
            }}
        >
            {children}
        </securityContext.Provider>
    );
};
