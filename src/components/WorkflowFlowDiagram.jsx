import React from "react";
import { agentLabel } from "../constants/pipeline.js";
import StatusPill from "./StatusPill.jsx";

const NODE_RING = {
  idle: "border-slate-300 dark:border-white/10",
  running: "border-warning ring-4 ring-warning/20",
  completed: "border-success",
  failed: "border-danger ring-4 ring-danger/20",
  skipped: "border-dashed border-slate-300 dark:border-white/15",
};

const NODE_DOT = {
  idle: "bg-slate-300 dark:bg-white/20",
  running: "bg-warning animate-pulse",
  completed: "bg-success",
  failed: "bg-danger",
  skipped: "bg-slate-300 dark:bg-white/15",
};

function Connector({ status }) {
  const filled = status === "completed" || status === "failed" || status === "running";
  return (
    <div className="flex justify-center" aria-hidden="true">
      <div
        className={`w-px h-5 sm:h-6 ${
          filled ? "bg-accent/50" : "bg-slate-200 dark:bg-white/10"
        }`}
      />
    </div>
  );
}

function FlowNode({ node, tokenEntry, onSelect, isSelectable }) {
  const opacity = node.status === "skipped" ? "opacity-60" : "";
  return (
    <button
      type="button"
      onClick={isSelectable ? () => onSelect(node.agent) : undefined}
      disabled={!isSelectable}
      className={`w-full text-left rounded-xl border-2 px-4 py-3 bg-white dark:bg-surface transition-all ${NODE_RING[node.status]} ${opacity} ${
        isSelectable ? "hover:border-accent/60 cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${NODE_DOT[node.status]}`} />
          <span className="font-medium text-sm truncate">{agentLabel(node.agent)}</span>
        </div>
        <StatusPill status={node.status} dot={false} />
      </div>
      {(node.durationMs != null || tokenEntry) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {node.durationMs != null && <span>{Math.round(node.durationMs)} ms</span>}
          {tokenEntry && (
            <span>
              {tokenEntry.total_tokens} tok · {tokenEntry.provider}
            </span>
          )}
        </div>
      )}
      {node.error && <p className="mt-1.5 text-[11px] text-danger line-clamp-2">{node.error}</p>}
    </button>
  );
}

export default function WorkflowFlowDiagram({ nodeStatuses, tokensByAgent, onSelectAgent }) {
  return (
    <div className="max-w-md mx-auto">
      {nodeStatuses.map((node, idx) => (
        <React.Fragment key={node.agent}>
          {idx > 0 && <Connector status={node.status} />}
          <FlowNode
            node={node}
            tokenEntry={tokensByAgent.get(node.agent)}
            onSelect={onSelectAgent}
            isSelectable={node.agent !== "user" && node.status !== "idle"}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
