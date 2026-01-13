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
    LogOut,
    Sun,
    Moon,
    Menu,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

const navItems = [
    { href: '/', label: 'Chat', icon: MessageSquare, description: 'Talk to AI' },
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, description: 'Your balances' },
    { href: '/expenses', label: 'Expenses', icon: Receipt, description: 'All transactions' },
    { href: '/groups', label: 'Groups', icon: Users, description: 'Manage groups' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Hide sidebar on auth pages
    if (['/login', '/register'].includes(pathname)) return null;

    const handleLogout = () => {
        api.logout();
        localStorage.removeItem('role');
        router.push('/login');
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-bold text-lg">S</span>
                    </div>
                    <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                        SplitAI
                    </span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Menu
                </p>
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            {/* Active indicator bar */}
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-indicator"
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <Icon className={cn(
                                "w-6 h-6 transition-all shrink-0",
                                isActive ? "text-primary" : "group-hover:text-primary group-hover:scale-110"
                            )} />

                            <div className="flex-1 min-w-0">
                                <span className={cn(
                                    "font-medium block",
                                    isActive ? "text-primary" : ""
                                )}>
                                    {item.label}
                                </span>
                                <span className="text-xs text-muted-foreground truncate hidden lg:block">
                                    {item.description}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border/50 space-y-1">
                {/* Admin Link */}
                {typeof window !== 'undefined' && localStorage.getItem('role') === 'admin' && (
                    <Link
                        href="/admin"
                        className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-colors",
                            pathname === '/admin' && "bg-amber-500/10"
                        )}
                    >
                        <Shield className="w-6 h-6" />
                        <span className="font-medium">Admin Panel</span>
                    </Link>
                )}

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all group"
                >
                    <div className="relative w-6 h-6">
                        <Sun className={cn(
                            "w-6 h-6 absolute inset-0 transition-all",
                            theme === 'dark' ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"
                        )} />
                        <Moon className={cn(
                            "w-6 h-6 absolute inset-0 transition-all",
                            theme === 'dark' ? "opacity-0 rotate-90" : "opacity-100 rotate-0"
                        )} />
                    </div>
                    <span className="font-medium">
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group"
                >
                    <LogOut className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    <span className="font-medium">Log Out</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Header */}
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/95 backdrop-blur-xl border-b border-border z-50 flex items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white font-bold">S</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">SplitAI</span>
                </Link>

                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? (
                        <X className="w-6 h-6" />
                    ) : (
                        <Menu className="w-6 h-6" />
                    )}
                </button>
            </header>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="md:hidden fixed inset-0 bg-black/50 z-40"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="md:hidden fixed left-0 top-0 bottom-0 w-72 bg-background border-r border-border z-50 flex flex-col"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 border-r border-border bg-background/80 backdrop-blur-xl z-50">
                <SidebarContent />
            </aside>

            {/* Spacer for mobile header */}
            <div className="md:hidden h-16" />
        </>
    );
}
