'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Filter, ChevronRight, RefreshCw } from 'lucide-react';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import api, { ExpenseData } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Group expenses by date
function groupExpensesByDate(expenses: ExpenseData[]) {
    const groups: { [key: string]: ExpenseData[] } = {};
    expenses.forEach(expense => {
        const date = expense.date?.split('T')[0] || 'Unknown';
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(expense);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDate(dateStr: string) {
    if (dateStr === 'Unknown') return 'Unknown Date';
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';

    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

function getExpenseEmoji(description: string) {
    const desc = description.toLowerCase();
    if (desc.includes('dinner') || desc.includes('food') || desc.includes('lunch')) return '🍽️';
    if (desc.includes('uber') || desc.includes('taxi') || desc.includes('ride')) return '🚗';
    if (desc.includes('hotel') || desc.includes('stay')) return '🏨';
    if (desc.includes('groceries') || desc.includes('grocery')) return '🛒';
    if (desc.includes('pizza')) return '🍕';
    if (desc.includes('coffee')) return '☕';
    if (desc.includes('movie') || desc.includes('theater')) return '🎬';
    if (desc.includes('rent')) return '🏠';
    if (desc.includes('bill') || desc.includes('utility')) return '📱';
    return '💰';
}

export default function ExpensesPage() {
    const [filter, setFilter] = useState<'all' | 'owed' | 'owing'>('all');
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchExpenses = async () => {
        setLoading(true);
        const data = await api.getExpenses();
        setExpenses(data.expenses);
        setLoading(false);
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const groupedExpenses = groupExpensesByDate(expenses);
    const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'You' : 'You';

    return (
        <div className="min-h-screen bg-background pb-20 md:pl-72 pt-16 md:pt-0">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
                            <p className="text-sm text-muted-foreground">
                                {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'} recorded
                            </p>
                        </div>
                        <button
                            onClick={fetchExpenses}
                            disabled={loading}
                            className="p-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                            aria-label="Refresh"
                        >
                            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                        </button>
                    </div>

                    {/* Filter tabs */}
                    <div className="flex gap-2">
                        {(['all', 'owed', 'owing'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-xl transition-all",
                                    filter === f
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                )}
                            >
                                {f === 'all' && 'All'}
                                {f === 'owed' && 'Owed to me'}
                                {f === 'owing' && 'I owe'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Loading state */}
                {loading && <SkeletonList count={5} />}

                {/* Expense List */}
                {!loading && groupedExpenses.length > 0 && (
                    <div className="space-y-8">
                        {groupedExpenses.map(([date, dateExpenses], groupIndex) => (
                            <motion.section
                                key={date}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: groupIndex * 0.1 }}
                            >
                                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
                                    {formatDate(date)}
                                </h2>
                                <div className="space-y-3">
                                    {dateExpenses.map((expense, expenseIndex) => (
                                        <motion.div
                                            key={expense.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: groupIndex * 0.1 + expenseIndex * 0.05 }}
                                        >
                                            <Link
                                                href={`/expenses/${expense.id}`}
                                                className="group flex items-center gap-4 p-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                                            >
                                                {/* Icon */}
                                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                                    {getExpenseEmoji(expense.description)}
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                        {expense.description}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {expense.payer?.name === userName ? 'You paid' : `${expense.payer?.name || 'Someone'} paid`}
                                                        {expense.group && ` • ${expense.group.name}`}
                                                    </p>
                                                </div>

                                                {/* Amount */}
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-foreground">
                                                        ₹{expense.amount.toLocaleString()}
                                                    </p>
                                                    {expense.payer?.name === userName && expense.splits.length > 1 && (
                                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                            you lent ₹{(expense.amount - (expense.splits.find(s => s.user.name === userName)?.amount || 0)).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>

                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            </Link>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && groupedExpenses.length === 0 && (
                    <EmptyState
                        type="expenses"
                        title="No expenses yet"
                        description="Start tracking your shared expenses. Add your first expense manually or use the AI chat to split bills with friends."
                        actionLabel="Add Expense"
                        actionHref="/expenses/new"
                    />
                )}
            </main>

            <FloatingAIButton />
        </div>
    );
}
