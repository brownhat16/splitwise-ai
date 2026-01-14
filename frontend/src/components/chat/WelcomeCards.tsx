'use client';

import { motion } from 'framer-motion';
import {
    Receipt,
    Users,
    Scale,
    HelpCircle,
    PlusCircle,
    ArrowRightLeft,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommandCard {
    category: string;
    icon: React.ElementType;
    color: string;
    commands: {
        text: string;
        example: string;
    }[];
}

const commandCategories: CommandCard[] = [
    {
        category: 'Add Expenses',
        icon: Receipt,
        color: 'from-indigo-500 to-purple-500',
        commands: [
            { text: 'Split with friends', example: 'Split ₹500 dinner with Amit' },
            { text: 'Record payment', example: 'I paid ₹1000 for groceries' },
            { text: 'Group expense', example: 'Split hotel ₹3000 in Goa Trip' },
        ]
    },
    {
        category: 'Check Balances',
        icon: Scale,
        color: 'from-emerald-500 to-teal-500',
        commands: [
            { text: 'Who owes you', example: 'Who owes me money?' },
            { text: 'What you owe', example: 'What do I owe?' },
            { text: 'With a friend', example: "What's my balance with Sarah?" },
        ]
    },
    {
        category: 'Settle & Groups',
        icon: Users,
        color: 'from-orange-500 to-rose-500',
        commands: [
            { text: 'Settle up', example: 'Settle with Rahul' },
            { text: 'Create group', example: 'Create group Roommates' },
            { text: 'Group balance', example: 'Show Roommates balance' },
        ]
    },
];

interface WelcomeCardsProps {
    onCommandClick: (command: string) => void;
}

export default function WelcomeCards({ onCommandClick }: WelcomeCardsProps) {
    return (
        <div className="py-4 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">AI-Powered</span>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                    What can I help with?
                </h2>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Just type naturally or tap an example below to get started
                </p>
            </motion.div>

            {/* Command Categories */}
            <div className="grid gap-4 md:grid-cols-3">
                {commandCategories.map((category, categoryIndex) => {
                    const Icon = category.icon;
                    return (
                        <motion.div
                            key={category.category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: categoryIndex * 0.1 }}
                            className="bg-card rounded-2xl border border-border overflow-hidden"
                        >
                            {/* Category Header */}
                            <div className={cn(
                                "p-4 bg-gradient-to-r text-white",
                                category.color
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold">{category.category}</span>
                                </div>
                            </div>

                            {/* Commands List */}
                            <div className="p-2">
                                {category.commands.map((cmd, cmdIndex) => (
                                    <motion.button
                                        key={cmdIndex}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => onCommandClick(cmd.example)}
                                        className="w-full text-left p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                    >
                                        <p className="font-medium text-foreground text-sm mb-0.5 group-hover:text-primary transition-colors">
                                            {cmd.text}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            "{cmd.example}"
                                        </p>
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2"
            >
                <button
                    onClick={() => onCommandClick('Help')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
                >
                    <HelpCircle className="w-4 h-4" />
                    More commands
                </button>
            </motion.div>
        </div>
    );
}
