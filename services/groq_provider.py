"""Groq provider (fallback LLM), used when Gemini fails or is rate-limited."""
from __future__ import annotations

from backend.config.logging_config import get_logger
from backend.config.settings import get_settings
from backend.services.base_provider import BaseLLMProvider, LLMResponse
from backend.services.token_tracker import estimate_tokens

logger = get_logger(__name__)


class GroqProvider(BaseLLMProvider):
    name = "groq"

    def __init__(self) -> None:
        self._settings = get_settings()

    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int) -> LLMResponse:
        if not self._settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not configured")

        from groq import Groq  # deferred import

        client = Groq(api_key=self._settings.groq_api_key)
        completion = client.chat.completions.create(
            model=self._settings.groq_model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        text = completion.choices[0].message.content or ""
        usage = getattr(completion, "usage", None)

        return LLMResponse(
            text=text,
            provider=self.name,
            model=self._settings.groq_model,
            input_tokens=getattr(usage, "prompt_tokens", None) or estimate_tokens(system_prompt + user_prompt),
            output_tokens=getattr(usage, "completion_tokens", None) or estimate_tokens(text),
        )
