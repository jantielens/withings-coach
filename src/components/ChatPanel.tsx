'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github.css';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';

const SUGGESTED_PROMPTS = [
  'How was last week?',
  'Summarize my blood pressure',
  'Any trends I should worry about?',
  'What time of day are my readings best?',
];

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export function ChatPanel() {
  const { messages, setMessages, sendMessage, stop, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      body: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    }),
  });
  const [input, setInput] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [debugPrompt, setDebugPrompt] = useState<string | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugExpanded, setDebugExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  // Fetch the system prompt for the latest user message when debug mode is on
  const fetchDebugPrompt = useCallback(async (query: string) => {
    if (!debugMode) return;
    setDebugLoading(true);
    try {
      const res = await fetch(`/api/chat/prompt?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setDebugPrompt(data.prompt);
      }
    } catch {
      // Silently fail — debug is optional
    } finally {
      setDebugLoading(false);
    }
  }, [debugMode]);

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessage({ text: trimmed });
    fetchDebugPrompt(trimmed);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h2 className="text-sm font-semibold text-gray-900 flex-1">Coach Chat</h2>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setDebugPrompt(null); }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded p-1 transition-colors"
            aria-label="New chat"
            title="New chat"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
        )}
        <button
          onClick={() => { setDebugMode((v) => !v); if (debugMode) setDebugPrompt(null); }}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            debugMode
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          }`}
          title="Toggle debug mode — shows the system prompt sent to the LLM"
        >
          🔍 Debug
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {/* Debug prompt display */}
        {debugMode && debugPrompt && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50">
            <button
              onClick={() => setDebugExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-left"
            >
              <span className="text-xs font-medium text-amber-700">🔍 System Prompt</span>
              <svg
                className={`h-3 w-3 text-amber-500 transition-transform ${debugExpanded ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {debugExpanded && (
              <pre className="px-3 pb-3 text-[11px] leading-relaxed font-mono text-amber-900/80 whitespace-pre-wrap max-h-64 overflow-y-auto">
                {debugPrompt}
              </pre>
            )}
          </div>
        )}
        {debugMode && debugLoading && (
          <div className="text-xs text-amber-600 px-3 py-2">Loading system prompt…</div>
        )}
        {messages.length === 0 && !isLoading ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Ask your Coach</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-[260px]">
              I can help you understand your health data. Try asking:
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSubmit(prompt)}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{getMessageText(message)}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-h1:text-lg prose-h1:font-bold prose-h2:text-base prose-h2:font-semibold prose-h3:text-sm prose-h3:font-semibold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-table:my-2 prose-table:border prose-td:border prose-th:border prose-td:px-2 prose-th:px-2 prose-pre:my-2 prose-pre:bg-gray-200 prose-pre:rounded-lg prose-blockquote:my-2 prose-blockquote:border-gray-300 prose-blockquote:bg-gray-50 prose-blockquote:rounded-r-lg prose-hr:my-3 prose-code:text-gray-800 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-td:py-1 prose-th:py-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, rehypeRaw]}>
                        {getMessageText(message)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming indicator */}
            {status === 'submitted' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2">
          <span className="text-xs text-red-700 flex-1">Something went wrong. Please try again.</span>
          <button
            onClick={clearError}
            className="text-xs font-medium text-red-700 hover:text-red-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-100 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your health data…"
            disabled={isLoading}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 disabled:opacity-50 transition-colors"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              className="flex-shrink-0 rounded-xl bg-gray-200 p-2.5 text-gray-600 hover:bg-gray-300 transition-colors"
              aria-label="Stop generating"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex-shrink-0 rounded-xl bg-gray-900 p-2.5 text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
