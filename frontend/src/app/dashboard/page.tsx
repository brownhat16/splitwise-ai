'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import api, { BalanceResponse } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
    const [balance, setBalance] = useState<BalanceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getBalance();
            setBalance(data);
        } catch (err) {
            console.error('Error fetching balance:', err);
            setError('Failed to load balances');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    // Use real API data only
    const totalOwedToYou = balance?.total_owed_to_you || 0;
    const totalYouOwe = balance?.total_you_owe || 0;
    const netBalance = balance?.net_balance || 0;
    const peopleWhoOweYou = balance?.owed_to_you || [];
    const peopleYouOwe = balance?.you_owe || [];

    return (
        <div className="min-h-screen bg-background pb-20 md:pl-64 pt-6">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
                        <p className="text-muted-foreground mt-1">Track your shared expenses and settlements.</p>
                    </div>
                    <button
                        onClick={fetchBalance}
                        disabled={loading}
                        className="p-2.5 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        aria-label="Refresh"
                    >
                        <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                    </button>
                </div>

                {/* Net Position Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground p-8 shadow-lg">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div>
                            <p className="text-primary-foreground/80 font-medium mb-1">Total Net Balance</p>
                            {loading ? (
                                <div className="h-12 w-48 bg-white/10 rounded animate-pulse" />
                            ) : (
                                <h2 className="text-5xl font-bold tracking-tight">
                                    {netBalance >= 0 ? '+' : ''}₹{Math.abs(netBalance).toLocaleString()}
                                </h2>
                            )}
                            <p className="mt-2 text-sm text-primary-foreground/70">
                                {netBalance >= 0
                                    ? "You're owed money overall 🎉"
                                    : "You owe money overall"}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 min-w-[140px] border border-white/10">
                                <div className="flex items-center gap-2 text-emerald-300 mb-1">
                                    <ArrowDownLeft className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider text-white/70">Owed to you</span>
                                </div>
                                <p className="text-2xl font-bold text-white">₹{totalOwedToYou.toLocaleString()}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 min-w-[140px] border border-white/10">
                                <div className="flex items-center gap-2 text-rose-300 mb-1">
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase tracking-wider text-white/70">You owe</span>
                                </div>
                                <p className="text-2xl font-bold text-white">₹{totalYouOwe.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Sections */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* People who owe you */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                                Owed to You
                            </h3>
                        </div>

                        {peopleWhoOweYou.length > 0 ? (
                            <div className="space-y-3">
                                {peopleWhoOweYou.map((person, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/?message=Settle with ${person.name}`}
                                        className="group flex items-center justify-between p-4 bg-card hover:bg-muted/50 border border-border rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                {person.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-foreground">{person.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                                ₹{person.amount.toLocaleString()}
                                            </p>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                Click to settle
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                                <p className="text-muted-foreground">No one owes you money.</p>
                            </div>
                        )}
                    </div>

                    {/* People you owe */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <ArrowUpRight className="w-5 h-5 text-rose-500" />
                                You Owe
                            </h3>
                        </div>
                        {peopleYouOwe.length > 0 ? (
                            <div className="space-y-3">
                                {peopleYouOwe.map((person, idx) => (
                                    <Link
                                        key={idx}
                                        href={`/?message=Settle with ${person.name}`}
                                        className="group flex items-center justify-between p-4 bg-card hover:bg-muted/50 border border-border rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-sm">
                                                {person.name.charAt(0)}
                                            </div>
                                            <span className="font-medium text-foreground">{person.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                                                ₹{person.amount.toLocaleString()}
                                            </p>
                                            <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                Click to settle
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
                                <p className="text-muted-foreground">You are debt free!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
