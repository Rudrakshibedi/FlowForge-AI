import React from "react";
import AgentBadge from "./AgentBadge.jsx";
import StatusPill from "./StatusPill.jsx";
import { shortId } from "../utils/format.js";

export default function ErrorsPanel({ executionErrors, errorLogs, onSelectTask }) {
  const hasExecutionErrors = executionErrors && executionErrors.length > 0;
  const hasErrorLogs = errorLogs && errorLogs.length > 0;

  if (!hasExecutionErrors && !hasErrorLogs) {
    return (
      <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-10 text-center">
        <p className="text-sm text-slate-500">No errors recorded — everything's running clean. ✓</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasExecutionErrors && (
        <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
          <h3 className="text-sm font-semibold mb-3">Execution failures (selected request)</h3>
          <ul className="space-y-2">
            {executionErrors.map((entry, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm border-b border-slate-100 dark:border-white/5 last:border-0 pb-2 last:pb-0"
              >
                <AgentBadge agent={entry.agent} />
                <StatusPill status="failed" dot={false} />
                <span className="text-danger min-w-0 flex-1 break-words">{entry.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasErrorLogs && (
        <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
          <h3 className="text-sm font-semibold mb-3">Error-level log entries</h3>
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {errorLogs.map((entry, i) => (
              <li
                key={i}
                className="text-sm border-b border-slate-100 dark:border-white/5 last:border-0 pb-2 last:pb-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusPill status={(entry.level || "error").toLowerCase()} />
                  {entry.agent && <AgentBadge agent={entry.agent} />}
                  {entry.task_id && (
                    <button
                      type="button"
                      onClick={() => onSelectTask?.(entry.task_id)}
                      className="text-[11px] font-mono text-slate-500 hover:text-accent dark:hover:text-accentSoft"
                    >
                      #{shortId(entry.task_id)}
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">
                    {(entry.timestamp || "").replace("T", " ")}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 break-words">{entry.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
