'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface AppShellProps {
    children: React.ReactNode;
}

// Keep-alive interval: 1 minute
const KEEP_ALIVE_INTERVAL = 60 * 1000;

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const isAuthPage = ['/login', '/register'].includes(pathname);

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

    return (
        <>
            {!isAuthPage && <MobileHeader />}
            {!isAuthPage && <Sidebar />}

            <main className={cn(
                "min-h-screen transition-all duration-200",
                !isAuthPage && "md:ml-64 pb-[90px] md:pb-0 pt-16 md:pt-0"
            )}>
                {children}
            </main>

            {!isAuthPage && <BottomNav />}
        </>
    );
}
