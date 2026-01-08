'use client';

import { Message } from '@/lib/mock-data';

interface MessageBubbleProps {
    message: Message;
    onAction?: (action: string) => void;
    onQuickReply?: (reply: string) => void;
}

export default function MessageBubble({ message, onAction, onQuickReply }: MessageBubbleProps) {
    const isUser = message.type === 'user';
    const isThinking = message.isThinking;

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${isUser
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
                    }`}
            >
                {/* Thinking indicator */}
                {isThinking ? (
                    <div className="flex items-center gap-1 py-1">
                        <span className="text-sm text-slate-500">AI is thinking</span>
                        <span className="thinking-dots">
                            <span className="text-slate-500">.</span>
                            <span className="text-slate-500">.</span>
                            <span className="text-slate-500">.</span>
                        </span>
                    </div>
                ) : (
                    <>
                        {/* Message content */}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                        </div>

                        {/* Expense card embedded in message */}
                        {message.expense && (
                            <div className="mt-3 p-3 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-slate-900 dark:text-white">
                                        {message.expense.description}
                                    </span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        ₹{message.expense.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Paid by {message.expense.payer.name} • Split equally
                                </div>
                            </div>
                        )}

                        {/* Settlement card */}
                        {message.settlement && (
                            <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200 dark:border-emerald-700">
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                                    <span>✓</span>
                                    <span className="font-medium">
                                        {message.settlement.from.name} → {message.settlement.to.name}: ₹{message.settlement.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action chips */}
                        {message.actions && message.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {message.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onAction?.(action)}
                                        className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick replies */}
                        {message.quickReplies && message.quickReplies.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {message.quickReplies.map((reply, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onQuickReply?.(reply)}
                                        className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
