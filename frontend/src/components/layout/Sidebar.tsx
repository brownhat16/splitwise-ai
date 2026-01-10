'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    MessageSquare,
    LayoutDashboard,
    Receipt,
    Users,
    Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
    { href: '/', label: 'Chat', icon: MessageSquare },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/groups', label: 'Groups', icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-border bg-background/80 backdrop-blur-xl z-50">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    SplitAI
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Icon className={cn("w-4 h-4", isActive && "text-primary")} />
                            <span>{item.label}</span>
                            {isActive && (
                                <motion.div
                                    layoutId="sidebar-active"
                                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-muted/20">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold ring-2 ring-background">
                        YO
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">You</p>
                        <p className="text-xs text-muted-foreground truncate">Premium Plan</p>
                    </div>
                    <Settings className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
                </div>
            </div>
        </aside>
    );
}
