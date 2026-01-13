'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'elevated' | 'outlined' | 'glass';
    hover?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    onClick?: () => void;
}

export default function Card({
    children,
    className,
    variant = 'default',
    hover = false,
    padding = 'md',
    onClick
}: CardProps) {
    const baseStyles = "rounded-2xl transition-all duration-200";

    const variants = {
        default: "bg-card border border-border",
        elevated: "bg-card shadow-lg shadow-black/5 dark:shadow-black/20",
        outlined: "bg-transparent border-2 border-border",
        glass: "bg-card/80 backdrop-blur-xl border border-border/50"
    };

    const paddings = {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8"
    };

    const hoverStyles = hover
        ? "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 hover:border-primary/20 cursor-pointer active:scale-[0.99]"
        : "";

    return (
        <div
            className={cn(
                baseStyles,
                variants[variant],
                paddings[padding],
                hoverStyles,
                className
            )}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {children}
        </div>
    );
}

// Card Header subcomponent
interface CardHeaderProps {
    children: ReactNode;
    className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn("flex items-center justify-between mb-4", className)}>
            {children}
        </div>
    );
}

// Card Title subcomponent
interface CardTitleProps {
    children: ReactNode;
    className?: string;
    as?: 'h2' | 'h3' | 'h4';
}

export function CardTitle({ children, className, as: Tag = 'h3' }: CardTitleProps) {
    return (
        <Tag className={cn(
            "font-semibold text-foreground",
            Tag === 'h2' && "text-xl",
            Tag === 'h3' && "text-lg",
            Tag === 'h4' && "text-base",
            className
        )}>
            {children}
        </Tag>
    );
}

// Card Description subcomponent
interface CardDescriptionProps {
    children: ReactNode;
    className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={cn("text-sm text-muted-foreground mt-1", className)}>
            {children}
        </p>
    );
}

// Card Content subcomponent
interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn("", className)}>
            {children}
        </div>
    );
}

// Card Footer subcomponent
interface CardFooterProps {
    children: ReactNode;
    className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={cn("flex items-center gap-3 mt-4 pt-4 border-t border-border/50", className)}>
            {children}
        </div>
    );
}
