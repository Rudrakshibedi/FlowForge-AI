import React, { useState } from "react";
import AgentDetailDrawer from "../components/AgentDetailDrawer.jsx";
import StatCard from "../components/StatCard.jsx";
import StatusPill from "../components/StatusPill.jsx";
import ToolUsagePanel from "../components/ToolUsagePanel.jsx";
import WorkflowFlowDiagram from "../components/WorkflowFlowDiagram.jsx";
import { AGENT_STEPS, agentLabel } from "../constants/pipeline.js";
import { useWorkflowInspector } from "../hooks/useWorkflowInspector.js";

function formatDuration(ms) {
  if (!ms) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function Workflow() {
  const {
    recentTasks,
    selectedTaskId,
    taskStatus,
    observability,
    tokenUsage,
    tokensByAgent,
    nodeStatuses,
    isRunning,
    error,
    requestText,
    setRequestText,
    manualPipeline,
    toggleManualAgent,
    resetManualPipeline,
    selectTask,
    runWorkflow,
  } = useWorkflowInspector();

  const [detailAgent, setDetailAgent] = useState(null);
  const [showOverride, setShowOverride] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    runWorkflow();
  };

  const selectedNode = detailAgent ? nodeStatuses.find((n) => n.agent === detailAgent) : null;
  const overallStatus = !selectedTaskId ? "idle" : taskStatus?.status || "running";
  const activeAgentLabel = observability.active_agent
    ? agentLabel(observability.active_agent)
    : isRunning
    ? "Router"
    : "—";

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-[#0b0d13] text-slate-900 dark:text-slate-100 transition-colors">
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Run / select controls */}
        <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder='Try "build a production-ready booking system" to trigger the full pipeline…'
              disabled={isRunning}
              className="flex-1 bg-slate-50 dark:bg-panel rounded-lg px-3 py-2 text-sm outline-none border border-slate-300 dark:border-white/10 focus:border-accent disabled:opacity-50"
            />
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowOverride((v) => !v)}
                className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                {manualPipeline.length ? `Manual (${manualPipeline.length})` : "Auto pipeline"}
              </button>
              <button
                type="submit"
                disabled={isRunning || !requestText.trim()}
                className="bg-accent hover:bg-accentSoft transition-colors rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? "Running…" : "Run workflow"}
              </button>
            </div>
          </form>

          {showOverride && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500">
                  Force specific agents (leave empty to let the Router decide)
                </p>
                {manualPipeline.length > 0 && (
                  <button
                    type="button"
                    onClick={resetManualPipeline}
                    className="text-xs text-accent hover:underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {AGENT_STEPS.map((step) => (
                  <label
                    key={step}
                    className={`text-xs px-2.5 py-1.5 rounded-full border cursor-pointer select-none transition-colors ${
                      manualPipeline.includes(step)
                        ? "bg-accent text-white border-accent"
                        : "border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={manualPipeline.includes(step)}
                      onChange={() => toggleManualAgent(step)}
                    />
                    {agentLabel(step)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-danger mt-2">{error}</p>}

          {recentTasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2">
              <label className="text-xs text-slate-500 shrink-0">Inspect a recent task:</label>
              <select
                value={selectedTaskId || ""}
                onChange={(e) => e.target.value && selectTask(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 dark:bg-panel border border-slate-300 dark:border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-accent"
              >
                <option value="" disabled>
                  Select a task…
                </option>
                {recentTasks.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    [{t.status}] {t.request.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-3 sm:p-4 flex flex-col justify-between min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 truncate">Status</p>
            <div className="mt-1.5">
              <StatusPill status={overallStatus} />
            </div>
          </div>
          <StatCard
            label="Active Agent"
            value={activeAgentLabel}
            pulse={isRunning}
            accent={isRunning}
          />
          <StatCard label="Execution Time" value={formatDuration(observability.total_duration_ms)} />
          <StatCard
            label="Est. Tokens"
            value={tokenUsage.total_tokens.toLocaleString()}
            hint={`${tokenUsage.llm_calls} LLM calls`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Flow diagram */}
          <div className="lg:col-span-2 bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4 sm:p-6">
            <h2 className="text-sm font-semibold mb-4">Execution Flow</h2>
            {!selectedTaskId ? (
              <p className="text-sm text-slate-500 text-center py-10">
                Run a workflow or select a recent task to see it visualized here.
              </p>
            ) : (
              <WorkflowFlowDiagram
                nodeStatuses={nodeStatuses}
                tokensByAgent={tokensByAgent}
                onSelectAgent={setDetailAgent}
              />
            )}
          </div>

          {/* Side panels */}
          <div className="flex flex-col gap-4">
            <ToolUsagePanel toolUsage={observability.tool_usage} />

            <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
              <h2 className="text-sm font-semibold mb-3">Token Usage by Agent</h2>
              {!tokenUsage.by_agent || tokenUsage.by_agent.length === 0 ? (
                <p className="text-sm text-slate-500">No LLM calls recorded for this task yet.</p>
              ) : (
                <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {tokenUsage.by_agent.map((entry, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm border-b border-slate-100 dark:border-white/5 last:border-0 pb-2 last:pb-0"
                    >
                      <span className="truncate">{agentLabel(entry.agent)}</span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {entry.total_tokens} tok · {entry.provider}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <AgentDetailDrawer
        taskId={selectedTaskId}
        node={selectedNode}
        tokenEntry={detailAgent ? tokensByAgent.get(detailAgent) : null}
        onClose={() => setDetailAgent(null)}
      />
    </div>
  );
}
