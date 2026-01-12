'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import api from '@/lib/api';

export default function NewExpensePage() {
    const router = useRouter();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [participants, setParticipants] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const participantNames = participants
                .split(',')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://splitwise-ai-77y1.onrender.com'}/expenses/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    description,
                    amount: parseFloat(amount),
                    participant_names: participantNames,
                    split_type: 'equal'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create expense');
            }

            router.push('/expenses');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4 px-4 h-14">
                    <Link href="/expenses" className="p-2 -ml-2 text-slate-500 hover:text-slate-700">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Link>
                    <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Add Expense</h1>
                </div>
            </header>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-6">
                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Description *
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Dinner at restaurant"
                        required
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Amount (₹) *
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="500"
                        min="1"
                        max="100000000"
                        required
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Split with (comma-separated names)
                    </label>
                    <input
                        type="text"
                        value={participants}
                        onChange={(e) => setParticipants(e.target.value)}
                        placeholder="e.g., Amit, Sarah, Rahul"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">Leave empty to add just for yourself</p>
                </div>

                <button
                    type="submit"
                    disabled={loading || !description || !amount}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating...' : 'Add Expense'}
                </button>

                <div className="text-center">
                    <Link href="/" className="text-sm text-indigo-600 hover:underline">
                        Or use AI assistant instead →
                    </Link>
                </div>
            </form>
        </div>
    );
}
