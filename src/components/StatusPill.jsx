import React from "react";

const STATUS_STYLES = {
  idle: "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400",
  running: "bg-warning/15 text-warning border border-warning/30",
  completed: "bg-success/15 text-success border border-success/30",
  completed_with_errors: "bg-warning/15 text-warning border border-warning/30",
  skipped: "bg-slate-200/70 text-slate-500 dark:bg-white/5 dark:text-slate-500 border border-dashed border-slate-300 dark:border-white/10",
  failed: "bg-danger/15 text-danger border border-danger/30",
  error: "bg-danger/15 text-danger border border-danger/30",
  checking: "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400",
  online: "bg-success/15 text-success border border-success/30",
  offline: "bg-danger/15 text-danger border border-danger/30",
  // Log levels (GET /logs entries) — reuses the same pill styling.
  debug: "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400",
  info: "bg-accent/15 text-accent dark:text-accentSoft border border-accent/20",
  warning: "bg-warning/15 text-warning border border-warning/30",
  critical: "bg-danger/20 text-danger border border-danger/40",
};

const STATUS_LABELS = {
  idle: "Idle",
  running: "Running",
  completed: "Completed",
  completed_with_errors: "Completed with errors",
  skipped: "Skipped",
  failed: "Failed",
  error: "Error",
  checking: "Checking…",
  online: "Online",
  offline: "Offline",
  debug: "Debug",
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export default function StatusPill({ status, dot = true }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.idle;
  const label = STATUS_LABELS[status] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "running" || status === "checking"
              ? "animate-pulse bg-current"
              : "bg-current"
          }`}
        />
      )}
      {label}
    </span>
  );
}
