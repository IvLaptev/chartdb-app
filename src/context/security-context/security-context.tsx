import { emptyFn } from '@/lib/utils';
import { createContext } from 'react';

export interface SecurityContext {
    getUser: () => string | null;
    getToken: () => string | null;
    getUserType: () => 'GUEST' | 'STUDENT' | 'TEACHER' | 'ADMIN';
    getAuthorizationHeader: () => Record<string, string>;
    login: (userID: string, token: string | null) => boolean;
    logout: () => void;
}

export const securityContextInitialValue: SecurityContext = {
    getUser: emptyFn,
    getToken: emptyFn,
    getUserType: emptyFn,
    getAuthorizationHeader: emptyFn,
    login: emptyFn,
    logout: emptyFn,
};

export const securityContext = createContext<SecurityContext>(
    securityContextInitialValue
);
