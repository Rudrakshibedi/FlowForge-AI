import React, { useEffect, useState } from "react";
import { agentLabel, ARTIFACT_FILENAMES } from "../constants/pipeline.js";
import { getArtifactContent } from "../services/api.js";
import StatusPill from "./StatusPill.jsx";

export default function AgentDetailDrawer({ taskId, node, tokenEntry, onClose }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filename = node ? ARTIFACT_FILENAMES[node.agent] : null;

  useEffect(() => {
    if (!node || !taskId || !filename) {
      setContent(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setContent(null);
    getArtifactContent(taskId, filename)
      .then((res) => {
        if (!cancelled) setContent(res.content);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Artifact not available");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [node, taskId, filename]);

  if (!node) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[28rem] h-full bg-white dark:bg-surface border-l border-slate-200 dark:border-white/10 flex flex-col shadow-xl">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">{agentLabel(node.agent)}</h3>
            <div className="mt-1 flex items-center gap-2">
              <StatusPill status={node.status} />
              {node.durationMs != null && (
                <span className="text-xs text-slate-500">{Math.round(node.durationMs)} ms</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {tokenEntry && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 dark:bg-panel rounded-lg py-2">
                <p className="text-sm font-semibold">{tokenEntry.total_tokens}</p>
                <p className="text-[10px] uppercase text-slate-500">Tokens</p>
              </div>
              <div className="bg-slate-50 dark:bg-panel rounded-lg py-2">
                <p className="text-sm font-semibold capitalize">{tokenEntry.provider}</p>
                <p className="text-[10px] uppercase text-slate-500">Provider</p>
              </div>
              <div className="bg-slate-50 dark:bg-panel rounded-lg py-2">
                <p className="text-sm font-semibold">
                  {tokenEntry.input_tokens}/{tokenEntry.output_tokens}
                </p>
                <p className="text-[10px] uppercase text-slate-500">In/Out</p>
              </div>
            </div>
          )}

          {node.error && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-xl px-3 py-2">
              {node.error}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-500 mb-1.5">
              Generated artifact {filename && <span className="font-mono">({filename})</span>}
            </p>
            {loading && (
              <p className="text-sm text-slate-500 animate-pulse">Loading artifact…</p>
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            {!loading && !error && content && (
              <pre className="text-xs whitespace-pre-wrap break-words bg-slate-50 dark:bg-panel rounded-lg p-3 font-mono leading-relaxed">
                {content}
              </pre>
            )}
            {!loading && !error && !content && (
              <p className="text-sm text-slate-500">No artifact generated for this agent.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
