"""Artifact service.

Persists the Markdown artifact each agent produces (project_plan.md,
requirements.md, architecture.md, implementation_plan.md, review_report.md,
test_plan.md, README.md) to disk under `settings.artifacts_dir`, namespaced
by task_id, and keeps an in-memory index so the API can list/fetch them
cheaply without re-reading the filesystem on every request.

Deliberately separate from the MCP `file_writer` sandbox (`workspace/`)
since artifacts are user-facing deliverables, not scratch files.
"""
from __future__ import annotations

import hashlib
import os
import threading
import time
from typing import Any, Dict, List, Optional

from backend.config.logging_config import get_logger
from backend.config.settings import get_settings

logger = get_logger(__name__)

# Canonical artifact filename per pipeline step, per the platform spec.
ARTIFACT_FILENAMES: Dict[str, str] = {
    "planner": "project_plan.md",
    "product_manager": "requirements.md",
    "architect": "architecture.md",
    "developer": "implementation_plan.md",
    "reviewer": "review_report.md",
    "tester": "test_plan.md",
    "documentation": "README.md",
}


class ArtifactService:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        # (task_id, filename) -> metadata dict
        self._index: Dict[str, Dict[str, Any]] = {}
        # content_hash -> first (task_id, filename) that produced it, for reuse tracking
        self._content_hash_seen: Dict[str, str] = {}

    def _root_dir(self) -> str:
        settings = get_settings()
        root = os.path.abspath(settings.artifacts_dir)
        os.makedirs(root, exist_ok=True)
        return root

    def save(self, task_id: str, agent_name: str, filename: str, content: str) -> Dict[str, Any]:
        """Write an artifact to disk and index it. Never raises to the caller."""
        try:
            task_dir = os.path.join(self._root_dir(), task_id)
            os.makedirs(task_dir, exist_ok=True)
            path = os.path.join(task_dir, filename)

            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            with self._lock:
                reused = content_hash in self._content_hash_seen
                if not reused:
                    self._content_hash_seen[content_hash] = f"{task_id}/{filename}"

            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

            metadata = {
                "task_id": task_id,
                "agent": agent_name,
                "filename": filename,
                "path": f"{task_id}/{filename}",
                "size_bytes": len(content.encode("utf-8")),
                "content_hash": content_hash,
                "reused_content": reused,
                "created_at": time.time(),
            }
            with self._lock:
                self._index[f"{task_id}/{filename}"] = metadata

            logger.info(
                "Artifact saved",
                extra={"extra_fields": {"task_id": task_id, "agent": agent_name, "filename": filename}},
            )
            return {"success": True, **metadata}
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to save artifact")
            return {"success": False, "error": str(exc), "task_id": task_id, "filename": filename}

    def list_all(self) -> List[Dict[str, Any]]:
        with self._lock:
            return sorted(self._index.values(), key=lambda m: m["created_at"], reverse=True)

    def list_for_task(self, task_id: str) -> List[Dict[str, Any]]:
        with self._lock:
            return [m for m in self._index.values() if m["task_id"] == task_id]

    def get_content(self, task_id: str, filename: str) -> Optional[str]:
        path = os.path.join(self._root_dir(), task_id, filename)
        if not os.path.isfile(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def get_metadata(self, task_id: str, filename: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._index.get(f"{task_id}/{filename}")


artifact_service = ArtifactService()


def dict_to_markdown_sections(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Generically render an agent's structured JSON output into Markdown
    sections (heading + content), without any LLM call — pure Python, per
    the platform's token-optimization requirement to prefer tools over LLMs
    for mechanical formatting work.
    """
    sections: List[Dict[str, Any]] = []
    skip_keys = {"agent", "success", "method", "raw_text", "parse_error"}

    for key, value in data.items():
        if key in skip_keys:
            continue
        heading = key.replace("_", " ").title()
        content = _render_value(value)
        if content:
            sections.append({"heading": heading, "content": content})

    if not sections:
        sections.append({"heading": "Output", "content": "_No structured content was produced._"})
    return sections


def _render_value(value: Any, depth: int = 0) -> str:
    indent = "  " * depth
    if value is None:
        return ""
    if isinstance(value, (str, int, float, bool)):
        return str(value)
    if isinstance(value, list):
        lines = []
        for item in value:
            if isinstance(item, dict):
                summary = "; ".join(f"{k}: {_render_value(v)}" for k, v in item.items())
                lines.append(f"{indent}- {summary}")
            elif isinstance(item, list):
                lines.append(f"{indent}- {_render_value(item, depth + 1)}")
            else:
                lines.append(f"{indent}- {item}")
        return "\n".join(lines)
    if isinstance(value, dict):
        lines = [f"{indent}- **{k}**: {_render_value(v)}" for k, v in value.items()]
        return "\n".join(lines)
    return str(value)
