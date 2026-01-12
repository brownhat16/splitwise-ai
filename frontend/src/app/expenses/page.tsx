'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FunnelIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import api, { ExpenseData } from '@/lib/api';

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

export default function ExpensesPage() {
    const [filter, setFilter] = useState<'all' | 'owed' | 'owing'>('all');
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExpenses = async () => {
            setLoading(true);
            const data = await api.getExpenses();
            setExpenses(data.expenses);
            setLoading(false);
        };
        fetchExpenses();
    }, []);

    const groupedExpenses = groupExpensesByDate(expenses);
    const userName = typeof window !== 'undefined' ? localStorage.getItem('userName') || 'You' : 'You';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 h-14">
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Expenses</h1>
                    <button className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                        <FunnelIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex px-4 pb-3 gap-2">
                    {(['all', 'owed', 'owing'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${filter === f
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {f === 'all' && 'All'}
                            {f === 'owed' && 'Owed to me'}
                            {f === 'owing' && 'I owe'}
                        </button>
                    ))}
                </div>
            </header>

            {/* Loading state */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            )}

            {/* Expense List */}
            {!loading && (
                <div className="px-4 py-4 space-y-6">
                    {groupedExpenses.map(([date, dateExpenses]) => (
                        <section key={date}>
                            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                                {formatDate(date)}
                            </h2>
                            <div className="space-y-2">
                                {dateExpenses.map((expense) => (
                                    <Link
                                        key={expense.id}
                                        href={`/expenses/${expense.id}`}
                                        className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                                    >
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg">
                                            {expense.description.toLowerCase().includes('dinner') || expense.description.toLowerCase().includes('food') ? '🍽️' :
                                                expense.description.toLowerCase().includes('uber') || expense.description.toLowerCase().includes('taxi') ? '🚗' :
                                                    expense.description.toLowerCase().includes('hotel') ? '🏨' :
                                                        expense.description.toLowerCase().includes('groceries') ? '🛒' :
                                                            expense.description.toLowerCase().includes('pizza') ? '🍕' : '💰'}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-800 dark:text-white truncate">
                                                {expense.description}
                                            </p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {expense.payer?.name === userName ? 'You paid' : `${expense.payer?.name || 'Someone'} paid`}
                                                {expense.group && ` • ${expense.group.name}`}
                                            </p>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 dark:text-white">
                                                ₹{expense.amount.toLocaleString()}
                                            </p>
                                            {expense.payer?.name === userName && expense.splits.length > 1 && (
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                    you lent ₹{(expense.amount - (expense.splits.find(s => s.user.name === userName)?.amount || 0)).toLocaleString()}
                                                </p>
                                            )}
                                        </div>

                                        <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                                    </Link>
                                ))}
                            </div>
                        </section>
                    ))}

                    {/* Empty state */}
                    {groupedExpenses.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📝</div>
                            <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                                No expenses yet
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Start by adding your first expense
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link
                                    href="/expenses/new"
                                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors"
                                >
                                    Add Expense
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
