import React from "react";
import AgentBadge from "./AgentBadge.jsx";
import StatusPill from "./StatusPill.jsx";
import { shortId } from "../utils/format.js";
import { copyToClipboard } from "../utils/clipboard.js";

export default function LogsTable({ logs, onSelectTask }) {
  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-10 text-center">
        <p className="text-sm text-slate-500">No log entries match the current filters.</p>
      </div>
    );
  }

  const handleCopyRequestId = (id) => (e) => {
    e.stopPropagation();
    copyToClipboard(id);
  };

  return (
    <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
      <div className="max-h-[32rem] overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
        {logs.map((entry, i) => (
          <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
            <span className="shrink-0 w-[7.5rem] text-[11px] text-slate-400 font-mono pt-0.5">
              {/* Backend sends "YYYY-MM-DDTHH:MM:SS" (UTC) — render as-is, just more readable. */}
              {(entry.timestamp || "").replace("T", " ")}
            </span>
            <span className="shrink-0 pt-0.5">
              <StatusPill status={(entry.level || "info").toLowerCase()} />
            </span>
            <span className="shrink-0 pt-0.5">
              {entry.agent ? (
                <AgentBadge agent={entry.agent} />
              ) : (
                <span className="text-[11px] text-slate-400">—</span>
              )}
            </span>
            {entry.task_id && (
              <button
                type="button"
                title={`Filter to request ${entry.task_id} · click to copy`}
                onClick={() => onSelectTask?.(entry.task_id)}
                onDoubleClick={handleCopyRequestId(entry.task_id)}
                className="shrink-0 pt-0.5 text-[11px] font-mono text-slate-500 hover:text-accent dark:hover:text-accentSoft transition-colors"
              >
                #{shortId(entry.task_id)}
              </button>
            )}
            <span className="min-w-0 flex-1 text-slate-700 dark:text-slate-300 break-words">
              {entry.message}
              {entry.error && <span className="text-danger"> — {entry.error}</span>}
              {entry.tool && (
                <span className="ml-1.5 text-[11px] text-slate-400 font-mono">tool={entry.tool}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
