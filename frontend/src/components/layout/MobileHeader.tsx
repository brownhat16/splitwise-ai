'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';
import api from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function MobileHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);

    // Safety check: Don't show on login/register if AppShell logic fails or if needed
    // But AppShell handles rendering, so this is just internal logic

    useEffect(() => {
        setIsAdmin(localStorage.getItem('role') === 'admin');
    }, []);

    const handleLogout = () => {
        api.logout();
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 z-40 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    SplitAI
                </span>
                {isAdmin && (
                    <Link href="/admin">
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                            pathname === '/admin'
                                ? "bg-amber-500 text-white border-amber-600"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}>
                            ADMIN
                        </span>
                    </Link>
                )}
            </div>

            <div className="flex items-center gap-2">
                {isAdmin && pathname !== '/admin' && (
                    <Link href="/admin" className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-full transition-colors">
                        <Shield className="w-5 h-5" />
                    </Link>
                )}

                <button
                    onClick={handleLogout}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
