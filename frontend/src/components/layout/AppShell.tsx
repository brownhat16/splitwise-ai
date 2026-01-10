'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';
import { cn } from '@/lib/utils';

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const isAuthPage = ['/login', '/register'].includes(pathname);

    return (
        <>
            {!isAuthPage && <MobileHeader />}
            {!isAuthPage && <Sidebar />}

            <main className={cn(
                "min-h-screen transition-all duration-200",
                !isAuthPage && "md:ml-64 pb-[90px] md:pb-0 pt-16 md:pt-0" // Add top padding for mobile header
            )}>
                {children}
            </main>

            {!isAuthPage && <BottomNav />}
        </>
    );
}
