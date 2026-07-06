import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getArtifactContent, listArtifacts, listWorkflowTasks } from "../services/api.js";
import { agentLabel } from "../constants/pipeline.js";

const POLL_INTERVAL_MS = 5000;

export function useArtifacts() {
  const [tasks, setTasks] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [taskFilter, setTaskFilter] = useState(""); // "" => all tasks
  const [agentFilter, setAgentFilter] = useState(""); // "" => all types
  const [search, setSearch] = useState("");

  // artifact key (`${task_id}/${filename}`) -> { content, loading, error }
  const [contentCache, setContentCache] = useState({});
  const [previewKey, setPreviewKey] = useState(null);

  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [artifactList, taskList] = await Promise.all([listArtifacts(), listWorkflowTasks()]);
      setArtifacts(artifactList);
      setTasks(taskList.slice().reverse());
      setError(null);
    } catch (err) {
      setError(err.message || "Could not load artifacts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const filteredArtifacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artifacts.filter((a) => {
      if (taskFilter && a.task_id !== taskFilter) return false;
      if (agentFilter && a.agent !== agentFilter) return false;
      if (!q) return true;
      const haystack = [a.filename, a.task_id, a.agent, agentLabel(a.agent)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [artifacts, taskFilter, agentFilter, search]);

  const taskRequestById = useMemo(() => {
    const map = new Map();
    for (const t of tasks) map.set(t.task_id, t.request);
    return map;
  }, [tasks]);

  const keyFor = (artifact) => `${artifact.task_id}/${artifact.filename}`;

  const ensureContent = useCallback(
    async (artifact) => {
      const key = keyFor(artifact);
      const existing = contentCache[key];
      if (existing?.content != null || existing?.loading) return existing;

      setContentCache((prev) => ({ ...prev, [key]: { loading: true, error: null, content: null } }));
      try {
        const res = await getArtifactContent(artifact.task_id, artifact.filename);
        setContentCache((prev) => ({
          ...prev,
          [key]: { loading: false, error: null, content: res.content },
        }));
        return { content: res.content };
      } catch (err) {
        const message = err.message || "Could not load artifact content";
        setContentCache((prev) => ({ ...prev, [key]: { loading: false, error: message, content: null } }));
        return { error: message };
      }
    },
    [contentCache]
  );

  const openPreview = useCallback(
    (artifact) => {
      setPreviewKey(keyFor(artifact));
      ensureContent(artifact);
    },
    [ensureContent]
  );

  const closePreview = useCallback(() => setPreviewKey(null), []);

  const previewArtifact = useMemo(
    () =>
      filteredArtifacts.find((a) => keyFor(a) === previewKey) ||
      artifacts.find((a) => keyFor(a) === previewKey) ||
      null,
    [filteredArtifacts, artifacts, previewKey]
  );
  const previewState = previewKey ? contentCache[previewKey] : null;

  return {
    tasks,
    taskRequestById,
    artifacts: filteredArtifacts,
    totalCount: artifacts.length,
    isLoading,
    error,
    taskFilter,
    setTaskFilter,
    agentFilter,
    setAgentFilter,
    search,
    setSearch,
    contentCache,
    ensureContent,
    openPreview,
    closePreview,
    previewArtifact,
    previewState,
    refresh,
  };
}
