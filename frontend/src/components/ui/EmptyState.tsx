'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    Receipt,
    Users,
    MessageSquare,
    PlusCircle,
    Sparkles
} from 'lucide-react';

interface EmptyStateProps {
    type?: 'expenses' | 'groups' | 'messages' | 'generic';
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    actionHref?: string;
    className?: string;
}

const illustrations = {
    expenses: Receipt,
    groups: Users,
    messages: MessageSquare,
    generic: Sparkles
};

export default function EmptyState({
    type = 'generic',
    title,
    description,
    actionLabel,
    onAction,
    actionHref,
    className
}: EmptyStateProps) {
    const Icon = illustrations[type];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "flex flex-col items-center justify-center py-16 px-8 text-center",
                className
            )}
        >
            {/* Animated Icon Container */}
            <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="relative mb-6"
            >
                {/* Background glow */}
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl scale-150" />

                {/* Icon circle */}
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center border border-primary/20">
                    <Icon className="w-10 h-10 text-primary" />
                </div>

                {/* Decorative dots */}
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-accent/50"
                />
                <motion.div
                    animate={{ y: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut", delay: 0.5 }}
                    className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-primary/50"
                />
            </motion.div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-foreground mb-2 text-balance">
                {title}
            </h3>

            {/* Description */}
            <p className="text-muted-foreground max-w-sm mb-6 text-balance leading-relaxed">
                {description}
            </p>

            {/* Action Button */}
            {(actionLabel && (onAction || actionHref)) && (
                actionHref ? (
                    <a
                        href={actionHref}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                    >
                        <PlusCircle className="w-5 h-5" />
                        {actionLabel}
                    </a>
                ) : (
                    <button
                        onClick={onAction}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                    >
                        <PlusCircle className="w-5 h-5" />
                        {actionLabel}
                    </button>
                )
            )}

            {/* Helper text */}
            <p className="text-xs text-muted-foreground mt-4">
                💡 Tip: You can also use the chat to {type === 'expenses' ? 'add expenses' : type === 'groups' ? 'create groups' : 'get started'}
            </p>
        </motion.div>
    );
}
