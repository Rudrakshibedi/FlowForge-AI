import React from "react";

export default function StatCard({ label, value, hint, accent = false, pulse = false }) {
  return (
    <div className="bg-white dark:bg-surface rounded-xl border border-slate-200 dark:border-white/5 p-3 sm:p-4 flex flex-col justify-between min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 truncate">
        {label}
      </p>
      <p
        className={`mt-1 text-lg sm:text-xl font-semibold truncate ${
          accent
            ? "text-accent dark:text-accentSoft"
            : "text-slate-900 dark:text-slate-100"
        } ${pulse ? "animate-pulse" : ""}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{hint}</p>}
    </div>
  );
}
