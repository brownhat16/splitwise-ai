'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AppShellProps {
    children: React.ReactNode;
}

// Keep-alive interval: 1 minute
const KEEP_ALIVE_INTERVAL = 60 * 1000;

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const isAuthPage = ['/login', '/register'].includes(pathname);

    // Authentication check
    useEffect(() => {
        const checkAuth = () => {
            // Check if token exists in localStorage
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

            if (token) {
                setIsAuthenticated(true);
            } else {
                setIsAuthenticated(false);
                // Redirect to login if not on auth page
                if (!isAuthPage) {
                    router.push('/login');
                }
            }
            setIsLoading(false);
        };

        checkAuth();
    }, [pathname, router, isAuthPage]);

    // Backend Keep-Alive: Ping health endpoint to prevent Render from sleeping
    useEffect(() => {
        const pingHealth = async () => {
            try {
                await api.healthCheck();
                console.log('[Keep-Alive] Backend pinged successfully');
            } catch (e) {
                console.warn('[Keep-Alive] Backend ping failed:', e);
            }
        };

        // Initial ping on mount
        pingHealth();

        // Set up interval
        const intervalId = setInterval(pingHealth, KEEP_ALIVE_INTERVAL);

        return () => clearInterval(intervalId);
    }, []);

    // Show loading state while checking auth
    if (isLoading && !isAuthPage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-pulse">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <p className="text-muted-foreground text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    // On auth pages, just render children
    if (isAuthPage) {
        return <>{children}</>;
    }

    // If not authenticated and not on auth page, don't render (redirect will happen)
    if (!isAuthenticated && !isAuthPage) {
        return null;
    }

    return (
        <>
            <Sidebar />

            <main className={cn(
                "min-h-screen transition-all duration-200"
            )}>
                {children}
            </main>

            <BottomNav />
        </>
    );
}
