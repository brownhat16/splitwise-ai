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
        // Let's assume I update api.setAuth to save role, OR I just save it in localStorage in Login Page.
        // Quick fix: Update Login/Register page to save role, or just read from token if I could decode it.
        // Simpler: Just save 'role' in localStorage in Login page.
        // But for this component, let's just read it.
        // Actually, I'll read it from api.userId if I fetch user details? No, let's stick to localStorage 'role'.
    }, []);

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
            </div>
        </aside>
    );
}
