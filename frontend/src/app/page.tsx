'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInput from '@/components/chat/ChatInput';
import WelcomeCards from '@/components/chat/WelcomeCards';
import { Message } from '@/lib/mock-data';
import api from '@/lib/api';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CHAT_STORAGE_KEY = 'splitai_chat_history';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const restored = parsed.map((m: Message) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(restored);
      } catch {
        setMessages([]);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (isInitialized && messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isInitialized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([]);
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
      const response = await api.sendMessage(text);

      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);

        const aiMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: response.response,
          timestamp: new Date(),
          actions: ['Undo', 'Explain'],
        };

        return [...filtered, aiMessage];
      });
    } catch (error: any) {
      console.error('Error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => !m.isThinking);

        let errorMessageContent = "Sorry, I couldn't process that. Please try again.";
        let actions: string[] | undefined = undefined;

        if (error.message === 'Session expired. Please log in again.' || error.message.includes('401')) {
          errorMessageContent = "Your session has expired. Please log in again to continue.";
          actions = ['Log In'];
        }

        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'ai',
          content: errorMessageContent,
          timestamp: new Date(),
          actions: actions,
          onActionClick: (action) => {
            if (action === 'Log In') {
              window.location.href = '/login';
            }
          }
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

  const hasConversation = messages.length > 0;

  return (
    <div className="flex flex-col h-screen md:pl-72 pt-16 md:pt-0">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 h-14 bg-background/95 backdrop-blur-xl border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">💬 Chat</h1>
        {hasConversation && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearHistory}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-xl hover:bg-destructive/10"
            title="Clear chat history"
          >
            <Trash2 className="w-5 h-5" />
          </motion.button>
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 bg-background">
        <AnimatePresence mode="wait">
          {!hasConversation && isInitialized ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <WelcomeCards onCommandClick={handleSend} />
            </motion.div>
          ) : (
            <motion.div
              key="messages"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-3xl mx-auto space-y-4"
            >
              {/* Date separator */}
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
                  Today
                </span>
              </div>

              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MessageBubble
                    message={message}
                    onAction={handleAction}
                    onQuickReply={handleQuickReply}
                  />
                </motion.div>
              ))}

              <div ref={messagesEndRef} />
            </motion.div>
          )}
        </AnimatePresence>
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
