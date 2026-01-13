'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, Users, RefreshCw } from 'lucide-react';
import FloatingAIButton from '@/components/layout/FloatingAIButton';
import EmptyState from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import api, { GroupData } from '@/lib/api';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function getGroupEmoji(name: string) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('roommate') || nameLower.includes('home')) return '🏠';
    if (nameLower.includes('trip') || nameLower.includes('travel') || nameLower.includes('vacation')) return '🏖️';
    if (nameLower.includes('lunch') || nameLower.includes('office') || nameLower.includes('work')) return '🍱';
    if (nameLower.includes('family')) return '👨‍👩‍👧‍👦';
    if (nameLower.includes('friend')) return '🎉';
    if (nameLower.includes('dinner') || nameLower.includes('food')) return '🍽️';
    return '👥';
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<GroupData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        setLoading(true);
        const data = await api.getGroups();
        setGroups(data.groups);
        setLoading(false);
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    return (
        <div className="min-h-screen bg-background pb-20 md:pl-72 pt-16 md:pt-0">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Groups</h1>
                            <p className="text-sm text-muted-foreground">
                                {groups.length} {groups.length === 1 ? 'group' : 'groups'} created
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchGroups}
                                disabled={loading}
                                className="p-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                                aria-label="Refresh"
                            >
                                <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                            </button>
                            <Link
                                href="/?message=Create a new group"
                                className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                aria-label="Create group"
                            >
                                <Plus className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Loading state */}
                {loading && <SkeletonList count={4} />}

                {/* Group List */}
                {!loading && groups.length > 0 && (
                    <div className="space-y-4">
                        {groups.map((group, index) => (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={`/groups/${group.id}`}
                                    className="group block p-5 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Group Icon */}
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                                            {getGroupEmoji(group.name)}
                                        </div>

                                        {/* Group Details */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                                                {group.name}
                                            </p>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Users className="w-4 h-4" />
                                                <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>

                                    {/* Member avatars */}
                                    <div className="flex mt-4 -space-x-2">
                                        {group.members.slice(0, 5).map((member, idx) => (
                                            <div
                                                key={idx}
                                                className="w-9 h-9 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-sm font-semibold text-secondary-foreground"
                                                title={member.name}
                                            >
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                        {group.members.length > 5 && (
                                            <div className="w-9 h-9 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground">
                                                +{group.members.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!loading && groups.length === 0 && (
                    <EmptyState
                        type="groups"
                        title="No groups yet"
                        description="Create a group to track shared expenses with friends, roommates, or travel buddies. Groups make splitting costs easy!"
                        actionLabel="Create Group"
                        actionHref="/?message=Create a new group"
                    />
                )}
            </main>

            <FloatingAIButton />
        </div>
    );
}
