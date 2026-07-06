import React, { useEffect, useState } from "react";
import AgentBadge from "./AgentBadge.jsx";
import { artifactTypeLabel } from "../constants/pipeline.js";
import { formatBytes, formatTimestamp, shortId } from "../utils/format.js";
import { copyToClipboard } from "../utils/clipboard.js";
import { downloadTextFile } from "../utils/download.js";
import { renderMarkdown } from "../utils/markdown.jsx";

export default function ArtifactPreviewDrawer({ artifact, state, onClose }) {
  const [mode, setMode] = useState("preview"); // preview | raw
  const [copyState, setCopyState] = useState("idle");

  useEffect(() => {
    setMode("preview");
    setCopyState("idle");
  }, [artifact?.task_id, artifact?.filename]);

  if (!artifact) return null;

  const content = state?.content ?? null;
  const loading = state?.loading;
  const error = state?.error;

  const handleCopy = async () => {
    setCopyState("copying");
    const ok = await copyToClipboard(content ?? "");
    setCopyState(ok ? "copied" : "error");
    setTimeout(() => setCopyState("idle"), 1600);
  };

  const handleDownload = () => {
    if (content != null) downloadTextFile(artifact.filename, content);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[36rem] h-full bg-white dark:bg-surface border-l border-slate-200 dark:border-white/10 flex flex-col shadow-xl">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{artifactTypeLabel(artifact.agent)}</h3>
              <AgentBadge agent={artifact.agent} />
            </div>
            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">{artifact.filename}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              #{shortId(artifact.task_id, 12)} · {formatBytes(artifact.size_bytes)} ·{" "}
              {formatTimestamp(artifact.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="shrink-0 px-4 pt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1 bg-slate-100 dark:bg-panel rounded-lg p-1">
            {["preview", "raw"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`text-xs font-medium px-3 py-1.5 rounded-md capitalize transition-colors ${
                  mode === m
                    ? "bg-white dark:bg-white/10 text-slate-900 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!content}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              {copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Failed" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!content}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-40"
            >
              Download
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <p className="text-sm text-slate-500 animate-pulse">Loading artifact…</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {!loading && !error && content == null && (
            <p className="text-sm text-slate-500">No content available.</p>
          )}
          {!loading && !error && content != null && mode === "preview" && (
            <div className="text-slate-800 dark:text-slate-200">{renderMarkdown(content)}</div>
          )}
          {!loading && !error && content != null && mode === "raw" && (
            <pre className="text-xs whitespace-pre-wrap break-words bg-slate-50 dark:bg-panel rounded-lg p-3 font-mono leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
