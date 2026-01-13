'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular' | 'card';
    width?: string | number;
    height?: string | number;
    animation?: 'pulse' | 'shimmer' | 'none';
}

export default function Skeleton({
    className,
    variant = 'rectangular',
    width,
    height,
    animation = 'shimmer'
}: SkeletonProps) {
    const baseStyles = "bg-muted relative overflow-hidden";

    const variants = {
        text: "h-4 rounded-md",
        circular: "rounded-full",
        rectangular: "rounded-xl",
        card: "rounded-2xl"
    };

    const animations = {
        pulse: "animate-pulse",
        shimmer: "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        none: ""
    };

    const style = {
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined
    };

    return (
        <div
            className={cn(
                baseStyles,
                variants[variant],
                animations[animation],
                className
            )}
            style={style}
            aria-hidden="true"
        />
    );
}

// Preset skeleton components for common patterns

export function SkeletonCard() {
    return (
        <div className="p-6 rounded-2xl bg-card border border-border">
            <div className="flex items-center gap-4 mb-4">
                <Skeleton variant="circular" width={48} height={48} />
                <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="w-3/4" />
                    <Skeleton variant="text" className="w-1/2" />
                </div>
            </div>
            <Skeleton variant="rectangular" height={80} className="mb-4" />
            <div className="flex gap-2">
                <Skeleton variant="rectangular" height={36} className="flex-1" />
                <Skeleton variant="rectangular" height={36} className="w-24" />
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" className="w-2/3" />
                        <Skeleton variant="text" className="w-1/3" />
                    </div>
                    <Skeleton variant="rectangular" width={80} height={24} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 rounded-2xl bg-card border border-border">
                    <Skeleton variant="text" className="w-1/2 mb-3" />
                    <Skeleton variant="text" height={32} className="w-3/4 mb-2" />
                    <Skeleton variant="text" className="w-1/3" />
                </div>
            ))}
        </div>
    );
}
