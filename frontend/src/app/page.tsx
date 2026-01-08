'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import { Message, initialMessages, mockUsers, mockExpenses } from '@/lib/mock-data';
import api from '@/lib/api';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

        // Check if response includes expense data
        let expense = undefined;
        if (response.data?.expense_id) {
          expense = mockExpenses.find(e => e.id === response.data?.expense_id) || {
            id: response.data.expense_id,
            description: 'Expense',
            amount: 500,
            currency: 'INR',
            payer: mockUsers[0],
            participants: [mockUsers[0], mockUsers[1]],
            splits: [],
            date: new Date().toISOString().split('T')[0],
            isSettled: false,
          };
        }

        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.response,
          timestamp: new Date(),
          expense,
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
      <header className="flex items-center justify-between px-4 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 md:hidden">
        <h1 className="text-lg font-semibold text-slate-800 dark:text-white">💬 Chat</h1>
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
