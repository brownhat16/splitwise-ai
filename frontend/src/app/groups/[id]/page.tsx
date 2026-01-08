'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, Cog6ToothIcon, PlusIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import { mockGroups, mockExpenses, mockBalances } from '@/lib/mock-data';

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');

    const group = mockGroups.find(g => g.id === parseInt(id));
    const groupExpenses = mockExpenses.filter(e => e.group?.id === parseInt(id));

    if (!group) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                        Group not found
                    </h2>
                    <Link href="/groups" className="text-indigo-600 dark:text-indigo-400">
                        Back to groups
                    </Link>
                </div>
            </div>
        );
    }

    // Mock group balances
    const groupBalances = group.members.slice(1).map((member, idx) => ({
        user: member,
        amount: (idx % 2 === 0 ? 1 : -1) * (Math.floor(Math.random() * 2000) + 200)
    }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center justify-between px-4 h-14">
                    <Link href="/groups" className="p-2 -ml-2 text-white/80 hover:text-white">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <Link href={`/?message=Settings for ${group.name} group`} className="p-2 -mr-2 text-white/80 hover:text-white">
                        <Cog6ToothIcon className="w-5 h-5" />
                    </Link>
                </div>

                {/* Group Info */}
                <div className="px-4 pb-6 text-center">
                    <div className="text-4xl mb-2">
                        {group.name === 'Roommates' && '🏠'}
                        {group.name === 'Goa Trip' && '🏖️'}
                        {group.name === 'Office Lunch' && '🍱'}
                    </div>
                    <h1 className="text-xl font-bold mb-1">{group.name}</h1>
                    <p className="text-indigo-200 text-sm">{group.members.length} members</p>

                    {/* Members */}
                    <div className="flex justify-center mt-4 -space-x-2">
                        {group.members.map((member, idx) => (
                            <div
                                key={idx}
                                className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-sm font-medium"
                            >
                                {member.name.charAt(0)}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-4 gap-2 pb-4">
                    {(['expenses', 'balances'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab
                                    ? 'bg-white text-indigo-600'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
            </header>

            {/* Content */}
            <div className="px-4 py-4">
                {activeTab === 'expenses' && (
                    <div className="space-y-3">
                        {groupExpenses.length > 0 ? (
                            groupExpenses.map((expense) => (
                                <Link
                                    key={expense.id}
                                    href={`/expenses/${expense.id}`}
                                    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                                >
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg">
                                        💰
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-slate-800 dark:text-white">{expense.description}</p>
                                        <p className="text-sm text-slate-500">{expense.payer.name} paid</p>
                                    </div>
                                    <p className="font-bold text-slate-800 dark:text-white">
                                        ₹{expense.amount.toLocaleString()}
                                    </p>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">📝</div>
                                <p className="text-slate-500 dark:text-slate-400 mb-4">No expenses in this group yet</p>
                                <Link
                                    href={`/?message=Add expense to ${group.name}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Add Expense
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'balances' && (
                    <div className="space-y-3">
                        {groupBalances.map((balance, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${balance.amount >= 0
                                        ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
                                        : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                                    }`}>
                                    {balance.user.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-slate-800 dark:text-white">{balance.user.name}</p>
                                    <p className="text-sm text-slate-500">
                                        {balance.amount >= 0 ? 'owes you' : 'you owe'}
                                    </p>
                                </div>
                                <p className={`font-bold ${balance.amount >= 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    ₹{Math.abs(balance.amount).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <FloatingAIButton />
        </div>
    );
}
