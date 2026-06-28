"""
LLM Provider: OpenAIProvider (Placeholder)
This project runs exclusively on Google Gemini.
OpenAI support is stubbed out here so the provider registry in LLMService
can import it without errors, but every method surfaces a clear
NotImplementedError with an actionable message.
"""

import logging
from ai_service.services.providers.base_provider import BaseProvider

logger = logging.getLogger("providers.openai")


class OpenAIProvider(BaseProvider):
    """
    Placeholder provider for OpenAI.

    Wanderwise AI currently uses Google Gemini as its sole LLM backend.
    This class satisfies the BaseProvider interface so the provider registry
    can load without errors, but all methods raise NotImplementedError to
    signal that OpenAI is not configured.

    To activate OpenAI in the future:
      1. Install `openai>=1.0` in requirements.txt
      2. Add OPENAI_API_KEY to your .env
      3. Replace the stubs below with the real AsyncOpenAI client calls
         following the same pattern as GeminiProvider.
    """

    async def generate(
        self,
        prompt: str,
        system_instruction: str | None = None,
        **kwargs,
    ) -> str:
        logger.error(
            "[OpenAIProvider] generate() called but OpenAI is not configured. "
            "Set LLM_PROVIDER=gemini in your .env to use the active backend."
        )
        raise NotImplementedError(
            "OpenAIProvider is not implemented in this deployment. "
            "Set LLM_PROVIDER=gemini to use Google Gemini."
        )

    def validate_response(self, response: str) -> bool:
        raise NotImplementedError(
            "OpenAIProvider.validate_response() is not implemented."
        )

    def estimate_tokens(self, text: str) -> int:
        raise NotImplementedError(
            "OpenAIProvider.estimate_tokens() is not implemented."
        )
