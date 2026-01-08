'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { Message, initialMessages } from '@/lib/mock-data';
import api from '@/lib/api';
import { TrashIcon } from '@heroicons/react/24/outline';

const CHAT_STORAGE_KEY = 'splitai_chat_history';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        const restored = parsed.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(restored);
      } catch {
        setMessages(initialMessages);
      }
    } else {
      setMessages(initialMessages);
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages(initialMessages);
  };

  const handleSend = async (text: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Add thinking indicator
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isThinking: true,
    };
    setMessages(prev => [...prev, thinkingMessage]);
    setIsLoading(true);

    try {
      // Call the actual API
      const response = await api.sendMessage(text);

      // Remove thinking indicator and add response
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);

        // The AI response text already contains all expense details,
        // so we don't need to show a separate expense card
        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.response,
          timestamp: new Date(),
          // Only show action buttons if it's a successful action (not a clarification)
          actions: response.needs_clarification ? undefined : ['Undo', 'Explain'],
          quickReplies: response.needs_clarification ? ['Yes', 'No'] : undefined,
        };

        return [...filtered, aiMessage];
      });
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: "Sorry, I couldn't process that. Please try again.",
          timestamp: new Date(),
        };
        return [...filtered, errorMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: string) => {
    handleSend(action);
  };

  const handleQuickReply = (reply: string) => {
    handleSend(reply);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">💬 Chat</h1>
        <button
          onClick={clearHistory}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          title="Clear chat history"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50 dark:bg-slate-950">
        {/* Date separator */}
        <div className="flex items-center justify-center">
          <span className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-full shadow-sm">
            Today
          </span>
        </div>

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAction={handleAction}
            onQuickReply={handleQuickReply}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder="Split ₹500 with Amit..."
      />
    </div>
  );
}
