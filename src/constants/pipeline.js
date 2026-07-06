/**
 * Mirrors backend/router/orchestrator.py's _AGENT_REGISTRY order and
 * backend/api/schemas.py's _VALID_AGENT_STEPS. Kept in one place so the
 * Workflow diagram, the manual pipeline override form, and status
 * derivation all agree on the same fixed execution order.
 */
export const AGENT_STEPS = [
  "planner",
  "product_manager",
  "architect",
  "developer",
  "reviewer",
  "tester",
  "documentation",
];

// Full visualized flow, including the two pseudo/always-present nodes.
export const FULL_FLOW = ["user", "router", ...AGENT_STEPS];

const LABELS = {
  user: "User",
  router: "Router",
  planner: "Planner",
  product_manager: "Product Manager",
  architect: "Architect",
  developer: "Developer",
  reviewer: "Reviewer",
  tester: "Tester",
  documentation: "Documentation",
};

export function agentLabel(agent) {
  return LABELS[agent] || agent?.replace(/_/g, " ") || "—";
}

// Mirrors backend/services/artifact_service.py's ARTIFACT_FILENAMES.
export const ARTIFACT_FILENAMES = {
  planner: "project_plan.md",
  product_manager: "requirements.md",
  architect: "architecture.md",
  developer: "implementation_plan.md",
  reviewer: "review_report.md",
  tester: "test_plan.md",
  documentation: "README.md",
};

// Artifact-type display name (distinct from the agent name — e.g. the
// Product Manager agent's deliverable is labeled "Requirements").
export const ARTIFACT_TYPE_LABELS = {
  planner: "Project Plan",
  product_manager: "Requirements",
  architect: "Architecture",
  developer: "Implementation Plan",
  reviewer: "Review Report",
  tester: "Test Plan",
  documentation: "Documentation",
};

// Accent color key per agent, used for small badges/pills across the
// Artifacts and Logs pages so each agent reads consistently everywhere.
export const AGENT_COLORS = {
  router: "slate",
  planner: "indigo",
  product_manager: "violet",
  architect: "sky",
  developer: "emerald",
  reviewer: "amber",
  tester: "rose",
  documentation: "cyan",
};

export function artifactTypeLabel(agent) {
  return ARTIFACT_TYPE_LABELS[agent] || agentLabel(agent);
}

// Ordered list of the 7 canonical SDLC artifact types, ready to render as
// filter chips / grid slots on the Artifacts page.
export const ARTIFACT_TYPES = AGENT_STEPS.map((agent) => ({
  agent,
  label: ARTIFACT_TYPE_LABELS[agent],
  filename: ARTIFACT_FILENAMES[agent],
}));
