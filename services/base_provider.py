"""Abstract LLM provider interface. Gemini and Groq providers implement this."""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict


class LLMResponse(Dict[str, Any]):
    """Structured response shape returned by every provider.

    {
      "text": str,
      "provider": str,
      "model": str,
      "input_tokens": int,
      "output_tokens": int,
    }
    """


class BaseLLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    def generate(self, system_prompt: str, user_prompt: str, max_tokens: int) -> LLMResponse:
        ...
