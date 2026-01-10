'use client';

import { Message } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
    message: Message;
    onAction?: (action: string) => void;
    onQuickReply?: (reply: string) => void;
}

export default function MessageBubble({ message, onAction, onQuickReply }: MessageBubbleProps) {
    const isUser = message.type === 'user';
    const isThinking = message.isThinking;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "flex w-full gap-3 md:gap-4 mb-6",
                isUser ? "justify-end" : "justify-start"
            )}
        >
            {/* Avatar - AI only */}
            {!isUser && (
                <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-muted-foreground" />
                </div>
            )}

            <div className={cn(
                "relative max-w-[85%] md:max-w-[75%] px-5 py-3.5 shadow-sm",
                isUser
                    ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                    : "bg-card border border-border/50 text-card-foreground rounded-2xl rounded-tl-sm backdrop-blur-sm"
            )}>
                {/* Thinking indicator */}
                {isThinking ? (
                    <div className="flex items-center gap-2 py-1">
                        <span className="text-sm text-muted-foreground font-medium">Thinking</span>
                        <div className="flex gap-1">
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                                className="w-1 h-1 rounded-full bg-muted-foreground"
                            />
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                                className="w-1 h-1 rounded-full bg-muted-foreground"
                            />
                            <motion.span
                                animate={{ opacity: [0, 1, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                                className="w-1 h-1 rounded-full bg-muted-foreground"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Message content */}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed tracking-wide">
                            {message.content}
                        </div>

                        {/* Expense card embedded in message */}
                        {message.expense && (
                            <div className="mt-3 p-4 bg-muted/30 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-foreground">
                                        {message.expense.description}
                                    </span>
                                    <span className="font-bold text-primary">
                                        ₹{message.expense.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Paid by {message.expense.payer.name} • Split equally
                                </div>
                            </div>
                        )}

                        {/* Settlement card */}
                        {message.settlement && (
                            <div className="mt-3 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <span>✓</span>
                                    <span className="font-medium text-sm">
                                        {message.settlement.from.name} → {message.settlement.to.name}: ₹{message.settlement.amount.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action chips */}
                        {message.actions && message.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {message.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onAction?.(action)}
                                        className="px-3 py-1.5 text-xs font-medium bg-background text-muted-foreground rounded-full border border-border hover:bg-muted hover:text-foreground transition-colors"
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Quick replies */}
                        {message.quickReplies && message.quickReplies.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {message.quickReplies.map((reply, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onQuickReply?.(reply)}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Avatar - User only (optional, for symmetry) */}
            {isUser && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                </div>
            )}
        </motion.div>
    );
}
