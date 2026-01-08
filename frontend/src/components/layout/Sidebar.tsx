'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    ChatBubbleLeftRightIcon,
    HomeIcon,
    ClipboardDocumentListIcon,
    UserGroupIcon
} from '@heroicons/react/24/outline';
import {
    ChatBubbleLeftRightIcon as ChatSolid,
    HomeIcon as HomeSolid,
    ClipboardDocumentListIcon as ClipboardSolid,
    UserGroupIcon as UserGroupSolid
} from '@heroicons/react/24/solid';

const navItems = [
    { href: '/', label: 'Chat', icon: ChatBubbleLeftRightIcon, activeIcon: ChatSolid },
    { href: '/dashboard', label: 'Dashboard', icon: HomeIcon, activeIcon: HomeSolid },
    { href: '/expenses', label: 'Expenses', icon: ClipboardDocumentListIcon, activeIcon: ClipboardSolid },
    { href: '/groups', label: 'Groups', icon: UserGroupIcon, activeIcon: UserGroupSolid },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 h-screen fixed left-0 top-0">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">💰 SplitAI</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                        Y
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">You</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">you@example.com</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
