import { emptyFn } from '@/lib/utils';
import { createContext } from 'react';

export interface SecurityContext {
    getUser: () => string | null;
    login: (username: string) => boolean;
    logout: () => void;
}

export const securityContextInitialValue: SecurityContext = {
    getUser: emptyFn,
    login: emptyFn,
    logout: emptyFn,
};

export const securityContext = createContext<SecurityContext>(
    securityContextInitialValue
);
