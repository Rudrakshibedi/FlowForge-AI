import React, { useState } from "react";
import AgentBadge from "./AgentBadge.jsx";
import { artifactTypeLabel } from "../constants/pipeline.js";
import { formatBytes, formatRelativeTime, shortId } from "../utils/format.js";
import { copyToClipboard } from "../utils/clipboard.js";
import { downloadTextFile } from "../utils/download.js";

export default function ArtifactCard({ artifact, onPreview, ensureContent }) {
  const [copyState, setCopyState] = useState("idle"); // idle | copying | copied | error

  const handleCopy = async (e) => {
    e.stopPropagation();
    setCopyState("copying");
    const result = await ensureContent(artifact);
    if (result?.error) {
      setCopyState("error");
    } else {
      const ok = await copyToClipboard(result?.content ?? "");
      setCopyState(ok ? "copied" : "error");
    }
    setTimeout(() => setCopyState("idle"), 1600);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    const result = await ensureContent(artifact);
    if (result?.content != null) {
      downloadTextFile(artifact.filename, result.content);
    }
  };

  return (
    <div
      onClick={() => onPreview(artifact)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onPreview(artifact)}
      className="group text-left bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-4 flex flex-col gap-2.5 cursor-pointer hover:border-accent/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{artifactTypeLabel(artifact.agent)}</p>
          <p className="text-xs text-slate-500 font-mono truncate">{artifact.filename}</p>
        </div>
        <AgentBadge agent={artifact.agent} />
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <span className="font-mono" title={artifact.task_id}>
          #{shortId(artifact.task_id)}
        </span>
        <span>·</span>
        <span>{formatBytes(artifact.size_bytes)}</span>
        <span>·</span>
        <span title={new Date(artifact.created_at * 1000).toLocaleString()}>
          {formatRelativeTime(artifact.created_at)}
        </span>
        {artifact.reused_content && (
          <>
            <span>·</span>
            <span className="text-accent dark:text-accentSoft" title="Identical content reused from cache">
              ♻ reused
            </span>
          </>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 mt-1 opacity-90 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onPreview(artifact)}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          disabled={copyState === "copying"}
        >
          {copyState === "copied" ? "Copied ✓" : copyState === "error" ? "Failed" : "Copy"}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
        >
          Download
        </button>
      </div>
    </div>
  );
}
