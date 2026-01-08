'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { mockExpenses } from '@/lib/mock-data';

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const expense = mockExpenses.find(e => e.id === parseInt(id));

    if (!expense) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">
                        Expense not found
                    </h2>
                    <Link href="/expenses" className="text-indigo-600 dark:text-indigo-400">
                        Back to expenses
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between px-4 h-14">
                    <Link href="/expenses" className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Expense Details</h1>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-500 hover:text-slate-700">
                            <PencilIcon className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-red-500 hover:text-red-700">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="px-4 py-6 space-y-6">
                {/* Main card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="text-center mb-6">
                        <div className="text-4xl mb-3">
                            {expense.description.toLowerCase().includes('dinner') ? '🍽️' :
                                expense.description.toLowerCase().includes('uber') ? '🚗' :
                                    expense.description.toLowerCase().includes('hotel') ? '🏨' :
                                        expense.description.toLowerCase().includes('groceries') ? '🛒' :
                                            expense.description.toLowerCase().includes('pizza') ? '🍕' : '💰'}
                        </div>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">
                            {expense.description}
                        </h2>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                            ₹{expense.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {new Date(expense.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>

                    {/* Paid by */}
                    <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-500 dark:text-slate-400">Paid by</span>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-600 dark:text-indigo-400">
                                {expense.payer.name.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {expense.payer.name}
                            </span>
                        </div>
                    </div>

                    {/* Group */}
                    {expense.group && (
                        <div className="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 dark:text-slate-400">Group</span>
                            <span className="font-medium text-slate-800 dark:text-white">
                                {expense.group.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Split breakdown */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
                        Split Breakdown
                    </h3>
                    <div className="space-y-3">
                        {expense.splits.map((split, idx) => {
                            const isPayer = split.user.name === expense.payer.name;
                            return (
                                <div key={idx} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                                            {split.user.name.charAt(0)}
                                        </div>
                                        <span className="text-slate-800 dark:text-white">{split.user.name}</span>
                                        {isPayer && (
                                            <span className="px-2 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full">
                                                paid
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-medium text-slate-800 dark:text-white">
                                        ₹{split.amount.toLocaleString()}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Explanation */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">
                        💡 How this was calculated
                    </h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">
                        The total amount of ₹{expense.amount.toLocaleString()} was split equally among {expense.participants.length} participants,
                        resulting in ₹{(expense.amount / expense.participants.length).toLocaleString()} per person.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Link
                        href={`/?message=Undo expense ${expense.description}`}
                        className="flex-1 py-3 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Undo
                    </Link>
                    <Link
                        href={`/?message=Explain the ${expense.description} expense`}
                        className="flex-1 py-3 text-center text-white bg-indigo-600 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Ask AI to Explain
                    </Link>
                </div>
            </div>
        </div>
    );
}
