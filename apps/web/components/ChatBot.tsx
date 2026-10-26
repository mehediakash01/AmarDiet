'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNutritionStore } from '@/lib/store/useNutritionStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
}

const SUGGESTIONS = [
  'How many calories have I had today?',
  'Am I hitting my protein goal?',
  'What should I eat for dinner?',
  'Is my diet on track for my goal?',
];

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const subscriberId = useNutritionStore((s) => s.subscriberId);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "Hi! I'm your nutrition assistant. I know your current diet plan and today's food log. Ask me anything about your nutrition, meal ideas, or how you're tracking toward your goal!",
        },
      ]);
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages.length]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading || !subscriberId) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
      };

      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
      setInput('');
      setLoading(true);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriberId,
            messages: updatedMessages
              .filter((m) => !m.error)
              .slice(-20) // cap history sent to API
              .map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        const data = (await res.json()) as { reply: string };
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            content: data.reply,
          },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
            error: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, subscriberId, messages],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        id="chatbot-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close nutrition assistant' : 'Open nutrition assistant'}
        style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1.25rem',
          zIndex: 50,
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(16,185,129,0.45)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(16,185,129,0.6)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(16,185,129,0.45)';
        }}
      >
        {open ? '✕' : '🥗'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="chatbot-panel"
          style={{
            position: 'fixed',
            bottom: '10rem',
            right: '1.25rem',
            zIndex: 50,
            width: 'min(380px, calc(100vw - 2rem))',
            height: 'min(520px, calc(100vh - 12rem))',
            borderRadius: '1rem',
            background: 'var(--color-surface, #1e1e2e)',
            border: '1px solid var(--color-border, #2d2d44)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'chatSlideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.875rem 1rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>🥗</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>
                Nutrition Assistant
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem' }}>
                Powered by your real diet data
              </p>
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    padding: '0.5rem 0.75rem',
                    borderRadius:
                      msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                    background: msg.error
                      ? 'rgba(239,68,68,0.15)'
                      : msg.role === 'user'
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : 'var(--color-surface-raised, #2a2a3e)',
                    color: msg.role === 'user' ? '#fff' : 'var(--color-text, #e2e8f0)',
                    fontSize: '0.82rem',
                    lineHeight: '1.5',
                    border: msg.error ? '1px solid rgba(239,68,68,0.3)' : 'none',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '0.5rem 0.875rem',
                    borderRadius: '1rem 1rem 1rem 0.25rem',
                    background: 'var(--color-surface-raised, #2a2a3e)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'inline-block',
                        animation: `chatDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestion chips — only before first user message */}
            {messages.length === 1 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.375rem',
                  marginTop: '0.25rem',
                }}
              >
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => void sendMessage(s)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      borderRadius: '1rem',
                      border: '1px solid rgba(16,185,129,0.4)',
                      background: 'rgba(16,185,129,0.08)',
                      color: '#10b981',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: '1.3',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '0.625rem',
              borderTop: '1px solid var(--color-border, #2d2d44)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              id="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your nutrition…"
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                resize: 'none',
                background: 'var(--color-surface-raised, #2a2a3e)',
                border: '1px solid var(--color-border, #2d2d44)',
                borderRadius: '0.625rem',
                padding: '0.5rem 0.75rem',
                color: 'var(--color-text, #e2e8f0)',
                fontSize: '0.82rem',
                outline: 'none',
                lineHeight: '1.5',
                maxHeight: '5rem',
                overflowY: 'auto',
              }}
            />
            <button
              id="chatbot-send"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              style={{
                flexShrink: 0,
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.625rem',
                border: 'none',
                background:
                  !input.trim() || loading
                    ? 'rgba(16,185,129,0.25)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                transition: 'background 0.15s',
              }}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </>
  );
}
