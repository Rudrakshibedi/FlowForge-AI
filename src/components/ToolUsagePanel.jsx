import React from "react";
import { agentLabel } from "../constants/pipeline.js";

export default function ToolUsagePanel({ toolUsage }) {
  return (
    <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4">
      <h2 className="text-sm font-semibold mb-3">MCP Tool Usage</h2>
      {!toolUsage || toolUsage.length === 0 ? (
        <p className="text-sm text-slate-500">No MCP tool calls recorded for this task yet.</p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {toolUsage.map((call, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 dark:border-white/5 last:border-0 pb-2 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{call.tool}</p>
                <p className="text-xs text-slate-500 truncate">{agentLabel(call.agent)}</p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                  call.success
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger"
                }`}
              >
                {call.success ? "ok" : "failed"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
