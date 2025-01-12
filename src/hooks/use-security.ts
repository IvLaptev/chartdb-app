import { securityContext } from '@/context/security-context/security-context';
import { useContext } from 'react';

export const useSecurity = () => useContext(securityContext);
