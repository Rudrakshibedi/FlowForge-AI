"""Orchestrator.

Executes the agent pipeline chosen by the Router Agent, passing only the
minimal context each downstream agent needs (its declared dependency's
output, summarized), recording every step into task memory, generating a
reusable Markdown artifact per agent, and tracking token usage / duration /
tool usage / errors. This is the single place that knows the full agent DAG.

Failure handling: each agent already degrades gracefully internally
(`BaseAgent.safe_generate_json`), but the orchestrator adds a second layer
of defense — if an agent still raises (e.g. a bug, an MCP tool crash), the
orchestrator catches it, records a structured error for that step, and
keeps executing the remaining pipeline wherever possible instead of failing
the entire workflow.
"""
from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from backend.agents.architect_agent import ArchitectAgent
from backend.agents.developer_agent import DeveloperAgent
from backend.agents.documentation_agent import DocumentationAgent
from backend.agents.pm_agent import ProductManagerAgent
from backend.agents.planner_agent import PlannerAgent
from backend.agents.reviewer_agent import ReviewerAgent
from backend.agents.router_agent import RouterAgent
from backend.agents.tester_agent import TesterAgent
from backend.config.logging_config import get_logger
from backend.memory.task_memory import task_memory
from backend.services.artifact_service import ARTIFACT_FILENAMES, artifact_service, dict_to_markdown_sections
from backend.services.observability import execution_tracker
from backend.services.token_tracker import token_tracker
from backend.tools.mcp_client import mcp_client

logger = get_logger(__name__)

# Maps pipeline step name -> (agent class, context key to store its output under,
# list of upstream output keys it depends on).
_AGENT_REGISTRY = {
    "planner": (PlannerAgent, "planner_output", []),
    "product_manager": (ProductManagerAgent, "pm_output", ["planner_output"]),
    "architect": (ArchitectAgent, "architect_output", ["pm_output"]),
    "developer": (DeveloperAgent, "developer_output", ["architect_output"]),
    "reviewer": (ReviewerAgent, "reviewer_output", ["developer_output"]),
    "tester": (TesterAgent, "tester_output", ["developer_output", "reviewer_output"]),
    "documentation": (
        DocumentationAgent,
        "documentation_output",
        ["planner_output", "pm_output", "architect_output", "developer_output",
         "reviewer_output", "tester_output"],
    ),
}

VALID_STEPS = set(_AGENT_REGISTRY.keys())


class Orchestrator:
    def __init__(self) -> None:
        self.router = RouterAgent()

    def run_workflow(
        self,
        request: str,
        task_id: Optional[str] = None,
        pipeline_override: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Run the full router -> agents workflow.

        `pipeline_override`, when provided, skips the Router Agent's
        decision-making and runs exactly the given ordered list of agents
        instead (used by `POST /execute` for direct/manual pipeline runs,
        e.g. re-running just the Tester agent).
        """
        task_id = task_id or str(uuid.uuid4())
        task_memory.create_task(task_id, request)
        task_memory.set_status(task_id, "running")

        timeline: List[Dict[str, Any]] = []

        # Step 1: determine the pipeline.
        if pipeline_override is not None:
            invalid = [s for s in pipeline_override if s not in VALID_STEPS]
            pipeline = [s for s in pipeline_override if s in VALID_STEPS]
            routing_decision = {
                "agent": "router",
                "pipeline": pipeline,
                "method": "manual_override",
                "complexity": "complex" if len(pipeline) > 3 else "simple",
                "reasoning": "Pipeline explicitly provided by the caller via POST /execute.",
                "invalid_steps_ignored": invalid,
            }
        else:
            routing_decision = self.router.run({"request": request, "task_id": task_id})
            pipeline = [s for s in routing_decision.get("pipeline", []) if s in VALID_STEPS]

        task_memory.record_agent_output(task_id, "router", routing_decision)
        timeline.append({"agent": "router", "output": routing_decision, "duration_ms": 0, "error": None})

        context: Dict[str, Any] = {"request": request, "task_id": task_id}

        # Step 2: execute only the agents the router selected (or the caller
        # explicitly requested), in order, generating an artifact for each.
        for step in pipeline:
            output, duration_ms, error = self._run_step(step, context, task_id)

            output_key = _AGENT_REGISTRY[step][1]
            context[output_key] = output
            task_memory.record_agent_output(task_id, step, output)
            timeline.append({
                "agent": step,
                "output": output,
                "duration_ms": duration_ms,
                "error": error,
            })

        had_errors = any(entry["error"] for entry in timeline)
        task_memory.set_status(task_id, "completed_with_errors" if had_errors else "completed")

        return {
            "task_id": task_id,
            "routing_decision": routing_decision,
            "pipeline_executed": pipeline,
            "timeline": timeline,
            "token_usage": token_tracker.summary(task_id),
            "observability": execution_tracker.summary(task_id),
            "artifacts": artifact_service.list_for_task(task_id),
            "status": "completed_with_errors" if had_errors else "completed",
        }

    def _run_step(self, step: str, context: Dict[str, Any], task_id: str):
        """Run a single pipeline step with timing, failure isolation, and
        artifact generation. Returns (output, duration_ms, error_or_None).
        """
        agent_cls, _output_key, _deps = _AGENT_REGISTRY[step]
        agent = agent_cls()

        self._log_active_agent(task_id, step)
        start = execution_tracker.start_agent(task_id, step)

        error: Optional[str] = None
        try:
            output = agent.run(context)
            if not isinstance(output, dict):
                output = {"agent": step, "success": False, "error": "Agent returned a non-dict result"}
            if output.get("success") is False:
                error = output.get("error")
                if not error and output.get("parse_error"):
                    error = "LLM returned invalid JSON"

                if not error:
                    error = "Unknown agent error"
        except Exception as exc:  # noqa: BLE001 - an agent bug must not kill the pipeline
            logger.exception("Agent execution failed", extra={"extra_fields": {"task_id": task_id, "agent": step}})
            error = str(exc)
            output = {"agent": step, "success": False, "error": error}

        duration_ms = execution_tracker.end_agent(task_id, step, start, success=error is None, error=error)

        # Generate the reusable Markdown artifact for this step, even on
        # partial failure, so the user can see what was produced/attempted.
        self._generate_artifact(step, output, task_id)

        return output, duration_ms, error

    @staticmethod
    def _generate_artifact(step: str, output: Dict[str, Any], task_id: str) -> None:
        filename = ARTIFACT_FILENAMES.get(step)
        if not filename:
            return
        try:
            sections = dict_to_markdown_sections(output)
            title = step.replace("_", " ").title()
            md_result = mcp_client.call("markdown_generator", title=title, sections=sections)
            content = md_result.get("markdown") if md_result.get("success") else (
                f"# {title}\n\n_Artifact generation failed: {md_result.get('error')}_\n"
            )
            artifact_service.save(task_id, step, filename, content)
        except Exception:  # noqa: BLE001 - artifact generation must never break the pipeline
            logger.exception(
                "Artifact generation failed", extra={"extra_fields": {"task_id": task_id, "agent": step}}
            )

    @staticmethod
    def _log_active_agent(task_id: str, agent_name: str) -> None:
        logger.info(
            "Executing agent",
            extra={"extra_fields": {"task_id": task_id, "active_agent": agent_name}},
        )

    # Kept for backwards compatibility with any existing callers/tests.
    logger_active_agent = _log_active_agent


orchestrator = Orchestrator()
