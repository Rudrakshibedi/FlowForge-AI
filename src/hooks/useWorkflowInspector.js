import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  executeWorkflow,
  getTaskObservability,
  getTaskTokenUsage,
  getWorkflowStatus,
  listWorkflowTasks,
} from "../services/api.js";
import { AGENT_STEPS, FULL_FLOW } from "../constants/pipeline.js";

const POLL_INTERVAL_MS = 700;
const RUNNING_STATUSES = new Set(["pending", "running"]);

const emptyTokenUsage = {
  llm_calls: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_tokens: 0,
  by_agent: [],
};

const emptyObservability = {
  active_agent: null,
  timeline: [],
  tool_usage: [],
  tool_call_count: 0,
  total_duration_ms: 0,
  errors: [],
  error_count: 0,
};

function makeTaskId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useWorkflowInspector() {
  const [recentTasks, setRecentTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState(null); // { status, execution_order }
  const [observability, setObservability] = useState(emptyObservability);
  const [tokenUsage, setTokenUsage] = useState(emptyTokenUsage);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);
  const [requestText, setRequestText] = useState("");
  const [manualPipeline, setManualPipeline] = useState([]); // [] => let the Router decide

  const pollRef = useRef(null);

  const refreshTaskList = useCallback(async () => {
    try {
      const tasks = await listWorkflowTasks();
      setRecentTasks(tasks.slice().reverse());
    } catch {
      // Non-critical for the diagram itself.
    }
  }, []);

  useEffect(() => {
    refreshTaskList();
  }, [refreshTaskList]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const fetchOnce = useCallback(async (taskId) => {
    const [status, obs, tokens] = await Promise.all([
      getWorkflowStatus(taskId),
      getTaskObservability(taskId),
      getTaskTokenUsage(taskId),
    ]);
    setTaskStatus(status);
    setObservability(obs);
    setTokenUsage(tokens);
    return status;
  }, []);

  const beginPolling = useCallback(
    (taskId) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const status = await fetchOnce(taskId);
          if (!RUNNING_STATUSES.has(status.status)) {
            stopPolling();
            setIsRunning(false);
            refreshTaskList();
          }
        } catch {
          // Task may briefly not exist yet on the first tick(s).
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchOnce, stopPolling, refreshTaskList]
  );

  const selectTask = useCallback(
    async (taskId) => {
      stopPolling();
      setError(null);
      setSelectedTaskId(taskId);
      try {
        const status = await fetchOnce(taskId);
        if (RUNNING_STATUSES.has(status.status)) {
          setIsRunning(true);
          beginPolling(taskId);
        } else {
          setIsRunning(false);
        }
      } catch (err) {
        setError(err.message || "Could not load that task");
      }
    },
    [fetchOnce, stopPolling, beginPolling]
  );

  const runWorkflow = useCallback(async () => {
    const trimmed = requestText.trim();
    if (!trimmed || isRunning) return;

    const taskId = makeTaskId();
    setError(null);
    setIsRunning(true);
    setSelectedTaskId(taskId);
    setTaskStatus({ task_id: taskId, status: "running", execution_order: [] });
    setObservability(emptyObservability);
    setTokenUsage(emptyTokenUsage);

    beginPolling(taskId);

    try {
      await executeWorkflow(trimmed, taskId, manualPipeline.length ? manualPipeline : null);
    } catch (err) {
      setError(err.message || "Execution failed");
    } finally {
      stopPolling();
      try {
        await fetchOnce(taskId);
      } catch {
        // Ignore — UI already reflects the last successful poll.
      }
      setIsRunning(false);
      refreshTaskList();
    }
  }, [requestText, isRunning, manualPipeline, beginPolling, stopPolling, fetchOnce, refreshTaskList]);

  const toggleManualAgent = useCallback((agent) => {
    setManualPipeline((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
    );
  }, []);

  const resetManualPipeline = useCallback(() => setManualPipeline([]), []);

  // --- Derived per-node status for the flow diagram ------------------
  const executedAgents = useMemo(
    () => (taskStatus?.execution_order || []).filter((a) => a !== "router"),
    [taskStatus]
  );
  const hasStarted = Boolean(selectedTaskId);
  const taskFinished = hasStarted && taskStatus && !RUNNING_STATUSES.has(taskStatus.status);

  const nodeStatuses = useMemo(() => {
    const entryMap = new Map((observability.timeline || []).map((e) => [e.agent, e]));
    const activeAgent = observability.active_agent;
    const activeIndex = activeAgent ? AGENT_STEPS.indexOf(activeAgent) : -1;

    return FULL_FLOW.map((agent) => {
      if (!hasStarted) return { agent, status: "idle" };

      if (agent === "user") return { agent, status: "completed" };

      if (agent === "router") {
        if (isRunning && entryMap.size === 0 && !activeAgent) return { agent, status: "running" };
        return { agent, status: "completed" };
      }

      const entry = entryMap.get(agent);
      if (entry) {
        return {
          agent,
          status: entry.status === "failed" ? "failed" : "completed",
          durationMs: entry.duration_ms,
          error: entry.error,
        };
      }

      if (taskFinished) {
        return { agent, status: executedAgents.includes(agent) ? "completed" : "skipped" };
      }

      if (agent === activeAgent) return { agent, status: "running" };

      const idx = AGENT_STEPS.indexOf(agent);
      if (activeIndex !== -1 && idx < activeIndex) return { agent, status: "skipped" };

      return { agent, status: "idle" };
    });
  }, [hasStarted, isRunning, observability, taskFinished, executedAgents]);

  const tokensByAgent = useMemo(() => {
    const map = new Map();
    for (const entry of tokenUsage.by_agent || []) {
      map.set(entry.agent, entry);
    }
    return map;
  }, [tokenUsage]);

  return {
    recentTasks,
    selectedTaskId,
    taskStatus,
    observability,
    tokenUsage,
    tokensByAgent,
    nodeStatuses,
    isRunning,
    error,
    requestText,
    setRequestText,
    manualPipeline,
    toggleManualAgent,
    resetManualPipeline,
    selectTask,
    runWorkflow,
  };
}
