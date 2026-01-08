'use client';

import Link from 'next/link';
import { PlusIcon, ChevronRightIcon, UsersIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import { mockGroups, mockBalances } from '@/lib/mock-data';

export default function GroupsPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 h-14">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Groups</h1>
                    <Link
                        href="/?message=Create a new group"
                        className="p-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </Link>
                </div>
            </header>

            {/* Group List */}
            <div className="px-4 py-4 space-y-3">
                {mockGroups.map((group) => {
                    // Calculate group balance (mock)
                    const groupBalance = Math.floor(Math.random() * 4000) - 2000;

                    return (
                        <Link
                            key={group.id}
                            href={`/groups/${group.id}`}
                            className="block p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                {/* Group Icon */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl">
                                    {group.name === 'Roommates' && '🏠'}
                                    {group.name === 'Goa Trip' && '🏖️'}
                                    {group.name === 'Office Lunch' && '🍱'}
                                </div>

                                {/* Group Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 dark:text-white">
                                        {group.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <UsersIcon className="w-4 h-4" />
                                        <span>{group.members.length} members</span>
                                    </div>
                                </div>

                                {/* Balance */}
                                <div className="text-right">
                                    <p className={`font-bold ${groupBalance >= 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {groupBalance >= 0 ? '+' : ''}₹{Math.abs(groupBalance).toLocaleString()}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {groupBalance >= 0 ? 'you are owed' : 'you owe'}
                                    </p>
                                </div>

                                <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                            </div>

                            {/* Member avatars */}
                            <div className="flex mt-3 -space-x-2">
                                {group.members.slice(0, 5).map((member, idx) => (
                                    <div
                                        key={idx}
                                        className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300"
                                    >
                                        {member.name.charAt(0)}
                                    </div>
                                ))}
                                {group.members.length > 5 && (
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-slate-500">
                                        +{group.members.length - 5}
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}

                {/* Empty state */}
                {mockGroups.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                            No groups yet
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6">
                            Create a group to track shared expenses
                        </p>
                        <Link
                            href="/?message=Create a group called Roommates"
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors"
                        >
                            Create Group
                        </Link>
                    </div>
                )}
            </div>

            <FloatingAIButton />
        </div>
    );
}
