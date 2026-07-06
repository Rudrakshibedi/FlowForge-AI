import React from "react";
import AgentBadge from "./AgentBadge.jsx";
import StatusPill from "./StatusPill.jsx";

function formatDuration(ms) {
  if (!ms) return "0 ms";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export default function ExecutionTimelineList({ timeline, activeAgent }) {
  if ((!timeline || timeline.length === 0) && !activeAgent) {
    return <p className="text-sm text-slate-500">No execution steps recorded for this request yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {(timeline || []).map((entry, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                entry.status === "failed" ? "bg-danger" : "bg-success"
              }`}
            />
            {(i < timeline.length - 1 || activeAgent) && (
              <span className="w-px flex-1 bg-slate-200 dark:bg-white/10 mt-1" />
            )}
          </div>
          <div className="pb-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent={entry.agent} />
              <StatusPill status={entry.status === "failed" ? "failed" : "completed"} dot={false} />
              <span className="text-xs text-slate-500">{formatDuration(entry.duration_ms)}</span>
            </div>
            {entry.error && <p className="text-xs text-danger mt-1">{entry.error}</p>}
          </div>
        </li>
      ))}

      {activeAgent && (
        <li className="flex gap-3">
          <div className="flex flex-col items-center pt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
          </div>
          <div className="pb-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <AgentBadge agent={activeAgent} />
              <StatusPill status="running" dot={false} />
            </div>
          </div>
        </li>
      )}
    </ol>
  );
}
