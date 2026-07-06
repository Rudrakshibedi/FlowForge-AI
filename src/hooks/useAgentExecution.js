import { useCallback, useEffect, useRef, useState } from "react";
import {
  executeWorkflow,
  getHealth,
  getLogs,
  getTaskObservability,
} from "../services/api.js";

const POLL_INTERVAL_MS = 600;

function makeTaskId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const emptyTokenUsage = {
  llm_calls: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_tokens: 0,
};

/**
 * Drives the whole Dashboard: sends requests to POST /execute, polls
 * GET /workflow/{task_id}/observability while the request is in flight
 * (FastAPI runs the sync route in a worker thread, so this really does
 * return live progress), and derives provider / cache-hit stats from real
 * API responses only — no mock data.
 */
export function useAgentExecution() {
  const [messages, setMessages] = useState([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [executionStatus, setExecutionStatus] = useState("idle"); // idle | running | completed | completed_with_errors | error
  const [activeAgent, setActiveAgent] = useState(null);
  const [provider, setProvider] = useState(null);
  const [tokenUsage, setTokenUsage] = useState(emptyTokenUsage);
  const [cacheHits, setCacheHits] = useState(0);
  const [pipelineExecuted, setPipelineExecuted] = useState([]);
  const [backendStatus, setBackendStatus] = useState("checking"); // checking | online | offline

  const pollRef = useRef(null);

  const refreshCacheHits = useCallback(async () => {
    try {
      const logs = await getLogs({ limit: 2000 });
      setCacheHits(logs.filter((l) => l.message === "Cache hit").length);
    } catch {
      // Non-critical — leave the last known count in place.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getHealth();
        if (!cancelled) setBackendStatus("online");
      } catch {
        if (!cancelled) setBackendStatus("offline");
      }
    })();
    refreshCacheHits();
    return () => {
      cancelled = true;
    };
  }, [refreshCacheHits]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const execute = useCallback(
    async (promptText) => {
      const trimmed = promptText.trim();
      if (!trimmed || isExecuting) return;

      const taskId = makeTaskId();
      setError(null);
      setIsExecuting(true);
      setExecutionStatus("running");
      setActiveAgent("router");
      setMessages((prev) => [...prev, { id: taskId, role: "user", content: trimmed }]);

      pollRef.current = setInterval(async () => {
        try {
          const obs = await getTaskObservability(taskId);
          if (obs.active_agent) setActiveAgent(obs.active_agent);
          else if (obs.timeline?.length) {
            setActiveAgent(obs.timeline[obs.timeline.length - 1].agent);
          }
        } catch {
          // Task may not exist yet on the very first tick — safe to ignore.
        }
      }, POLL_INTERVAL_MS);

      try {
        const result = await executeWorkflow(trimmed, taskId);
        stopPolling();

        const usage = result.token_usage || emptyTokenUsage;
        const lastCall = usage.by_agent?.[usage.by_agent.length - 1];
        if (lastCall?.provider) setProvider(lastCall.provider);

        setTokenUsage(usage);
        setPipelineExecuted(result.pipeline_executed || []);
        setExecutionStatus(result.status || "completed");
        setActiveAgent(
          result.pipeline_executed?.length
            ? result.pipeline_executed[result.pipeline_executed.length - 1]
            : "router"
        );

        const failedSteps = (result.timeline || []).filter((t) => t.error);
        const summary = result.pipeline_executed?.length
          ? `Ran pipeline: ${result.pipeline_executed.join(" → ")}`
          : "Answered directly — no agent pipeline was needed.";

        setMessages((prev) => [
          ...prev,
          {
            id: `${taskId}-response`,
            role: "assistant",
            content: summary,
            meta: {
              taskId: result.task_id,
              routingDecision: result.routing_decision,
              failedSteps,
              tokenUsage: usage,
            },
          },
        ]);

        refreshCacheHits();
      } catch (err) {
        stopPolling();
        setExecutionStatus("error");
        setActiveAgent(null);
        setError(err.message || "Request failed");
      } finally {
        setIsExecuting(false);
      }
    },
    [isExecuting, stopPolling, refreshCacheHits]
  );

  const clearChat = useCallback(() => {
    stopPolling();
    setMessages([]);
    setError(null);
    setIsExecuting(false);
    setExecutionStatus("idle");
    setActiveAgent(null);
    setProvider(null);
    setTokenUsage(emptyTokenUsage);
    setPipelineExecuted([]);
  }, [stopPolling]);

  return {
    messages,
    isExecuting,
    error,
    executionStatus,
    activeAgent,
    provider,
    tokenUsage,
    cacheHits,
    pipelineExecuted,
    backendStatus,
    execute,
    clearChat,
  };
}
