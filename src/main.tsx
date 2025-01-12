import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './globals.css';
import { App } from './app';
import './i18n/i18n';
import { SecurityProvider } from './context/security-context/security-provider';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SecurityProvider>
            <App />
        </SecurityProvider>
    </React.StrictMode>
);
