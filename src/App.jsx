import React, { useState } from "react";
import Artifacts from "./pages/Artifacts.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Logs from "./pages/Logs.jsx";
import Workflow from "./pages/Workflow.jsx";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "workflow", label: "Workflow" },
  { id: "artifacts", label: "Artifacts" },
  { id: "logs", label: "Logs" },
];

const PAGES = {
  dashboard: Dashboard,
  workflow: Workflow,
  artifacts: Artifacts,
  logs: Logs,
};

export default function App() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#0b0d13]">
      <nav className="shrink-0 flex items-center gap-1 px-4 pt-3 bg-slate-50 dark:bg-[#0b0d13]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`text-sm font-medium px-3.5 py-2 rounded-t-lg border border-b-0 transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-surface border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 min-h-0 -mt-px">
        {(() => {
          const ActivePage = PAGES[tab] || Dashboard;
          return <ActivePage />;
        })()}
      </div>
    </div>
  );
}
