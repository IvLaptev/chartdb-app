import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './globals.css';
import { App } from './app';
import './i18n/i18n';
import { SecurityProvider } from './context/security-context/security-provider';
import { QueryClientProvider, QueryClient } from 'react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <SecurityProvider>
                <App />
            </SecurityProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
