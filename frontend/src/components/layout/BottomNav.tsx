'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    MessageSquare,
    LayoutDashboard,
    Receipt,
    Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
    { href: '/', label: 'Chat', icon: MessageSquare },
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
    { href: '/groups', label: 'Groups', icon: Users },
];

export default function BottomNav() {
    const pathname = usePathname();

    if (['/login', '/register'].includes(pathname)) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden pb-safe">
            {/* Gradient Fade for content scrolling under */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

            {/* Floating Docks */}
            <div className="relative px-6 pb-6 pt-2">
                <div className="flex justify-around items-center bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg p-2 ring-1 ring-black/5 dark:ring-white/10">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex flex-col items-center justify-center flex-1 py-3 px-1 rounded-xl transition-all duration-300",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="bottom-nav-active"
                                        className="absolute inset-0 bg-secondary rounded-xl -z-10"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    />
                                )}
                                <Icon className={cn("w-6 h-6 mb-1 transition-transform duration-200", isActive && "scale-110")} />
                                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
