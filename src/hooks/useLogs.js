import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLogs, getTaskObservability, listWorkflowTasks } from "../services/api.js";

const AUTO_REFRESH_MS = 4000;
const RUNNING_STATUSES = new Set(["pending", "running"]);

const emptyObservability = {
  active_agent: null,
  timeline: [],
  tool_usage: [],
  tool_call_count: 0,
  total_duration_ms: 0,
  errors: [],
  error_count: 0,
};

export function useLogs() {
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [taskId, setTaskId] = useState(""); // "" => all requests
  const [agent, setAgent] = useState(""); // "" => all agents
  const [level, setLevel] = useState(""); // "" => all levels
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [observability, setObservability] = useState(emptyObservability);

  const pollRef = useRef(null);

  const refreshTasks = useCallback(async () => {
    try {
      const list = await listWorkflowTasks();
      setTasks(list.slice().reverse());
    } catch {
      // Non-critical for the log stream itself.
    }
  }, []);

  const refreshLogs = useCallback(async () => {
    try {
      const entries = await getLogs({ limit: 1000, taskId: taskId || undefined, level: level || undefined });
      setLogs(entries);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load logs");
    } finally {
      setIsLoading(false);
    }
  }, [taskId, level]);

  // Independent of the main `level` filter, so the Errors tab always has
  // data even when someone's browsing "INFO only" in the main Logs tab.
  const refreshErrorLogs = useCallback(async () => {
    try {
      const entries = await getLogs({ limit: 500, taskId: taskId || undefined, level: "ERROR" });
      setErrorLogs(entries);
    } catch {
      setErrorLogs([]);
    }
  }, [taskId]);

  const refreshObservability = useCallback(async () => {
    if (!taskId) {
      setObservability(emptyObservability);
      return;
    }
    try {
      const obs = await getTaskObservability(taskId);
      setObservability(obs);
    } catch {
      setObservability(emptyObservability);
    }
  }, [taskId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshLogs(), refreshErrorLogs(), refreshObservability(), refreshTasks()]);
  }, [refreshLogs, refreshErrorLogs, refreshObservability, refreshTasks]);

  useEffect(() => {
    setIsLoading(true);
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    pollRef.current = setInterval(refreshAll, AUTO_REFRESH_MS);
    return () => clearInterval(pollRef.current);
  }, [autoRefresh, refreshAll]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((entry) => {
      if (agent && entry.agent !== agent && entry.active_agent !== agent) return false;
      if (!q) return true;
      const haystack = [entry.message, entry.logger, entry.task_id, entry.agent, entry.tool]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [logs, agent, search]);

  const filteredErrorLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return errorLogs.filter((entry) => {
      if (agent && entry.agent !== agent) return false;
      if (!q) return true;
      const haystack = [entry.message, entry.logger, entry.task_id, entry.agent]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [errorLogs, agent, search]);

  const isTaskRunning = useMemo(() => {
    const task = tasks.find((t) => t.task_id === taskId);
    return task ? RUNNING_STATUSES.has(task.status) : false;
  }, [tasks, taskId]);

  const selectTask = useCallback((id) => setTaskId(id), []);
  const resetFilters = useCallback(() => {
    setTaskId("");
    setAgent("");
    setLevel("");
    setSearch("");
  }, []);

  return {
    tasks,
    logs: filteredLogs,
    totalCount: logs.length,
    errorLogs: filteredErrorLogs,
    errorLogCount: errorLogs.length,
    isLoading,
    error,
    taskId,
    selectTask,
    agent,
    setAgent,
    level,
    setLevel,
    search,
    setSearch,
    autoRefresh,
    setAutoRefresh,
    resetFilters,
    observability,
    isTaskRunning,
    refresh: refreshAll,
  };
}
