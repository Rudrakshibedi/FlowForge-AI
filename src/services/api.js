/**
 * Thin API client. All backend calls go through here so components never
 * hardcode fetch/URL logic.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  return res.json();
}

export function sendChatMessage(message, sessionId) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

/**
 * Direct workflow execution (POST /execute). Unlike /chat this has no
 * session semantics, but it accepts a caller-supplied task_id, which lets
 * the dashboard poll /workflow/{task_id}/observability and /tokens for
 * live progress while the (synchronous) request is still in flight.
 */
export function executeWorkflow(requestText, taskId, pipeline) {
  return request("/execute", {
    method: "POST",
    body: JSON.stringify({ request: requestText, task_id: taskId, pipeline: pipeline ?? null }),
  });
}

export function listWorkflowTasks() {
  return request("/workflow");
}

export function getWorkflowStatus(taskId) {
  return request(`/workflow/${taskId}`);
}

export function getTaskTokenUsage(taskId) {
  return request(`/workflow/${taskId}/tokens`);
}

export function getTaskObservability(taskId) {
  return request(`/workflow/${taskId}/observability`);
}

export function getLogs({ limit = 500, taskId, level } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (taskId) params.set("task_id", taskId);
  if (level) params.set("level", level);
  return request(`/logs?${params.toString()}`);
}

export function getArtifactContent(taskId, filename) {
  return request(`/artifacts/${taskId}/${filename}`);
}

/** List all generated artifacts, optionally scoped to one task. */
export function listArtifacts({ taskId } = {}) {
  const params = new URLSearchParams();
  if (taskId) params.set("task_id", taskId);
  const qs = params.toString();
  return request(`/artifacts${qs ? `?${qs}` : ""}`);
}

/** Artifacts generated for one specific task (same data, task-scoped route). */
export function getTaskArtifacts(taskId) {
  return request(`/workflow/${taskId}/artifacts`);
}

export function getHealth() {
  return request("/health");
}
