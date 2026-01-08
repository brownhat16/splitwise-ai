'use client';

import Link from 'next/link';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function FloatingAIButton() {
    return (
        <Link
            href="/"
            className="fixed bottom-24 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-40"
            aria-label="Ask AI"
        >
            <SparklesIcon className="w-6 h-6" />
        </Link>
    );
}
