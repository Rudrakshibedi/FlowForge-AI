import React, { useEffect, useRef, useState } from "react";
import StatCard from "../components/StatCard.jsx";
import StatusPill from "../components/StatusPill.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useAgentExecution } from "../hooks/useAgentExecution.js";
import { useTheme } from "../hooks/useTheme.js";

function formatAgentName(name) {
  if (!name) return "—";
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatProvider(name) {
  if (!name) return "—";
  const known = { gemini: "Gemini", groq: "Groq" };
  return known[name] || formatAgentName(name);
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-accent text-white rounded-br-sm"
            : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 rounded-bl-sm"
        }`}
      >
        {message.content}
        {!isUser && message.meta?.failedSteps?.length > 0 && (
          <div className="mt-2 pt-2 border-t border-danger/20 text-xs text-danger">
            {message.meta.failedSteps.map((f, i) => (
              <p key={i}>
                {formatAgentName(f.agent)} failed: {f.error}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const {
    messages,
    isExecuting,
    error,
    executionStatus,
    activeAgent,
    provider,
    tokenUsage,
    cacheHits,
    pipelineExecuted,
    backendStatus,
    execute,
    clearChat,
  } = useAgentExecution();

  const [input, setInput] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isExecuting]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isExecuting) return;
    execute(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0b0d13] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold truncate">AI Agent Platform</h1>
          <p className="text-xs text-slate-500 truncate">
            Multi-agent SDLC orchestration dashboard
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <StatusPill status={backendStatus} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {backendStatus === "offline" && (
        <div className="shrink-0 bg-danger/10 border-b border-danger/20 text-danger text-xs sm:text-sm px-4 sm:px-6 py-2">
          Can't reach the backend API. Confirm the FastAPI server is running and
          <code className="mx-1 px-1 py-0.5 rounded bg-danger/10">VITE_API_BASE_URL</code>
          points at it, then refresh.
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Chat panel */}
        <div className="lg:col-span-2 flex flex-col min-h-0 bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5">
          <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Chat</h2>
            <button
              type="button"
              onClick={clearChat}
              disabled={isExecuting || messages.length === 0}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear chat
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.length === 0 && (
              <p className="text-slate-500 text-sm">
                Ask something simple ("what is 12 * 4?") or complex ("build a
                production-ready booking system") and hit Execute to see the
                router pick an agent pipeline.
              </p>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isExecuting && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-white/5 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" />
                  </span>
                  {formatAgentName(activeAgent)} working…
                </div>
              </div>
            )}
            {error && (
              <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-4 py-2.5">
                {error}
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="shrink-0 p-3 border-t border-slate-200 dark:border-white/5 flex gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a request… (Enter to send, Shift+Enter for a new line)"
              rows={1}
              disabled={backendStatus === "offline"}
              className="flex-1 resize-none bg-slate-50 dark:bg-panel rounded-lg px-3 py-2 text-sm outline-none border border-slate-300 dark:border-white/10 focus:border-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isExecuting || !input.trim() || backendStatus === "offline"}
              className="bg-accent hover:bg-accentSoft transition-colors rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isExecuting ? "Executing…" : "Execute"}
            </button>
          </form>
        </div>

        {/* Stats / status column */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
            <h2 className="text-sm font-semibold mb-3">Execution</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Status</span>
                <StatusPill status={executionStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Active agent</span>
                <span
                  className={`text-sm font-medium ${
                    isExecuting ? "text-warning" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {formatAgentName(activeAgent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">AI provider</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatProvider(provider)}
                </span>
              </div>
              {pipelineExecuted.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 block mb-1.5">Last pipeline</span>
                  <div className="flex flex-wrap gap-1.5">
                    {pipelineExecuted.map((step, i) => (
                      <span
                        key={`${step}-${i}`}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent dark:text-accentSoft border border-accent/20"
                      >
                        {formatAgentName(step)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="LLM Calls" value={tokenUsage.llm_calls} pulse={isExecuting} />
            <StatCard label="Cache Hits" value={cacheHits} hint="server log total" />
            <StatCard
              label="Est. Tokens"
              value={tokenUsage.total_tokens.toLocaleString()}
              accent
              pulse={isExecuting}
            />
            <StatCard
              label="In / Out"
              value={`${tokenUsage.total_input_tokens}/${tokenUsage.total_output_tokens}`}
              hint="input/output tokens"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
