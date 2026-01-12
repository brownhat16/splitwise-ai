'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PlusIcon, ChevronRightIcon, UsersIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import api, { GroupData } from '@/lib/api';

export default function GroupsPage() {
    const [groups, setGroups] = useState<GroupData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            const data = await api.getGroups();
            setGroups(data.groups);
            setLoading(false);
        };
        fetchGroups();
    }, []);

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

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {/* Group List */}
            {!loading && (
                <div className="px-4 py-4 space-y-3">
                    {groups.map((group) => (
                        <Link
                            key={group.id}
                            href={`/groups/${group.id}`}
                            className="block p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                {/* Group Icon */}
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl">
                                    {group.name.toLowerCase().includes('roommate') ? '🏠' :
                                        group.name.toLowerCase().includes('trip') ? '🏖️' :
                                            group.name.toLowerCase().includes('lunch') || group.name.toLowerCase().includes('office') ? '🍱' :
                                                group.name.toLowerCase().includes('family') ? '👨‍👩‍👧‍👦' : '👥'}
                                </div>

                                {/* Group Details */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 dark:text-white">
                                        {group.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <UsersIcon className="w-4 h-4" />
                                        <span>{group.member_count} members</span>
                                    </div>
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
                    ))}

                    {/* Empty state */}
                    {groups.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">👥</div>
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                                No groups yet
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Create a group to track shared expenses
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link
                                    href="/groups/new"
                                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors"
                                >
                                    Create Group
                                </Link>
                                <Link
                                    href="/"
                                    className="inline-flex items-center px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Use AI Chat
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <FloatingAIButton />
        </div>
    );
}
