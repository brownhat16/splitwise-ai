'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function ChatInput({
    onSend,
    disabled = false,
    placeholder = "Ask SplitAI..."
}: ChatInputProps) {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = () => {
        const trimmed = input.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    };

    return (
        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50 sticky bottom-0 z-40">
            <div className="max-w-4xl mx-auto relative flex items-end gap-2 p-2 bg-muted/40 border border-input focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 rounded-3xl transition-all duration-200">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="flex-1 max-h-[120px] py-3 pl-4 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/70 disabled:opacity-50 min-h-[44px]"
                />

                <div className="flex items-center gap-2 pr-2 pb-1.5">
                    <button
                        type="button"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-full transition-colors"
                        aria-label="Voice input"
                    >
                        <Mic className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={disabled || !input.trim()}
                        className={cn(
                            "p-2 rounded-full transition-all duration-200 shadow-sm",
                            input.trim()
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                        aria-label="Send message"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="text-center mt-2">
                <p className="text-[10px] text-muted-foreground">AI can make mistakes. Verify financial details.</p>
            </div>
        </div>
    );
}
