'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import api, { BalanceResponse } from '@/lib/api';
import { mockBalances, mockUsers } from '@/lib/mock-data';

export default function DashboardPage() {
    const [balance, setBalance] = useState<BalanceResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchBalance() {
            try {
                const data = await api.getBalance();
                setBalance(data);
            } catch (error) {
                console.error('Error fetching balance:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchBalance();
    }, []);

    // Use mock data if API returns empty
    const totalOwedToYou = balance?.total_owed_to_you ||
        mockBalances.filter(b => b.amount > 0).reduce((sum, b) => sum + b.amount, 0);
    const totalYouOwe = balance?.total_you_owe ||
        Math.abs(mockBalances.filter(b => b.amount < 0).reduce((sum, b) => sum + b.amount, 0));
    const netBalance = totalOwedToYou - totalYouOwe;

    const peopleWhoOweYou = balance?.owed_to_you?.length
        ? balance.owed_to_you
        : mockBalances.filter(b => b.amount > 0).map(b => ({
            user_id: b.user.id,
            name: b.user.name,
            amount: b.amount
        }));

    const peopleYouOwe = balance?.you_owe?.length
        ? balance.you_owe
        : mockBalances.filter(b => b.amount < 0).map(b => ({
            user_id: b.user.id,
            name: b.user.name,
            amount: Math.abs(b.amount)
        }));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-8 md:px-8">
                <h1 className="text-xl font-semibold mb-6">Dashboard</h1>

                {/* Net Position */}
                <div className="text-center py-6">
                    <p className="text-indigo-200 text-sm mb-1">Your net balance</p>
                    <p className={`text-4xl font-bold ${netBalance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {netBalance >= 0 ? '+' : ''}₹{Math.abs(netBalance).toLocaleString()}
                    </p>
                    <p className="text-sm mt-2 text-indigo-200">
                        {netBalance >= 0
                            ? "You're owed money overall 🎉"
                            : "You owe money overall"}
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-indigo-200 text-xs mb-1">Owed to you</p>
                        <p className="text-2xl font-bold text-emerald-300">₹{totalOwedToYou.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                        <p className="text-indigo-200 text-xs mb-1">You owe</p>
                        <p className="text-2xl font-bold text-red-300">₹{totalYouOwe.toLocaleString()}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="px-4 py-6 md:px-8 space-y-6">
                {/* People who owe you */}
                {peopleWhoOweYou.length > 0 && (
                    <section>
                        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            People who owe you
                        </h2>
                        <div className="space-y-2">
                            {peopleWhoOweYou.map((person, idx) => (
                                <Link
                                    key={idx}
                                    href={`/?message=Settle with ${person.name}`}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-medium">
                                            {person.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-white">{person.name}</p>
                                            <p className="text-xs text-slate-500">owes you</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            ₹{person.amount.toLocaleString()}
                                        </span>
                                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* People you owe */}
                {peopleYouOwe.length > 0 && (
                    <section>
                        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                            People you owe
                        </h2>
                        <div className="space-y-2">
                            {peopleYouOwe.map((person, idx) => (
                                <Link
                                    key={idx}
                                    href={`/?message=Settle with ${person.name}`}
                                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 font-medium">
                                            {person.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-white">{person.name}</p>
                                            <p className="text-xs text-slate-500">you owe</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-red-600 dark:text-red-400">
                                            ₹{person.amount.toLocaleString()}
                                        </span>
                                        <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* All settled state */}
                {peopleWhoOweYou.length === 0 && peopleYouOwe.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🎉</div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                            All settled up!
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            You're square with everyone.
                        </p>
                    </div>
                )}
            </div>

            <FloatingAIButton />
        </div>
    );
}
