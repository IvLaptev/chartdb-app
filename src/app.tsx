import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { TooltipProvider } from './components/tooltip/tooltip';
import { HelmetData } from './helmet/helmet-data';
import { HelmetProvider } from 'react-helmet-async';
import { LoginPage } from './pages/login-page/login-page';
import { useSecurity } from './hooks/use-security';

export const App = () => {
    const { getUser } = useSecurity();

    return (
        <HelmetProvider>
            <HelmetData />
            <TooltipProvider>
                {!getUser() ? (
                    <LoginPage />
                ) : (
                    <RouterProvider router={router} />
                )}
            </TooltipProvider>
        </HelmetProvider>
    );
};
