import React, { useState } from "react";
import ErrorsPanel from "../components/ErrorsPanel.jsx";
import ExecutionTimelineList from "../components/ExecutionTimelineList.jsx";
import LogsTable from "../components/LogsTable.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusPill from "../components/StatusPill.jsx";
import ToolUsagePanel from "../components/ToolUsagePanel.jsx";
import { FULL_FLOW, agentLabel } from "../constants/pipeline.js";
import { useLogs } from "../hooks/useLogs.js";
import { shortId } from "../utils/format.js";

const LEVELS = ["INFO", "WARNING", "ERROR", "DEBUG"];
const AGENT_OPTIONS = FULL_FLOW.filter((a) => a !== "user");
const TABS = [
  { id: "logs", label: "Logs" },
  { id: "timeline", label: "Execution Timeline" },
  { id: "tools", label: "MCP Tool Usage" },
  { id: "errors", label: "Errors" },
];

function formatDuration(ms) {
  if (!ms) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function Logs() {
  const {
    tasks,
    logs,
    totalCount,
    errorLogs,
    errorLogCount,
    isLoading,
    error,
    taskId,
    selectTask,
    agent,
    setAgent,
    level,
    setLevel,
    search,
    setSearch,
    autoRefresh,
    setAutoRefresh,
    resetFilters,
    observability,
    isTaskRunning,
    refresh,
  } = useLogs();

  const [activeTab, setActiveTab] = useState("logs");

  const hasFilters = Boolean(taskId || agent || level || search);

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0b0d13] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold">Logs</h1>
            <p className="text-xs text-slate-500">
              Structured agent logs, execution timeline, MCP tool usage, and errors — filterable
              by agent, level, and request.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-current"
              />
              Auto-refresh
            </label>
            <button
              type="button"
              onClick={refresh}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Log Entries" value={totalCount} />
          <StatCard label="Errors" value={errorLogCount} accent={errorLogCount > 0} />
          <StatCard label="Tool Calls" value={observability.tool_call_count} hint={taskId ? "selected request" : "select a request"} />
          <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 truncate">Active Agent</p>
            <div className="mt-1.5 flex items-center gap-2">
              {taskId ? (
                <>
                  <span className={`text-sm font-medium truncate ${isTaskRunning ? "text-warning" : ""}`}>
                    {observability.active_agent ? agentLabel(observability.active_agent) : "—"}
                  </span>
                  {isTaskRunning && <StatusPill status="running" />}
                </>
              ) : (
                <span className="text-sm text-slate-400">Select a request</span>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search log messages, tools, or request ids…"
              className="flex-1 bg-slate-50 dark:bg-panel rounded-lg px-3 py-2 text-sm outline-none border border-slate-300 dark:border-white/10 focus:border-accent"
            />
            <select
              value={taskId}
              onChange={(e) => selectTask(e.target.value)}
              className="sm:w-64 bg-slate-50 dark:bg-panel border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="">All requests</option>
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>
                  [{t.status}] {(t.request || "").slice(0, 48)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Agent:</span>
            <button
              type="button"
              onClick={() => setAgent("")}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                agent === ""
                  ? "bg-accent text-white border-accent"
                  : "border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              All
            </button>
            {AGENT_OPTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAgent(a)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                  agent === a
                    ? "bg-accent text-white border-accent"
                    : "border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {agentLabel(a)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 shrink-0">Level:</span>
            <button
              type="button"
              onClick={() => setLevel("")}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                level === ""
                  ? "bg-accent text-white border-accent"
                  : "border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              All
            </button>
            {LEVELS.map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                  level === lvl
                    ? "bg-accent text-white border-accent"
                    : "border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                {lvl}
              </button>
            ))}

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-accent hover:underline ml-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {taskId && (
            <p className="text-xs text-slate-500">
              Request <span className="font-mono">#{shortId(taskId, 12)}</span>
              {observability.total_duration_ms > 0 && (
                <> · total execution time {formatDuration(observability.total_duration_ms)}</>
              )}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-panel rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                activeTab === t.id
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.label}
              {t.id === "errors" && errorLogCount > 0 && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-danger/15 text-danger">
                  {errorLogCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-10">Loading logs…</p>
        ) : (
          <>
            {activeTab === "logs" && <LogsTable logs={logs} onSelectTask={selectTask} />}

            {activeTab === "timeline" && (
              <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
                {!taskId ? (
                  <p className="text-sm text-slate-500 text-center py-6">
                    Select a request above to see its agent-by-agent execution timeline.
                  </p>
                ) : (
                  <ExecutionTimelineList
                    timeline={observability.timeline}
                    activeAgent={isTaskRunning ? observability.active_agent : null}
                  />
                )}
              </div>
            )}

            {activeTab === "tools" &&
              (!taskId ? (
                <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-10 text-center">
                  <p className="text-sm text-slate-500">
                    Select a request above to see its MCP tool call history.
                  </p>
                </div>
              ) : (
                <ToolUsagePanel toolUsage={observability.tool_usage} />
              ))}

            {activeTab === "errors" && (
              <ErrorsPanel
                executionErrors={taskId ? observability.errors : []}
                errorLogs={errorLogs}
                onSelectTask={selectTask}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
