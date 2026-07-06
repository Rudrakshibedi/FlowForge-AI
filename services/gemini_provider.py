"""Gemini Flash provider (primary LLM).

Uses the `google-generativeai` SDK. Import is deferred inside the method so
the rest of the app can still start up (and be unit-tested) even if the
package or API key isn't configured yet.
"""
from __future__ import annotations

from backend.config.logging_config import get_logger
from backend.config.settings import get_settings
from backend.services.base_provider import BaseLLMProvider, LLMResponse
from backend.services.token_tracker import estimate_tokens

logger = get_logger(__name__)


class GeminiProvider(BaseLLMProvider):
    name = "gemini"

    def __init__(self) -> None:
        self._settings = get_settings()

    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int) -> LLMResponse:
        if not self._settings.gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        import google.generativeai as genai  # deferred import

        genai.configure(api_key=self._settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=self._settings.gemini_model,
            system_instruction=system_prompt,
        )
        result = model.generate_content(
            user_prompt,
            generation_config={"max_output_tokens": max_tokens},
        )
        text = result.text if hasattr(result, "text") else str(result)

        return LLMResponse(
            text=text,
            provider=self.name,
            model=self._settings.gemini_model,
            input_tokens=estimate_tokens(system_prompt + user_prompt),
            output_tokens=estimate_tokens(text),
        )
