'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FunnelIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import { mockExpenses, Expense } from '@/lib/mock-data';

// Group expenses by date
function groupExpensesByDate(expenses: Expense[]) {
    const groups: { [key: string]: Expense[] } = {};
    expenses.forEach(expense => {
        const date = expense.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(expense);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

function formatDate(dateStr: string) {
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
    const groupedExpenses = groupExpensesByDate(mockExpenses);

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

            {/* Expense List */}
            <div className="px-4 py-4 space-y-6">
                {groupedExpenses.map(([date, expenses]) => (
                    <section key={date}>
                        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-1">
                            {formatDate(date)}
                        </h2>
                        <div className="space-y-2">
                            {expenses.map((expense) => (
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
                                            {expense.payer.name === 'You' ? 'You paid' : `${expense.payer.name} paid`}
                                            {expense.group && ` • ${expense.group.name}`}
                                        </p>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        <p className="font-bold text-slate-800 dark:text-white">
                                            ₹{expense.amount.toLocaleString()}
                                        </p>
                                        {expense.payer.name === 'You' && (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                                you lent ₹{(expense.amount - expense.splits[0].amount).toLocaleString()}
                                            </p>
                                        )}
                                        {expense.payer.name !== 'You' && (
                                            <p className="text-xs text-red-600 dark:text-red-400">
                                                you owe ₹{expense.splits.find(s => s.user.name === 'You')?.amount.toLocaleString() || 0}
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
                        <Link
                            href="/"
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-full hover:bg-indigo-700 transition-colors"
                        >
                            Add via Chat
                        </Link>
                    </div>
                )}
            </div>

            <FloatingAIButton />
        </div>
    );
}
