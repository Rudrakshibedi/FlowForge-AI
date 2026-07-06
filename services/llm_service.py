"""LLM Service.

Single entry point every agent uses to talk to an LLM. Responsible for:
- Trying the primary provider (Gemini) then falling back to Groq on failure
- Response caching (identical agent + prompts within TTL)
- Token usage tracking per task
- Enforcing "one LLM call per agent" by being the sole call site

Agents never import gemini_provider / groq_provider directly.
"""
from __future__ import annotations

from backend.config.logging_config import get_logger
from backend.config.settings import get_settings
from backend.services.base_provider import LLMResponse
from backend.services.cache_service import cache_service
from backend.services.gemini_provider import GeminiProvider
from backend.services.groq_provider import GroqProvider
from backend.services.token_tracker import token_tracker

logger = get_logger(__name__)


class LLMService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._providers = {
            "gemini": GeminiProvider,
            "groq": GroqProvider,
        }

    def _ordered_providers(self):
        primary = self._settings.llm_primary_provider
        fallback = self._settings.llm_fallback_provider
        order = [p for p in (primary, fallback) if p in self._providers]
        return order or ["gemini", "groq"]

    def generate(
        self,
        agent_name: str,
        system_prompt: str,
        user_prompt: str,
        task_id: str = "default",
        max_tokens: int | None = None,
        use_cache: bool = True,
    ) -> LLMResponse:
        max_tokens = max_tokens or self._settings.max_tokens_per_agent_call

        cache_key = cache_service.make_key(agent_name, system_prompt, user_prompt)
        if use_cache and self._settings.enable_response_cache:
            cached = cache_service.get(cache_key)
            if cached is not None:
                logger.info("Cache hit", extra={"extra_fields": {"agent": agent_name}})
                return cached

        last_error: Exception | None = None
        for provider_name in self._ordered_providers():
            try:
                provider = self._providers[provider_name]()
                response = provider.generate(system_prompt, user_prompt, max_tokens)
                token_tracker.record(
                    task_id, agent_name, provider_name,
                    response["input_tokens"], response["output_tokens"],
                )
                if use_cache and self._settings.enable_response_cache:
                    cache_service.set(cache_key, response)
                return response
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    "Provider failed, trying next",
                    extra={"extra_fields": {"provider": provider_name, "error": str(exc)}},
                )
                last_error = exc
                continue

        raise RuntimeError(f"All LLM providers failed for agent '{agent_name}': {last_error}")


llm_service = LLMService()
