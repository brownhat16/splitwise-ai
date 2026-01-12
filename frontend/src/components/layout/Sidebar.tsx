'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    MessageSquare,
    LayoutDashboard,
    Receipt,
    Users,
    Settings,
    Shield,
    LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import api from '@/lib/api';

const navItems = [
    { href: '/', label: 'Chat', icon: MessageSquare },
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/groups', label: 'Groups', icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Check role from local storage strictly on client
        const storedRole = localStorage.getItem('role'); // We need api to save role too!
        // Wait, api.setAuth saves token/userId. I should update api to save role or decode it.
        // For now, I'll rely on api.login returning role and I'll save it manually here or update api.
    }, []);

    // Auth check moved to AppShell

    // Hide sidebar on auth pages
    if (['/login', '/register'].includes(pathname)) return null;

    const handleLogout = () => {
        api.logout();
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border bg-background/80 backdrop-blur-xl z-50">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    SplitAI
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "text-primary-foreground bg-primary shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <Icon className={cn("w-5 h-5 transition-transform", isActive ? "scale-105" : "group-hover:scale-105")} />
                            <span className="font-medium text-sm">{item.label}</span>

                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="absolute inset-0 rounded-xl bg-primary -z-10"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 space-y-2">
                {/* Admin Link (Client-side check) */}
                {typeof window !== 'undefined' && localStorage.getItem('role') === 'admin' && (
                    <Link
                        href="/admin"
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors",
                            pathname === '/admin' && "bg-amber-500/10"
                        )}
                    >
                        <Shield className="w-5 h-5" />
                        <span className="font-medium text-sm">Admin Panel</span>
                    </Link>
                )}

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm">Log Out</span>
                </button>

                {/* GitHub Link */}
                <a
                    href="https://github.com/brownhat16/splitwise-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    <span className="font-medium text-sm">GitHub</span>
                </a>
            </div>
        </aside>
    );
}
