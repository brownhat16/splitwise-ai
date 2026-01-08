'use client';

import { useState, KeyboardEvent } from 'react';
import { PaperAirplaneIcon, MicrophoneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function ChatInput({ onSend, disabled = false, placeholder = "Type a message..." }: ChatInputProps) {
    const [input, setInput] = useState('');

    const handleSend = () => {
        const trimmed = input.trim();
        if (trimmed && !disabled) {
            onSend(trimmed);
            setInput('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex items-end gap-2 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <div className="flex-1 relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={1}
                    className="w-full px-4 py-3 pr-12 bg-slate-100 dark:bg-slate-800 rounded-2xl border-0 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 disabled:opacity-50"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <button
                    type="button"
                    className="absolute right-3 bottom-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Voice input"
                >
                    <MicrophoneIcon className="w-5 h-5" />
                </button>
            </div>
            <button
                onClick={handleSend}
                disabled={disabled || !input.trim()}
                className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
            >
                <PaperAirplaneIcon className="w-5 h-5" />
            </button>
        </div>
    );
}
