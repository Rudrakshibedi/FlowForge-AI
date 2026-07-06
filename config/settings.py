"""
Centralized application configuration.

All values are loaded from environment variables. Never hardcode secrets here.
See .env.example for the full list of supported variables.
"""
from __future__ import annotations
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import os
from functools import lru_cache
from typing import List

from pydantic import BaseModel


class Settings(BaseModel):
    # --- App ---
    app_name: str = "AI Agent Platform"
    app_env: str = os.getenv("APP_ENV", "development")
    debug: bool = os.getenv("DEBUG", "true").lower() == "true"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # --- API ---
    api_prefix: str = "/api"
    cors_origins: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # --- LLM Providers ---
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    llm_primary_provider: str = os.getenv("LLM_PRIMARY_PROVIDER", "gemini")
    llm_fallback_provider: str = os.getenv("LLM_FALLBACK_PROVIDER", "groq")

    # --- Token / cost controls ---
    max_tokens_per_agent_call: int = int(os.getenv("MAX_TOKENS_PER_AGENT_CALL", "1024"))
    max_total_tokens_per_request: int = int(os.getenv("MAX_TOTAL_TOKENS_PER_REQUEST", "8000"))
    enable_response_cache: bool = os.getenv("ENABLE_RESPONSE_CACHE", "true").lower() == "true"
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "600"))

    # --- Memory ---
    max_conversation_turns: int = int(os.getenv("MAX_CONVERSATION_TURNS", "20"))
    summarize_after_turns: int = int(os.getenv("SUMMARIZE_AFTER_TURNS", "8"))

    # --- MCP ---
    mcp_workspace_dir: str = os.getenv("MCP_WORKSPACE_DIR", "./workspace")

    # --- Artifacts ---
    artifacts_dir: str = os.getenv("ARTIFACTS_DIR", "./artifacts")

    # --- Observability ---
    log_buffer_size: int = int(os.getenv("LOG_BUFFER_SIZE", "2000"))

    class Config:
        frozen = True



@lru_cache
def get_settings() -> Settings:
    return Settings()
