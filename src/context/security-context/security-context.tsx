import { emptyFn } from '@/lib/utils';
import { createContext } from 'react';
import type { UserType } from './security-provider';

export interface SecurityContext {
    getUser: () => string | null;
    getToken: () => string | null;
    getUserType: () => UserType;
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
