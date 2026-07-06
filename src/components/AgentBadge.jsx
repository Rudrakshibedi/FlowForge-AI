import React from "react";
import { agentLabel, AGENT_COLORS } from "../constants/pipeline.js";

// Literal class strings (not template-interpolated) so Tailwind's JIT scanner
// can find them — see constants/pipeline.js for the color-key mapping.
const COLOR_STYLES = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
};

export default function AgentBadge({ agent, className = "" }) {
  const color = AGENT_COLORS[agent] || "slate";
  const style = COLOR_STYLES[color] || COLOR_STYLES.slate;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${style} ${className}`}
    >
      {agentLabel(agent)}
    </span>
  );
}
