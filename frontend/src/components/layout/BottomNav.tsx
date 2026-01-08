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

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 z-50 md:hidden">
            <div className="flex justify-around items-center h-[72px] px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors ${isActive
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                }`}
                        >
                            <Icon className="w-6 h-6 mb-1" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
